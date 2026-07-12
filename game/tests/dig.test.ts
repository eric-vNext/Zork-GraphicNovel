// Regression test for a reported bug: every phrasing of DIG at the beach
// ("dig sand", "dig in sand", "dig with shovel", "dig in the sand with the
// shovel") failed with a bogus "You can't see any ... here!" error. Root
// causes fixed in parser.ts:
//  1. A leading preposition before any direct-object tokens (e.g. the "in"
//     in "dig in sand", or "with" in "dig with shovel") was merged into the
//     noun phrase as a bogus adjective instead of being recognized as ZIL's
//     literal "DIG IN OBJECT" filler word or as a sign the direct object is
//     missing.
//  2. Answering an orphaned "What do you want to dig?" question with a
//     whole new command (rather than a bare noun) glued the new command
//     onto the old pending verb instead of being treated as a fresh
//     command, and orphan answers were appended at the end of the pending
//     raw string instead of spliced in after the verb.
import { describe, it, expect } from 'vitest';
import { Game } from '../src/engine/engine';
import { txt } from './testUtils';

function beachGame(): Game {
  const g = new Game();
  g.start();
  g.s.here = 'SANDY-CAVE';
  g.s.locs['LAMP'] = 'ADVENTURER';
  g.s.oflags['LAMP']['ONBIT'] = true;
  g.s.locs['SHOVEL'] = 'ADVENTURER';
  return g;
}

describe('DIG at the sandy cave', () => {
  it('"dig sand" digs the hole', () => {
    const g = beachGame();
    expect(txt(g, 'dig sand')).toBe('You seem to be digging a hole here.');
  });

  it('"dig in sand" digs the hole (ZIL filler "IN")', () => {
    const g = beachGame();
    expect(txt(g, 'dig in sand')).toBe('You seem to be digging a hole here.');
  });

  it('"dig in the sand with the shovel" digs the hole', () => {
    const g = beachGame();
    expect(txt(g, 'dig in the sand with the shovel')).toBe('You seem to be digging a hole here.');
  });

  it('"dig with shovel" asks for the missing object, then digs once answered', () => {
    const g = beachGame();
    expect(txt(g, 'dig with shovel')).toBe('What do you want to dig?');
    expect(txt(g, 'sand')).toBe('You seem to be digging a hole here.');
  });

  it('a fresh full command typed in reply to "What do you want to dig?" runs as a new command, not glued to dig', () => {
    const g = beachGame();
    expect(txt(g, 'dig')).toBe('What do you want to dig?');
    expect(txt(g, 'dig sand')).toBe('You seem to be digging a hole here.');
  });

  it('repeated digs progress through the BDIGS table', () => {
    const g = beachGame();
    expect(txt(g, 'dig sand')).toBe('You seem to be digging a hole here.');
    expect(txt(g, 'dig sand')).toBe("The hole is getting deeper, but that's about it.");
    expect(txt(g, 'dig sand')).toBe('You are surrounded by a wall of sand on all sides.');
  });
});
