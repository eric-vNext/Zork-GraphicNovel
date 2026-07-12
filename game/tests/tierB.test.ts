// Regression tests for docs/asset-plan-v2.md Tier B: new SFX wired into
// previously-silent (or parity-gap) story beats.
import { describe, it, expect } from 'vitest';
import { Game } from '../src/engine/engine';
import { txt, fightUntilWon } from './testUtils';

function sfxNames(evs: ReturnType<Game['execute']>): string[] {
  return evs.filter((e) => e.type === 'sfx').map((e: any) => e.name);
}

describe('Tier B sfx wiring', () => {
  it('glass-shatter: throwing the lamp', () => {
    const g = new Game();
    g.start();
    g.s.locs['LAMP'] = 'ADVENTURER';
    const evs = g.execute('throw lamp');
    expect(sfxNames(evs)).toContain('glass-shatter');
  });

  it('glass-shatter: breaking the bottle', () => {
    const g = new Game();
    g.start();
    g.s.locs['BOTTLE'] = 'ADVENTURER';
    const evs = g.execute('break bottle');
    expect(sfxNames(evs)).toContain('glass-shatter');
  });

  it('glass-shatter: breaking the mirror', () => {
    const g = new Game();
    g.start();
    g.s.here = 'MIRROR-ROOM-1';
    g.s.locs['LAMP'] = 'ADVENTURER'; g.s.oflags['LAMP']['ONBIT'] = true;
    const evs = g.execute('break mirror');
    expect(sfxNames(evs)).toContain('glass-shatter');
  });

  it('sand-collapse: fifth dig attempt', () => {
    const g = new Game();
    g.start();
    g.s.here = 'SANDY-CAVE';
    g.s.locs['LAMP'] = 'ADVENTURER'; g.s.oflags['LAMP']['ONBIT'] = true;
    g.s.locs['SHOVEL'] = 'ADVENTURER';
    g.s.counters.dug = 4; // next dig is the 5th
    const evs = g.execute('dig sand with shovel');
    expect(sfxNames(evs)).toContain('sand-collapse');
  });

  it('boat-puncture: entering the inflated boat with a sharp weapon', () => {
    const g = new Game();
    g.start();
    g.s.locs['INFLATABLE-BOAT'] = null; // remove the ambiguous deflated twin
    g.s.locs['INFLATED-BOAT'] = 'DAM-BASE';
    g.s.here = 'DAM-BASE';
    g.s.locs['SWORD'] = 'ADVENTURER';
    const evs = g.execute('enter boat');
    expect(sfxNames(evs)).toContain('boat-puncture');
  });

  it('corpse-vanish: killing the thief plays the vanish sfx (villainResult ran)', () => {
    // fightUntilWon doesn't return per-turn events, so this checks the
    // downstream flag it necessarily sets rather than catching the exact
    // winning turn's sfx array -- corpse-vanish is emitted unconditionally
    // in the same branch that sets THIEF-DEAD (melee.ts villainResult).
    const g = new Game();
    g.start();
    g.s.here = 'TREASURE-ROOM';
    g.s.locs['LAMP'] = 'ADVENTURER'; g.s.oflags['LAMP']['ONBIT'] = true;
    g.s.locs['KNIFE'] = 'ADVENTURER';
    g.s.locs['THIEF'] = 'TREASURE-ROOM';
    g.s.oflags['THIEF']['FIGHTBIT'] = true;
    delete g.s.oflags['THIEF']['INVISIBLE'];
    fightUntilWon(g, 'TREASURE-ROOM', 'THIEF-DEAD', 'attack thief with knife');
    expect(g.s.gflags['THIEF-DEAD']).toBe(true);
  });

  it('ghost-curse: disturbing the bones', () => {
    const g = new Game();
    g.start();
    g.s.here = 'MAZE-5';
    g.s.locs['LAMP'] = 'ADVENTURER'; g.s.oflags['LAMP']['ONBIT'] = true;
    const evs = g.execute('touch bones');
    expect(sfxNames(evs)).toContain('ghost-curse');
  });

  it('mirror-warp: touching the mirror', () => {
    const g = new Game();
    g.start();
    g.s.here = 'MIRROR-ROOM-1';
    g.s.locs['LAMP'] = 'ADVENTURER'; g.s.oflags['LAMP']['ONBIT'] = true;
    const evs = g.execute('touch mirror');
    expect(sfxNames(evs)).toContain('mirror-warp');
  });

  it('cyclops-yawn: drugging the cyclops', () => {
    const g = new Game();
    g.start();
    g.s.here = 'CYCLOPS-ROOM';
    g.s.locs['LAMP'] = 'ADVENTURER'; g.s.oflags['LAMP']['ONBIT'] = true;
    g.s.locs['BOTTLE'] = 'ADVENTURER'; g.s.oflags['BOTTLE']['OPENBIT'] = true;
    g.s.locs['WATER'] = 'BOTTLE';
    g.s.gflags['CYCLOPS-ATE'] = true;
    const evs = g.execute('give water to cyclops');
    expect(sfxNames(evs)).toContain('cyclops-yawn');
  });

  it('rug-drag: moving the rug', () => {
    const g = new Game();
    g.start();
    g.s.here = 'LIVING-ROOM';
    g.s.locs['LAMP'] = 'ADVENTURER'; g.s.oflags['LAMP']['ONBIT'] = true;
    const evs = g.execute('move rug');
    expect(sfxNames(evs)).toContain('rug-drag');
  });

  it('putty-seal: fixing the dam leak', () => {
    // PUTTY's synonyms are MATERIAL/GUNK, not literally "putty" -- and LEAK
    // starts INVISIBLE until the blue button reveals it (a real, separately
    // fixed bug: that fclear was missing entirely, see specials.ts).
    const g = new Game();
    g.start();
    g.s.here = 'MAINTENANCE-ROOM';
    g.s.locs['LAMP'] = 'ADVENTURER'; g.s.oflags['LAMP']['ONBIT'] = true;
    g.s.locs['PUTTY'] = 'ADVENTURER';
    g.s.oflags['LEAK'] = { ...g.s.oflags['LEAK'] };
    delete g.s.oflags['LEAK']['INVISIBLE'];
    g.s.daemons['I-MAINT-ROOM'] = { tick: -1, enabled: true };
    const evs = g.execute('put gunk in leak');
    expect(sfxNames(evs)).toContain('putty-seal');
  });

  it('the blue button reveals the leak (regression: it never used to)', () => {
    const g = new Game();
    g.start();
    g.s.here = 'MAINTENANCE-ROOM';
    g.s.locs['LAMP'] = 'ADVENTURER'; g.s.oflags['LAMP']['ONBIT'] = true;
    expect(g.s.oflags['LEAK']?.['INVISIBLE']).toBe(true);
    txt(g, 'push blue button');
    expect(g.s.oflags['LEAK']?.['INVISIBLE']).toBeUndefined();
  });

  it('dam-machinery: closing the sluice gates (parity with opening them)', () => {
    const g = new Game();
    g.start();
    g.s.here = 'DAM-ROOM';
    g.s.locs['LAMP'] = 'ADVENTURER'; g.s.oflags['LAMP']['ONBIT'] = true;
    g.s.locs['WRENCH'] = 'ADVENTURER';
    g.s.gflags['GATE-FLAG'] = true;
    g.s.gflags['LOW-TIDE'] = true; // gates currently open -> this closes them
    const evs = g.execute('turn bolt with wrench');
    expect(sfxNames(evs)).toContain('dam-machinery');
  });

  it('lamp-off: candle burnout parity with lamp burnout', () => {
    const g = new Game();
    g.start();
    g.s.locs['CANDLES'] = 'ADVENTURER';
    g.s.oflags['CANDLES']['ONBIT'] = true;
    g.s.oflags['CANDLES']['FLAMEBIT'] = true;
    g.s.locs['LAMP'] = 'ADVENTURER'; g.s.oflags['LAMP']['ONBIT'] = true; // stay lit so darkness isn't a confound
    g.s.daemons['I-CANDLES'] = { tick: -1, enabled: true };
    g.s.counters.candleIdx = 3; // past the last table entry -> next tick burns out
    const evs = g.execute('wait');
    expect(sfxNames(evs)).toContain('lamp-off');
  });
});
