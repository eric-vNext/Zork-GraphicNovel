// Differential text-fidelity harness.
//
// Runs the same command script through our engine and through the transcript
// the *original* compiled game produced (recorded by `scripts/oracle.mjs` from
// the `COMPILED/zorkN.z3` binaries the historicalsource releases ship), and
// reports every response that differs.
//
// This is the check the Zork I build never had: the ~30 verbatim text drifts
// found in the July 2026 audit by hand would all have shown up here.
//
// Two things it is *not*:
//
//  - Not a strict equality gate. The compiled binaries are not always the same
//    release as the vendored source (Zork I's is release 119, the ZIL is
//    release 88), the interpreter hard-wraps its output where we don't, and
//    some responses are legitimately random. The ZIL source is the authority;
//    this harness is the cross-check that tells you where to look.
//  - Not a substitute for the walkthrough tests. It compares text, not state.
//
// `KNOWN_DIFFS` records responses we have looked at and accepted, with the
// reason. Anything else that differs fails, so a new drift cannot creep in.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Game } from '../src/engine/engine';
import type { GameNumber } from '../src/engine/types';

const DIR = resolve(__dirname, 'transcripts');

interface Block { command: string | null; text: string }

function loadOracle(name: string): Block[] {
  const raw = readFileSync(resolve(DIR, `${name}.expected.txt`), 'utf8');
  const blocks: Block[] = [];
  let current: Block | null = null;
  for (const line of raw.split('\n')) {
    if (line === '>>>OPENING') {
      current = { command: null, text: '' };
      blocks.push(current);
    } else if (line.startsWith('>')) {
      current = { command: line.slice(1), text: '' };
      blocks.push(current);
    } else if (current) {
      current.text += `${line}\n`;
    }
  }
  return blocks;
}

function loadScript(name: string): { game: GameNumber; commands: string[] } {
  const raw = readFileSync(resolve(DIR, `${name}.txt`), 'utf8');
  const game = Number(name.match(/^zork([123])/)?.[1] ?? 1) as GameNumber;
  const commands = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  return { game, commands };
}

/**
 * Reduce a response to what we actually want to compare: the interpreter hard-
 * wraps at the terminal width and we don't, so collapse all whitespace; drop
 * the interpreter's `(Taken)` implicit-take notice and the banner's volatile
 * release/serial line.
 */
function normalize(text: string): string {
  return text
    .replace(/^Release \d+ \/ Serial number \d+$/gm, '')
    .replace(/Graphic Novel Edition — an open-source port of the historical source release\./g, '')
    .replace(/\(Taken\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Responses that differ from the original for a reason we have accepted.
 * Keyed by `<script>:<command>`; the value is why.
 */
const KNOWN_DIFFS: Record<string, string> = {
  'zork1-opening:>>>OPENING':
    'Release/serial differ: the compiled binary is release 119, the vendored ZIL is release 88.',
  'zork1-opening:read leaflet':
    'The release-119 binary rewords the leaflet; we follow the release-88 ZIL we port from.',
  'zork1-opening:n':
    'The troll gets his first blow on the arrival turn in the original. We hold combat '
    + 'for one beat so the room panel is not stolen by a same-turn daemon '
    + '(WorldState.justArrived); melee is random anyway, so this line is not comparable.',
};

function runOurs(game: GameNumber, commands: string[]): Block[] {
  const g = new Game(game);
  const opening = g.start()
    .filter((e) => e.type === 'text')
    .map((e: any) => e.text)
    .join('\n');
  const blocks: Block[] = [{ command: null, text: opening }];
  for (const cmd of commands) {
    const text = g
      .execute(cmd)
      .filter((e) => e.type === 'text')
      .map((e: any) => e.text)
      .join('\n');
    blocks.push({ command: cmd, text });
  }
  return blocks;
}

const SCRIPTS = ['zork1-opening', 'zork2-opening', 'zork3-opening'];

describe.each(SCRIPTS)('differential transcript: %s', (name) => {
  it('has an oracle recorded', () => {
    expect(existsSync(resolve(DIR, `${name}.expected.txt`))).toBe(true);
  });

  it('matches the original game text command for command', () => {
    const { game, commands } = loadScript(name);
    const oracle = loadOracle(name);
    const ours = runOurs(game, commands);

    expect(ours.length).toBe(oracle.length);

    const drifts: string[] = [];
    for (let i = 0; i < oracle.length; i++) {
      const cmd = oracle[i].command ?? '>>>OPENING';
      const key = `${name}:${cmd}`;
      const want = normalize(oracle[i].text);
      const got = normalize(ours[i].text);
      if (want === got) continue;
      if (key in KNOWN_DIFFS) continue;
      drifts.push(`\n  ${cmd}\n    original: ${want}\n    ours:     ${got}`);
    }
    expect(drifts.join(''), `${drifts.length} response(s) drift from the original`).toBe('');
  });
});
