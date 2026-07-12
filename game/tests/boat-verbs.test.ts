// Regression test for a reported bug: "get in the boat" answered with
// "What do you want to get?" instead of boarding it. Root cause in
// parse.ts: "get" canonicalizes to "take" (v('take', 'get', ...)) before
// any particle handling runs, so a "get in OBJECT" phrase fell through to
// the same "leading preposition means the direct object is missing" check
// that (correctly) handles "dig with shovel", wrongly asking for an object
// instead of matching ZIL's TAKE IN OBJECT (FIND VEHBIT) = V-BOARD syntax
// (gsyntax.zil:470). Also fixed the adjacent dead code at the same spot:
// "get out" checked `verb === 'get'`, but verb is always 'take' by then,
// so that branch could never fire.
import { describe, it, expect } from 'vitest';
import { Game } from '../src/engine/engine';
import { txt } from './testUtils';

describe('GET IN / GET OUT particle handling', () => {
  it('"get in the boat" boards it instead of asking "What do you want to get?"', () => {
    const g = new Game();
    g.start();
    g.s.here = 'SANDY-BEACH';
    g.s.locs['LAMP'] = 'ADVENTURER';
    g.s.oflags['LAMP']['ONBIT'] = true;
    g.s.locs['INFLATED-BOAT'] = 'SANDY-BEACH';
    expect(txt(g, 'get in the boat')).toBe('You are now in the magic boat.');
    expect(g.s.gflags['IN-BOAT']).toBe(true);
  });

  it('"get out" while not in the boat still resolves as leaving, not "What do you want to get?"', () => {
    const g = new Game();
    g.start();
    g.s.here = 'KITCHEN';
    g.s.locs['LAMP'] = 'ADVENTURER';
    g.s.oflags['LAMP']['ONBIT'] = true;
    expect(txt(g, 'get out')).not.toContain('What do you want to get');
  });

  it('a plain "get <item>" is unaffected', () => {
    const g = new Game();
    g.start();
    g.s.here = 'LIVING-ROOM';
    expect(txt(g, 'get the lamp')).toBe('Taken.');
  });
});
