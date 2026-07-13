// Regression test for a reported bug: candles left burning somewhere other
// than the player's hands (e.g. put down, or packed into the shaft basket
// along with the coal/screwdriver) would silently vanish from the game the
// instant their fuel ran out, instead of becoming a burnt-out husk like the
// lamp does. Root cause in daemons.ts's I-CANDLES daemon:
//  1. It called removeObj(s, 'CANDLES') on burnout, which has no basis in
//     the ZIL source — LIGHT-INT (1actions.zil:2328) only FCLEARs ONBIT and
//     FSETs RMUNGBIT, exactly like I-LANTERN already does for the lamp in
//     this port. The stray removeObj deleted the object outright, so a
//     later "take candles" failed with a bogus "You can't see any candles
//     here!" once the object no longer existed anywhere.
//  2. Its burnout/dimming messages were gated on inPlayer() only, whereas
//     I-LANTERN (and the ZIL original's <OR <HELD?> <IN? HERE>>) also
//     prints them when the light source is merely present in the room
//     (including nested in a container) — so a player who left the candles
//     burning nearby, not in their hands, got no warning at all before that
//     bogus disappearance.
import { describe, it, expect } from 'vitest';
import { Game } from '../src/engine/engine';
import { txt } from './testUtils';
import { roomLit } from '../src/engine/world';

describe('candle burnout', () => {
  it('candles burning in a basket in the room warn, go dark, but do not vanish', () => {
    const g = new Game();
    g.start();
    g.s.here = 'SHAFT-ROOM';
    g.s.locs['CANDLES'] = 'RAISED-BASKET';
    g.s.oflags['CANDLES']['ONBIT'] = true;
    g.s.oflags['CANDLES']['FLAMEBIT'] = true;
    g.s.counters.candleIdx = 2; // last interim stage; the next tick fully expires them
    g.s.daemons['I-CANDLES'] = { enabled: true, tick: 1 };
    g.s.locs['SCREWDRIVER'] = 'RAISED-BASKET';

    const t = txt(g, 'take screwdriver'); // any turn triggers the queued daemon tick
    expect(t).toContain("You'd better have more light than from the pair of candles.");
    expect(t).toContain('It is now pitch black.');
    expect(roomLit(g.s)).toBe(false);
    // the burnt-out candles are still a real object in the basket, not deleted
    expect(g.s.locs['CANDLES']).toBe('RAISED-BASKET');
    expect(g.s.oflags['CANDLES']['RMUNGBIT']).toBe(true);
    expect(g.s.oflags['CANDLES']['ONBIT']).toBeUndefined();

    expect(txt(g, 'take candles')).toBe('Taken.');
  });

  it('a burnt-out lamp likewise remains a takeable object, not deleted', () => {
    const g = new Game();
    g.start();
    g.s.here = 'LIVING-ROOM';
    g.s.locs['LAMP'] = 'LIVING-ROOM';
    g.s.oflags['LAMP']['ONBIT'] = true;
    g.s.counters.lampIdx = 2;
    g.s.daemons['I-LANTERN'] = { enabled: true, tick: 1 };
    txt(g, 'look');
    expect(g.s.locs['LAMP']).toBe('LIVING-ROOM');
    expect(g.s.oflags['LAMP']['RMUNGBIT']).toBe(true);
  });
});
