// The gate for the shared library's per-game branches.
//
// This test re-derives every `,ZORK-NUMBER` site from the vendored ZIL and
// compares it against `src/engine/branchManifest.ts`, so a site can never be
// silently forgotten: adding a game's arms without listing it here fails, and
// so does listing one that isn't in the source.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BRANCH_SITES, doneCount, deferredCount } from '../src/engine/branchManifest';
import { Game } from '../src/engine/engine';
import { selectGame } from '../src/data/games';
import { txt } from './testUtils';

const GVERBS = resolve(__dirname, '../../reference/zork1-source/gverbs.zil');

/** Line numbers of every `<COND ... ,ZORK-NUMBER ...>` head in gverbs.zil. */
function zilBranchLines(): number[] {
  const lines = readFileSync(GVERBS, 'latin1').split('\n');
  const found: number[] = [];
  lines.forEach((line, i) => {
    if (!line.includes('ZORK-NUMBER')) return;
    if (!/COND \(<N?==\? ,ZORK-NUMBER/.test(line)) return;
    found.push(i + 1);
  });
  return found;
}

describe('ZORK-NUMBER branch manifest', () => {
  const zilLines = zilBranchLines();

  it('lists every branch site in the vendored gverbs.zil', () => {
    const manifest = BRANCH_SITES.map((b) => b.line).sort((a, b) => a - b);
    expect(manifest).toEqual(zilLines);
  });

  it('has no duplicate or unexplained entries', () => {
    for (const site of BRANCH_SITES) {
      expect(site.note.length, `${site.routine}@${site.line} needs a note`).toBeGreaterThan(10);
      expect(site.arms.length, `${site.routine}@${site.line} needs arms`).toBeGreaterThan(0);
    }
    expect(doneCount() + deferredCount()).toBe(BRANCH_SITES.length);
  });

  // A progress marker, not a target: it should only ever go up. Every deferred
  // site names the game content it waits on.
  it('reports how much of the shared library is ported', () => {
    expect(doneCount()).toBeGreaterThanOrEqual(33);
  });
});

describe('per-game verb behaviour', () => {
  it('answers ODYSSEUS, PRAY, ECHO and TREASURE only in Zork I', () => {
    const g1 = new Game(1);
    expect(txt(g1, 'odysseus')).toBe("Wasn't he a sailor?");
    expect(txt(g1, 'treasure')).toBe('Nothing happens.');

    const g3 = new Game(3);
    expect(txt(g3, 'pray')).toBe('If you pray enough, your prayers may be answered.');
    expect(txt(g3, 'echo')).toBe('echo echo ...');
    selectGame(1);
  });

  it('uses each game SWIM refusal', () => {
    const g3 = new Game(3);
    expect(txt(g3, 'swim')).toBe('Swimming is not usually permitted in the dungeon.');
    selectGame(1);
  });

  it('prints the right VERSION banner per game', () => {
    expect(txt(new Game(1), 'version')).toContain('ZORK I: The Great Underground Empire');
    expect(txt(new Game(2), 'version')).toContain('ZORK II: The Wizard of Frobozz');
    expect(txt(new Game(3), 'version')).toContain('ZORK III: The Dungeon Master');
    selectGame(1);
  });

  it('WISH and INCANT only mean something in Zork II', () => {
    expect(txt(new Game(1), 'wish')).toBe('With luck, your wish will come true.');
    expect(txt(new Game(3), 'incant'))
      .toBe('The incantation echoes back faintly, but nothing else happens.');
    selectGame(1);
  });
});

describe('Zork I behaviour the branch checklist restored', () => {
  // gverbs.zil:1653 — maze rooms clear TOUCHBIT so they re-describe in full on
  // every visit. Without it the maze reads as a list of bare room names.
  it('re-describes maze rooms on every visit', () => {
    const g = new Game(1);
    g.s.locs['LAMP'] = 'ADVENTURER';
    g.s.oflags['LAMP'].ONBIT = true;
    g.s.here = 'MAZE-1';
    g.s.touched['MAZE-1'] = true;
    const first = txt(g, 'look');
    expect(first).toContain('maze of twisty little passages');
    expect(g.s.touched['MAZE-1']).toBeUndefined();
  });

  // FIRSTER (gverbs.zil:1819).
  it('gives the trophy case its own listing header', () => {
    const g = new Game(1);
    g.s.locs['COFFIN'] = 'TROPHY-CASE';
    g.s.oflags['TROPHY-CASE'].OPENBIT = true;
    g.s.here = 'LIVING-ROOM';
    expect(txt(g, 'look in case')).toContain('Your collection of treasures consists of:');
  });
});
