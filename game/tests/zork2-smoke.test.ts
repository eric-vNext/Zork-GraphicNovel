// A smoke walk over Zork II: visit every reachable room and exercise the
// common verbs, asserting nothing throws and no Zork I content leaks in.
//
// This is the empirical half of the sweep for Zork-I assumptions in shared
// code. Static greps find 266 references to Zork-I-only identifiers in the
// shared engine; most are unreachable under Zork II because they sit behind
// data that game does not have. This finds the ones that actually fire.
import { describe, it, expect } from 'vitest';
import { Game } from '../src/engine/engine';
import { selectGame } from '../src/data/games';
import { DATA } from '../src/engine/world';

const VERBS = ['look', 'inventory', 'take all', 'open door', 'read sign',
  'listen', 'smell', 'search', 'wait', 'diagnose', 'in', 'out', 'up', 'down'];

function reachable(): string[] {
  const rooms = DATA.rooms;
  const seen = new Set<string>(['INSIDE-BARROW']);
  const queue = ['INSIDE-BARROW'];
  while (queue.length) {
    const r = queue.shift()!;
    for (const ex of Object.values(rooms[r]?.exits ?? {})) {
      const to = (ex as any).to;
      if (to && rooms[to] && !seen.has(to)) { seen.add(to); queue.push(to); }
    }
  }
  return [...seen];
}

describe('Zork II smoke walk', () => {
  it('visits every reachable room and survives every common verb', () => {
    const g = new Game(2);
    const rooms = reachable();
    expect(rooms.length).toBeGreaterThan(60);

    const failures: string[] = [];
    for (const room of rooms) {
      for (const verb of VERBS) {
        g.s.here = room;
        g.s.dead = false;
        g.s.locs['LAMP'] = 'ADVENTURER';
        g.s.oflags['LAMP'] = { ...(g.s.oflags['LAMP'] ?? {}), ONBIT: true };
        try {
          g.execute(verb);
        } catch (e: any) {
          failures.push(`${room} / ${verb}: ${e.message}`);
        }
      }
    }
    expect(failures.slice(0, 20)).toEqual([]);
    selectGame(1);
  });

  it('never renders a room Zork II does not have', () => {
    const g = new Game(2);
    const z2 = new Set(Object.keys(DATA.rooms));
    const failures: string[] = [];
    for (const room of reachable()) {
      g.s.here = room;
      g.s.locs['LAMP'] = 'ADVENTURER';
      g.s.oflags['LAMP'] = { ...(g.s.oflags['LAMP'] ?? {}), ONBIT: true };
      for (const dir of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw', 'u', 'd', 'in', 'out']) {
        g.execute(dir);
        if (!z2.has(g.s.here)) { failures.push(`${room} ${dir} -> ${g.s.here}`); g.s.here = room; }
      }
    }
    expect(failures.slice(0, 10)).toEqual([]);
    selectGame(1);
  });
});

describe('the sweep for Zork I assumptions in shared code', () => {
  // 26 objects share a name between the games; five of those have Zork I
  // ACTION routines. Dispatch must be per game or Zork I's dam leak fires on
  // Zork II's leak.
  it('does not run Zork I ACTION routines on Zork II objects', async () => {
    const { OBJ_ACTIONS } = await import('../src/engine/specials');
    const { OBJ_ACTIONS: Z2 } = await import('../src/engine/zork2/specials');
    const w1 = (await import('../src/data/zork1/world.gen.json')).default as any;
    const w2 = (await import('../src/data/zork2/world.gen.json')).default as any;

    const sharedNames = Object.keys(w1.objects).filter((o) => o in w2.objects);
    const collide = sharedNames.filter((o) => o in OBJ_ACTIONS);
    expect(collide.length, 'this is the hazard the per-game dispatch exists for').toBeGreaterThan(0);

    // Under Zork II none of those Zork I handlers is reachable: the active
    // game's table is consulted instead. A shared name either has no Zork II
    // handler at all, or has Zork II's own — never Zork I's. (The lamp is the
    // live example: both games define one, and they are different routines.)
    selectGame(2);
    for (const o of collide) {
      if (Z2[o]) expect(Z2[o]).not.toBe(OBJ_ACTIONS[o]);
    }
    expect(Z2['LAMP'], "Zork II's own LANTERN should be wired").toBeTypeOf('function');
    selectGame(1);
  });

  it('each game keeps its own daemon set', () => {
    const g1 = new Game(1);
    const g2 = new Game(2);
    expect(Object.keys(g1.s.daemons)).toContain('I-THIEF');
    // 2dungeon.zil GO queues exactly two: the Wizard, and the lamp (disabled
    // until it is lit).
    expect(Object.keys(g2.s.daemons)).toEqual(['I-WIZARD', 'I-LANTERN']);
    expect(g2.s.daemons['I-LANTERN'].enabled, 'queued but not running').toBe(false);
    expect(Object.keys(g2.s.daemons)).not.toContain('I-THIEF');
    selectGame(1);
  });

  it('each game resurrects into its own world', async () => {
    const { activeGame } = await import('../src/data/games');
    for (const [n, room] of [[1, 'FOREST-1'], [2, 'DEAD-PALANTIR-1'], [3, 'ZORK2-STAIR']] as const) {
      selectGame(n as 1 | 2 | 3);
      const def = activeGame();
      expect(def.death.resurrectRoom).toBe(room);
      expect(def.world.rooms[def.death.resurrectRoom]).toBeDefined();
      expect(def.world.rooms[def.death.lampHome]).toBeDefined();
    }
    selectGame(1);
  });
});
