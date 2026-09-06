// The offline manifest has to describe every file the games actually ask for,
// or "downloaded for offline play" is a promise the app cannot keep.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ZORK1_PRESENTATION } from '../src/data/zork1/presentation';
import { ZORK2_PRESENTATION } from '../src/data/zork2/presentation';

const DIST = join(__dirname, '../dist');
const MANIFEST = join(DIST, 'assets.json');

interface Manifest {
  version: string;
  bytes: Record<string, number>;
  groups: Record<string, string[]>;
}

const built = existsSync(MANIFEST);
const manifest: Manifest | null = built ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : null;

// The manifest is a build artefact; skip rather than fail on a clean checkout.
const whenBuilt = built ? describe : describe.skip;

whenBuilt('the offline asset manifest', () => {
  const m = manifest!;
  const all = new Set(Object.values(m.groups).flat());

  it('lists every file under art/ and audio/ exactly once', () => {
    const onDisk: string[] = [];
    const walk = (dir: string, prefix: string) => {
      for (const e of readdirSync(join(DIST, dir), { withFileTypes: true })) {
        if (e.isDirectory()) walk(`${dir}/${e.name}`, prefix);
        else onDisk.push(`./${dir}/${e.name}`);
      }
    };
    walk('art', 'art');
    walk('audio', 'audio');

    const missing = onDisk.filter((f) => !all.has(f));
    expect(missing, 'every media file belongs to some group').toEqual([]);

    const counted = Object.values(m.groups).flat();
    expect(new Set(counted).size, 'and to exactly one').toBe(counted.length);
  });

  it('puts the app shell — bundles included — in the group that is always kept', () => {
    const shell = new Set(m.groups.shell);
    expect(shell.has('./index.html')).toBe(true);
    expect(shell.has('./assets.json')).toBe(true);
    // Without the hashed bundles the app loads offline and then goes blank,
    // so every built artefact has to be in the group that is always kept.
    const built = readdirSync(join(DIST, 'assets')).map((f) => `./assets/${f}`);
    expect(built.length, 'there is a bundle to cache').toBeGreaterThan(0);
    expect(built.filter((f) => !shell.has(f)), 'every bundle is in the shell').toEqual([]);
  });

  it('splits the games so one can be downloaded without the other', () => {
    expect(m.groups.zork1.length).toBeGreaterThan(150);
    expect(m.groups.zork2.length).toBeGreaterThan(150);
    expect(m.groups.zork1.every((f) => !f.split('/').pop()!.startsWith('z2-'))).toBe(true);
    expect(m.groups.zork2.every((f) => f.split('/').pop()!.startsWith('z2-'))).toBe(true);
    // Each game is a real download, and the shell is not.
    expect(m.bytes.zork1).toBeGreaterThan(10e6);
    expect(m.bytes.zork2).toBeGreaterThan(10e6);
    expect(m.bytes.shell).toBeLessThan(m.bytes.zork1);
  });

  // The point of the split: the panels each game's presentation layer names
  // have to be in that game's own group, or downloading Zork II would still
  // leave holes in it.
  it('covers the panels each game names, in its own group', () => {
    const panelsOf = (pres: { roomPres: Record<string, { art: string }>; eventPanels: Record<string, string> }) => [
      ...Object.values(pres.roomPres).map((p) => p.art),
      ...Object.values(pres.eventPanels),
    ];
    for (const [group, pres] of [
      ['zork1', ZORK1_PRESENTATION],
      ['zork2', ZORK2_PRESENTATION],
    ] as const) {
      const inGroup = new Set(m.groups[group]);
      const missing = panelsOf(pres as never)
        .map((key) => `./art/${key.includes('/') ? key : `rooms/${key}`}.webp`)
        .filter((f) => !inGroup.has(f));
      expect([...new Set(missing)], `${group} panels are in the ${group} download`).toEqual([]);
    }
  });

  it('is versioned by its contents, so a changed asset set invalidates caches', () => {
    expect(m.version).toMatch(/^v[a-z0-9]+-[a-z0-9]+$/);
    const total = Object.values(m.bytes).reduce((a, b) => a + b, 0);
    expect(total.toString(36)).toBe(m.version.split('-')[1]);
  });

  it('names files that are actually there', () => {
    const sample = [...all].filter((f) => f !== './').slice(0, 40);
    const absent = sample.filter((f) => !existsSync(join(DIST, f.replace(/^\.\//, ''))));
    expect(absent).toEqual([]);
    expect(statSync(join(DIST, 'assets.json')).size).toBeGreaterThan(0);
  });
});
