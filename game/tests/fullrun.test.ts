// The big one: a complete 350-point playthrough.
// Navigation uses BFS over the actual exit data, so the test exercises the
// real room graph rather than a hand-copied route.
import { describe, it, expect } from 'vitest';
import { Game } from '../src/engine/engine';
import { DATA, inventory, fset$, inPlayer } from '../src/engine/world';

const DIR_CMD: Record<string, string> = {
  NORTH: 'n', SOUTH: 's', EAST: 'e', WEST: 'w', NE: 'ne', NW: 'nw', SE: 'se', SW: 'sw',
  UP: 'up', DOWN: 'down', IN: 'in', OUT: 'out', LAND: 'land',
};

function go(g: Game, cmds: string[]): string {
  let t = '';
  for (const c of cmds) {
    const evs = g.execute(c);
    t += evs.filter((e) => e.type === 'text').map((e: any) => e.text).join('\n') + '\n';
    if (g.s.dead || t.includes('You have died')) {
      throw new Error(`DIED during "${c}":\n${t.slice(-700)}`);
    }
  }
  return t;
}

/** BFS a route using exits whose conditions are currently satisfied, then walk it. */
function walkTo(g: Game, target: string): void {
  const s = g.s;
  const passable = (ex: any): boolean => {
    if (ex.msg && !ex.to) return false;
    if (ex.per) {
      if (ex.per === 'TRAP-DOOR-EXIT') return fset$(s, 'TRAP-DOOR', 'OPENBIT') && !fset$(s, 'TRAP-DOOR', 'INVISIBLE');
      return false;
    }
    if (ex.ifFlag === 'EMPTY-HANDED') return inventory(s).length === 0;
    if (ex.ifFlag === 'COFFIN-CURE') return !inPlayer(s, 'COFFIN');
    if (ex.ifFlag) return !!g.s.gflags[ex.ifFlag];
    if (ex.ifDoor) return fset$(s, ex.ifDoor, 'OPENBIT');
    return !!ex.to;
  };
  const dest = (ex: any): string | null => (ex.per === 'TRAP-DOOR-EXIT' ? 'CELLAR' : ex.to ?? null);

  const prev = new Map<string, [string, string]>(); // room -> [from, dirCmd]
  const q = [g.s.here];
  const seen = new Set([g.s.here]);
  while (q.length) {
    const cur = q.shift()!;
    if (cur === target) break;
    for (const [dir, ex] of Object.entries(DATA.rooms[cur]?.exits ?? {})) {
      if (!DIR_CMD[dir] || !passable(ex)) continue;
      const to = dest(ex as any);
      if (!to || seen.has(to)) continue;
      seen.add(to);
      prev.set(to, [cur, DIR_CMD[dir]]);
      q.push(to);
    }
  }
  if (!seen.has(target)) throw new Error(`no route ${g.s.here} -> ${target}`);
  const route: string[] = [];
  let cur = target;
  while (cur !== g.s.here) {
    const [from, cmd] = prev.get(cur)!;
    route.unshift(cmd);
    cur = from;
  }
  for (const step of route) {
    const before = g.s.here;
    go(g, [step]);
    if (g.s.here === before) throw new Error(`walkTo stuck at ${before} going ${step} toward ${target}`);
  }
  expect(g.s.here).toBe(target);
}

import { Out } from '../src/engine/world';

/** Fight like a 1980s player: save OUTSIDE the lair, restore on death or bad wounds. */
function engage(g: Game, flag: string, enterCmds: string[], atkCmd: string, guard = 60) {
  const snap = g.exportSave();
  for (let attempt = 0; attempt < guard && !g.s.gflags[flag]; attempt++) {
    for (const c of enterCmds) g.execute(c);
    const fightRoom = g.s.here;
    for (let i = 0; i < 40 && !g.s.gflags[flag]; i++) {
      g.execute(atkCmd);
      if (g.s.dead || g.s.here !== fightRoom || g.s.counters.wounds > 1) break;
    }
    if (!g.s.gflags[flag] || g.s.counters.wounds > 1 || g.s.dead) {
      g.importSave(snap, new Out());
    }
  }
  expect(g.s.gflags[flag], `${flag} after ${guard} attempts`).toBe(true);
}

