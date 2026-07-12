// Regression tests for docs/asset-plan-v2.md Tier A: wiring existing,
// previously-unused art/sfx assets into the code paths they belong to.
import { describe, it, expect } from 'vitest';
import { Game } from '../src/engine/engine';

describe('Tier A asset wiring', () => {
  it('EGG open emits the events/egg-opened panel', () => {
    const g = new Game();
    g.start();
    g.s.locs['EGG'] = 'ADVENTURER';
    g.s.locs['SWORD'] = 'ADVENTURER';
    const evs = g.execute('open egg with sword');
    expect(evs.some((e) => e.type === 'panel' && (e as any).key === 'events/egg-opened')).toBe(true);
  });

  it('sword glowing brightly emits the events/sword-glow panel', () => {
    const g = new Game();
    g.start();
    g.s.here = 'TROLL-ROOM';
    g.s.locs['LAMP'] = 'ADVENTURER'; g.s.oflags['LAMP']['ONBIT'] = true;
    g.s.locs['SWORD'] = 'ADVENTURER';
    g.s.daemons['I-FIGHT'].enabled = false; // isolate from the troll's own probabilistic attack
    const evs = g.execute('wait');
    expect(evs.some((e) => e.type === 'panel' && (e as any).key === 'events/sword-glow')).toBe(true);
  });

  it('gas explosion emits the explosion sfx alongside its panel', () => {
    const g = new Game();
    g.start();
    g.s.here = 'GAS-ROOM';
    g.s.locs['LAMP'] = 'ADVENTURER'; g.s.oflags['LAMP']['ONBIT'] = true;
    g.s.locs['MATCH'] = 'ADVENTURER';
    const evs = g.execute('light match');
    expect(evs.some((e) => e.type === 'sfx' && (e as any).name === 'explosion')).toBe(true);
    expect(evs.some((e) => e.type === 'panel' && (e as any).key === 'events/gas-explosion')).toBe(true);
  });
});
