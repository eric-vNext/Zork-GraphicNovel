// Regression tests for docs/asset-plan-v2.md Tier C: new event-panel
// illustrations wired into their story beats.
import { describe, it, expect } from 'vitest';
import { Game } from '../src/engine/engine';
import { fightUntilWon } from './testUtils';

function panelKeys(evs: ReturnType<Game['execute']>): string[] {
  return evs.filter((e) => e.type === 'panel').map((e: any) => e.key);
}

describe('Tier C event-panel wiring', () => {
  it('events/cyclops-sleeps: drugging the cyclops', () => {
    const g = new Game();
    g.start();
    g.s.here = 'CYCLOPS-ROOM';
    g.s.locs['LAMP'] = 'ADVENTURER'; g.s.oflags['LAMP']['ONBIT'] = true;
    g.s.locs['BOTTLE'] = 'ADVENTURER'; g.s.oflags['BOTTLE']['OPENBIT'] = true;
    g.s.locs['WATER'] = 'BOTTLE';
    g.s.gflags['CYCLOPS-ATE'] = true;
    const evs = g.execute('give water to cyclops');
    expect(panelKeys(evs)).toContain('events/cyclops-sleeps');
  });

  it('events/ghost-curse: disturbing the bones', () => {
    const g = new Game();
    g.start();
    g.s.here = 'MAZE-5';
    g.s.locs['LAMP'] = 'ADVENTURER'; g.s.oflags['LAMP']['ONBIT'] = true;
    const evs = g.execute('touch bones');
    expect(panelKeys(evs)).toContain('events/ghost-curse');
  });

  it('events/mirror-warp: touching the mirror wins the turn despite the room transition', () => {
    const g = new Game();
    g.start();
    g.s.here = 'MIRROR-ROOM-1';
    g.s.locs['LAMP'] = 'ADVENTURER'; g.s.oflags['LAMP']['ONBIT'] = true;
    const evs = g.execute('touch mirror');
    const panels = panelKeys(evs);
    expect(panels.at(-1)).toBe('events/mirror-warp'); // must be LAST -> wins per "last panel wins"
    expect(g.s.here).toBe('MIRROR-ROOM-2');
  });

  it('events/lamp-smashed: throwing the lamp', () => {
    const g = new Game();
    g.start();
    g.s.locs['LAMP'] = 'ADVENTURER';
    const evs = g.execute('throw lamp');
    expect(panelKeys(evs)).toContain('events/lamp-smashed');
  });

  it('events/villain-vanish: killing the thief (not the troll)', () => {
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

  it('events/canary-song: winding the canary in the forest', () => {
    const g = new Game();
    g.start();
    g.s.here = 'FOREST-1';
    g.s.locs['CANARY'] = 'ADVENTURER';
    const evs = g.execute('wind canary');
    expect(panelKeys(evs)).toContain('events/canary-song');
  });

  it('events/thief-gift: peacefully giving the thief an item', () => {
    const g = new Game();
    g.start();
    g.s.here = 'ROUND-ROOM'; // an ordinary underground room, not TREASURE-ROOM
    g.s.locs['LAMP'] = 'ADVENTURER'; g.s.oflags['LAMP']['ONBIT'] = true;
    g.s.locs['GARLIC'] = 'ADVENTURER';
    g.s.locs['THIEF'] = 'ROUND-ROOM';
    fclearInvisible(g, 'THIEF');
    const evs = g.execute('give garlic to thief');
    expect(panelKeys(evs)).toContain('events/thief-gift');
  });
});

function fclearInvisible(g: Game, obj: string) {
  delete g.s.oflags[obj]['INVISIBLE'];
}
