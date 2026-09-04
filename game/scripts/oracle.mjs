#!/usr/bin/env node
// Transcript oracle: run a command script through the *original* compiled game
// and record what it prints, so `tests/differential.test.ts` can diff our
// engine's output against it line for line.
//
// The historicalsource releases ship `COMPILED/zorkN.z3` alongside the ZIL, so
// the authoritative text is right there in the repo. We drive it with ifvms
// (the Z-machine used by Parchment) rather than reimplementing one.
//
//   node scripts/oracle.mjs                 # regenerate every .expected.txt
//   node scripts/oracle.mjs zork1-opening   # just one script
//
// Scripts live in tests/transcripts/<name>.txt, one command per line; `#`
// starts a comment. Output goes to tests/transcripts/<name>.expected.txt as
// one `>command` / response block per command.
//
// Caveat worth knowing when a diff looks wrong: the compiled binaries are not
// always the same release as the vendored source. Zork I's COMPILED/zork1.z3
// is release 119 (serial 880429) while the ZIL we port from is the release-88
// source, so a handful of strings legitimately differ between them. The ZIL is
// the authority; the oracle is the cross-check.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const GAME = resolve(HERE, '..');
const ROOT = resolve(GAME, '..');
const SCRIPTS = join(GAME, 'tests/transcripts');
const ZVM = join(GAME, 'node_modules/ifvms/bin/zvm.js');

const STORY = {
  1: join(ROOT, 'reference/zork1-source/COMPILED/zork1.z3'),
  2: join(ROOT, 'reference/zork2-source/COMPILED/zork2.z3'),
  3: join(ROOT, 'reference/zork3-source/COMPILED/zork3.z3'),
};

/** Read a command script: one command per line, `#` comments, blanks dropped. */
export function readScript(name) {
  const raw = readFileSync(join(SCRIPTS, `${name}.txt`), 'utf8');
  const lines = raw.split('\n').map((l) => l.trim());
  const game = Number(name.match(/^zork([123])/)?.[1] ?? 1);
  return { game, commands: lines.filter((l) => l && !l.startsWith('#')) };
}

/**
 * Split a raw Z-machine transcript into `{ command, text }` blocks.
 * The interpreter echoes each command after its `>` prompt, so the prompt is
 * the block separator.
 */
function splitTranscript(raw, commands) {
  const parts = raw.split('\n>');
  // parts[0] is the banner plus the opening room description.
  const blocks = [{ command: null, text: parts[0] }];
  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i];
    const nl = chunk.indexOf('\n');
    const echoed = (nl === -1 ? chunk : chunk.slice(0, nl)).trim();
    const body = nl === -1 ? '' : chunk.slice(nl + 1);
    blocks.push({ command: echoed || commands[i - 1] || '', text: body });
  }
  return blocks;
}

function run(name) {
  const { game, commands } = readScript(name);
  const story = STORY[game];
  // A trailing QUIT/Y makes the interpreter exit cleanly instead of hanging on
  // a read it will never get.
  const input = `${commands.join('\n')}\nquit\ny\n`;
  const raw = execFileSync('node', [ZVM, story], {
    input,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });

  // Drop the trailing QUIT/Y blocks we appended to make the interpreter exit.
  const blocks = splitTranscript(raw, commands).slice(0, commands.length + 1);
  const out = [];
  for (const { command, text } of blocks) {
    out.push(command === null ? '>>>OPENING' : `>${command}`);
    out.push(text.replace(/\s+$/, ''));
    out.push('');
  }
  const dest = join(SCRIPTS, `${name}.expected.txt`);
  writeFileSync(dest, out.join('\n'));
  console.log(`${name}: ${commands.length} commands -> ${dest}`);
}

const names = process.argv.slice(2);
const all = names.length
  ? names
  : readdirSync(SCRIPTS)
      .filter((f) => f.endsWith('.txt') && !f.endsWith('.expected.txt'))
      .map((f) => f.replace(/\.txt$/, ''));
for (const n of all) run(n);
