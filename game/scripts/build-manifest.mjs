#!/usr/bin/env node
// Build the offline asset manifest the service worker caches from.
//
// The art and audio are ~80 MB across the trilogy and each game's share is
// self-contained, so they are grouped per game rather than shipped as one
// blob: a player who only wants Zork I offline should not be made to
// download Zork II's volcano. Grouping is by filename prefix, which is the
// convention the asset pipeline already uses (`z2-…`, `z3-…`), with the
// unprefixed interface art treated as shared shell.
//
// It runs over the *built* output rather than public/, because the app shell
// includes the hashed JS and CSS bundles that only exist after a build — and
// a shell manifest that misses those is a manifest that leaves the app blank
// when it is offline.
//
//   npm run build                          # runs this as its last step
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(HERE, '../dist');

/** Media lives in these trees; everything else in public/ is shell. */
const MEDIA_DIRS = ['art', 'audio'];

/**
 * The app shell: everything needed to open the game at all, whatever you then
 * play. `assets/` is Vite's hashed bundle output, so it belongs here rather
 * than to any one game.
 */
const SHELL_DIRS = ['assets'];
const SHELL_FILES = [
  './', './index.html', './manifest.webmanifest', './assets.json',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png',
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

/**
 * Which group a media file belongs to. `z2-`/`z3-` name a game; the rest of
 * the interface art is shared, and everything else is Zork I's.
 */
function groupFor(rel) {
  const name = rel.split('/').pop() ?? '';
  const m = /^z([23])-/.exec(name);
  if (m) return `zork${m[1]}`;
  if (rel.startsWith('art/ui/')) return 'shell';
  return 'zork1';
}

const groups = { shell: [], zork1: [], zork2: [], zork3: [] };
const bytes = { shell: 0, zork1: 0, zork2: 0, zork3: 0 };

for (const dir of [...MEDIA_DIRS, ...SHELL_DIRS]) {
  const root = join(DIST, dir);
  for (const full of walk(root)) {
    const rel = relative(DIST, full).split('\\').join('/');
    const group = SHELL_DIRS.includes(dir) ? 'shell' : groupFor(rel);
    groups[group].push(`./${rel}`);
    bytes[group] += statSync(full).size;
  }
}

for (const f of SHELL_FILES) {
  if (groups.shell.includes(f)) continue;
  groups.shell.push(f);
  const local = join(DIST, f.replace(/^\.\//, ''));
  try { bytes.shell += statSync(local).size; } catch { /* './' has no file */ }
}
for (const g of Object.keys(groups)) groups[g].sort();

// The version is derived from the content list, so a changed asset set
// invalidates the caches without anyone having to remember to bump a number.
const version = `v${Object.values(groups).flat().join('|').length.toString(36)}-${
  Object.values(bytes).reduce((a, b) => a + b, 0).toString(36)}`;

const manifest = { version, bytes, groups };
writeFileSync(join(DIST, 'assets.json'), `${JSON.stringify(manifest, null, 1)}\n`);

const mb = (n) => `${(n / 1e6).toFixed(1)} MB`;
console.log(`assets.json ${version}`);
for (const g of Object.keys(groups)) {
  if (groups[g].length) console.log(`  ${g.padEnd(6)} ${String(groups[g].length).padStart(4)} files  ${mb(bytes[g])}`);
}