describe('Full 350-point playthrough', () => {
  it('completes the game: all treasures, map, barrow', () => {
    const g = new Game();
    g.start();

    // --- Egg, house, tools ---
    walkTo(g, 'UP-A-TREE');
    go(g, ['take egg']);
    walkTo(g, 'EAST-OF-HOUSE');
    go(g, ['open window']);
    walkTo(g, 'KITCHEN');
    go(g, ['open bag', 'take garlic']);
    walkTo(g, 'LIVING-ROOM');
    go(g, ['take lamp', 'take sword', 'turn on lamp', 'move rug', 'open trap door', 'open case']);
    walkTo(g, 'ATTIC'); // dark without the lamp — the grue is canon
    go(g, ['take rope', 'take knife']);
    walkTo(g, 'LIVING-ROOM');
    go(g, ['drop rope', 'down']); // the rope waits here for the temple trip
    expect(g.s.here).toBe('CELLAR');

    // --- Troll ---
    walkTo(g, 'CELLAR');
    engage(g, 'TROLL-DEAD', ['n'], 'attack troll with sword');
    expect(g.s.here).toBe('TROLL-ROOM');

    // --- Maze loot, cyclops, thief ---
    go(g, ['w', 's', 'e', 'up']); // the maze defeats BFS on purpose; canonical route
    expect(g.s.here).toBe('MAZE-5');
    go(g, ['take coins', 'take key', 'sw', 'e', 's', 'se']);
    expect(g.s.here).toBe('CYCLOPS-ROOM');
    go(g, ['odysseus']);
    engage(g, 'THIEF-DEAD', ['up', 'give egg to thief'], 'attack thief with knife');
    expect(g.s.here).toBe('TREASURE-ROOM');
    go(g, ['take chalice', 'take egg', 'take coins', 'down', 'e', 'e']);
    expect(g.s.here).toBe('LIVING-ROOM');
    go(g, ['turn off lamp']); // fuel discipline, like any veteran

    // --- Canary & bauble (travel light: heavy loot goes in the case first) ---
    go(g, ['turn off lamp', 'drop sword', 'drop knife', 'drop garlic', 'take canary', 'put egg in case', 'put chalice in case', 'put coins in case', 'drop key']);
    walkTo(g, 'PATH');
    go(g, ['wind canary', 'take bauble']);
    walkTo(g, 'LIVING-ROOM');
    go(g, ['put canary in case', 'put bauble in case']);

    // --- Painting ---
    go(g, ['turn on lamp', 'open trap door', 'down']);
    walkTo(g, 'GALLERY');
    go(g, ['take painting']);
    walkTo(g, 'STUDIO');
    go(g, ['up']); // chimney: lamp + painting only
    expect(g.s.here).toBe('KITCHEN');
    go(g, ['turn off lamp']);
    walkTo(g, 'LIVING-ROOM');
    go(g, ['put painting in case']);

    // --- Dam: bar, matches, tools, drain ---
    go(g, ['take rope', 'turn on lamp', 'open trap door', 'down']);
    walkTo(g, 'LOUD-ROOM');
    go(g, ['echo', 'take bar']);
    walkTo(g, 'MAINTENANCE-ROOM');
    go(g, ['take wrench', 'take screwdriver', 'push yellow button']);
    walkTo(g, 'DAM-ROOM');
    go(g, ['turn bolt with wrench', 'drop wrench',
      'wait', 'wait', 'wait', 'wait', 'wait', 'wait', 'wait', 'wait', 'wait']);
    expect(g.s.gflags['LOW-TIDE'], 'reservoir drained').toBe(true);
    walkTo(g, 'DAM-LOBBY');
    go(g, ['take matches']);

    // --- Temple leg A: torch, exorcism, skull ---
    walkTo(g, 'DOME-ROOM');
    go(g, ['tie rope to railing', 'down']);
    expect(g.s.here).toBe('TORCH-ROOM');
    go(g, ['take torch', 'turn off lamp']);
    walkTo(g, 'NORTH-TEMPLE');
    go(g, ['take bell']);
    walkTo(g, 'SOUTH-TEMPLE');
    go(g, ['take book', 'take candles', 'down', 'down']);
    expect(g.s.here).toBe('ENTRANCE-TO-HADES');
    go(g, ['ring bell', 'light match', 'light candles with match', 'read book']);
    expect(g.s.gflags['LLD-FLAG'], 'spirits banished').toBe(true);
    go(g, ['drop book', 'drop candles', 's', 'take skull']);
    walkTo(g, 'SOUTH-TEMPLE');
    go(g, ['pray']);
    expect(g.s.here).toBe('FOREST-1');
    walkTo(g, 'LIVING-ROOM');
    go(g, ['put skull in case', 'put bar in case']);

    // --- Temple leg B: the gold coffin ---
    go(g, ['turn on lamp', 'open trap door', 'down']);
    walkTo(g, 'EGYPT-ROOM');
    go(g, ['turn off lamp']); // the torch lights the way
    go(g, ['open coffin', 'take sceptre', 'take coffin']);
    walkTo(g, 'SOUTH-TEMPLE');
    go(g, ['pray']);
    expect(g.s.here).toBe('FOREST-1');
    walkTo(g, 'LIVING-ROOM');
    go(g, ['put coffin in case']);

    // --- Rainbow: sceptre & pot of gold ---
    walkTo(g, 'END-OF-RAINBOW');
    go(g, ['wave sceptre', 'take pot']);
    walkTo(g, 'LIVING-ROOM');
    go(g, ['put sceptre in case', 'put pot in case']);

    // --- Coal mine (torch into the basket before the gas room) ---
    go(g, ['take garlic', 'turn on lamp', 'open trap door', 'down']);
    walkTo(g, 'BAT-ROOM');
    go(g, ['take jade']);
    walkTo(g, 'SHAFT-ROOM');
    go(g, ['put torch in basket', 'put screwdriver in basket']);
    walkTo(g, 'GAS-ROOM');
    go(g, ['take bracelet']);
    walkTo(g, 'DEAD-END-5');
    go(g, ['take coal']);
    walkTo(g, 'SHAFT-ROOM');
    go(g, ['put coal in basket', 'lower basket']);
    walkTo(g, 'TIMBER-ROOM');
    const held = [...inventory(g.s)];
    go(g, held.map((o) => `drop ${DATA.objects[o].synonyms[0].toLowerCase()}`));
    expect(inventory(g.s).length).toBe(0);
    go(g, ['w']);
    expect(g.s.here).toBe('LOWER-SHAFT');
    go(g, ['take torch', 'take coal', 'take screwdriver', 's']);
    expect(g.s.here).toBe('MACHINE-ROOM');
    go(g, ['open lid', 'put coal in machine', 'close lid', 'turn switch with screwdriver', 'open lid', 'take diamond', 'n']);
    expect(inPlayer(g.s, 'DIAMOND')).toBe(true);
    go(g, ['put diamond in basket', 'put torch in basket', 'drop screwdriver', 'e']);
    expect(g.s.here).toBe('TIMBER-ROOM');
    go(g, ['take lamp', 'take garlic', 'take jade', 'take bracelet', 'take matches']);
    walkTo(g, 'SHAFT-ROOM');
    go(g, ['raise basket', 'take diamond', 'take torch']);
    expect(inPlayer(g.s, 'DIAMOND')).toBe(true);
    expect(inPlayer(g.s, 'TORCH')).toBe(true);

    // --- Slide home, deposit the mine haul (torch included, its job is done) ---
    walkTo(g, 'SLIDE-ROOM');
    go(g, ['down']);
    expect(g.s.here).toBe('CELLAR');
    go(g, ['up']);
    expect(g.s.here).toBe('LIVING-ROOM');
    go(g, ['put diamond in case', 'put jade in case', 'put bracelet in case', 'put torch in case']);

    // --- Reservoir & Atlantis: trunk, pump, trident ---
    go(g, ['turn on lamp', 'open trap door', 'down']);
    walkTo(g, 'RESERVOIR');
    go(g, ['take trunk']);
    walkTo(g, 'RESERVOIR-NORTH');
    go(g, ['take pump']);
    walkTo(g, 'ATLANTIS-ROOM');
    go(g, ['take trident']);
    walkTo(g, 'LIVING-ROOM');
    go(g, ['put trunk in case', 'put trident in case']);

    // --- River: buoy emerald + scarab ---
    go(g, ['open trap door', 'down']);
    walkTo(g, 'DAM-BASE');
    go(g, ['inflate boat with pump', 'drop pump', 'enter boat', 'launch']);
    expect(g.s.here.startsWith('RIVER')).toBe(true);
    for (let i = 0; i < 20 && g.s.here !== 'RIVER-4' && !g.s.dead; i++) go(g, ['wait']);
    expect(g.s.here).toBe('RIVER-4');
    go(g, ['take buoy', 'east']);
    expect(g.s.here).toBe('SANDY-BEACH');
    go(g, ['open buoy', 'take emerald', 'take shovel']);
    walkTo(g, 'SANDY-CAVE');
    go(g, ['dig sand with shovel', 'dig sand with shovel', 'dig sand with shovel', 'dig sand with shovel']);
    go(g, ['take scarab', 'drop shovel']);
    expect(inPlayer(g.s, 'SCARAB')).toBe(true);

    // --- Over the falls' rainbow, home ---
    walkTo(g, 'ARAGAIN-FALLS');
    go(g, ['cross rainbow']);
    expect(g.s.here).toBe('ON-RAINBOW');
    go(g, ['w']);
    expect(g.s.here).toBe('END-OF-RAINBOW');
    walkTo(g, 'LIVING-ROOM');
    go(g, ['put emerald in case', 'put scarab in case']);

    // --- Endgame ---
    expect(g.s.gflags['MAP-GIVEN'], 'map appears when all treasures are home').toBe(true);
    go(g, ['take map']);
    walkTo(g, 'WEST-OF-HOUSE');
    go(g, ['sw']);
    expect(g.s.here).toBe('STONE-BARROW');
    go(g, ['w']);
    expect(g.s.won, 'victory!').toBe(true);
    expect(g.s.counters.score, 'a perfect game').toBe(350);
  }, 240000);
});
