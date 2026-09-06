// The big one for Zork II: a complete 400-point playthrough.
// Navigation is BFS over the real exit data, so the route is discovered rather
// than hand-copied; the puzzles are typed out the way a player would.
import { describe, it, expect } from 'vitest';
import { Game } from '../src/engine/engine';
import { selectGame } from '../src/data/games';
import { DATA, fset$ } from '../src/engine/world';

const DIR_CMD: Record<string, string> = {
  NORTH: 'n', SOUTH: 's', EAST: 'e', WEST: 'w', NE: 'ne', NW: 'nw', SE: 'se', SW: 'sw',
  UP: 'up', DOWN: 'down', IN: 'in', OUT: 'out', LAND: 'land', CROSS: 'cross',
};

function go(g: Game, cmds: string[]): string {
  let t = '';
  for (const c of cmds) {
    const evs = g.execute(c);
    t += evs.filter((e) => e.type === 'text').map((e: any) => e.text).join('\n') + '\n';
    if (g.s.dead || t.includes('You have died')) {
      throw new Error(`DIED during "${c}" in ${g.s.here}:\n${t.slice(-600)}`);
    }
  }
  return t;
}

/** Rooms the walker must never route through: they scramble or eat you. */
const NO_GO = new Set([
  'DIAMOND-1', 'DIAMOND-2', 'DIAMOND-3', 'DIAMOND-4', 'DIAMOND-5', 'DIAMOND-6',
  'DIAMOND-7', 'DIAMOND-8', 'DIAMOND-9', 'IN-AQUARIUM', 'IN-CAGE', 'ZORK3',
  'VAIR-1', 'VAIR-2', 'VAIR-3', 'VAIR-4', 'POSTS-ROOM', 'POOL-ROOM',
]);

/**
 * Walk to `target`, re-planning after every step. Zork II needs the
 * re-planning: while the carousel is spinning it throws you out of a random
 * one of its eight passages, so a route computed once is worthless.
 */
function walkTo(g: Game, target: string, budget = 60): void {
  const s = g.s;
  // The Magnet Room's exits are computed, so give the walker their two real
  // destinations; when the carousel has been stopped it scrambles them, and
  // the re-planning loop simply tries again.
  const MAGNET: Record<string, string> = { EAST: 'MACHINE-ROOM', SE: 'TEA-ROOM', OUT: 'TEA-ROOM' };
  const exitTo = (dir: string, ex: any): string | null => {
    if (ex.per === 'MAGNET-ROOM-EXIT') return MAGNET[dir] ?? null;
    return ex.to ?? null;
  };
  const passable = (dir: string, ex: any): boolean => {
    if (ex.per) return ex.per === 'MAGNET-ROOM-EXIT' && !!MAGNET[dir];
    if (ex.msg && !ex.to) return false;
    if (ex.ifFlag) return !!s.gflags[ex.ifFlag];
    if (ex.ifDoor) return fset$(s, ex.ifDoor, 'OPENBIT');
    return !!ex.to;
  };
  const firstStep = (): string | null => {
    const prev = new Map<string, [string, string]>();
    const q = [s.here];
    const seen = new Set([s.here]);
    while (q.length) {
      const cur = q.shift()!;
      if (cur === target) break;
      for (const [dir, ex] of Object.entries(DATA.rooms[cur]?.exits ?? {})) {
        if (!DIR_CMD[dir] || !passable(dir, ex)) continue;
        const to = exitTo(dir, ex) as string;
        if (!to || seen.has(to) || (NO_GO.has(to) && to !== target)) continue;
        seen.add(to);
        prev.set(to, [cur, DIR_CMD[dir]]);
        q.push(to);
      }
    }
    if (!seen.has(target)) return null;
    let cur = target;
    let cmd = '';
    while (cur !== s.here) { const [from, c] = prev.get(cur)!; cmd = c; cur = from; }
    return cmd;
  };

  for (let i = 0; i < budget && s.here !== target; i++) {
    const step = firstStep();
    if (!step) throw new Error(`no route ${s.here} -> ${target}`);
    const before = s.here;
    go(g, [step]);
    if (s.here === before && before !== 'CAROUSEL-ROOM' && before !== 'MAGNET-ROOM') {
      throw new Error(`stuck at ${before} going ${step} toward ${target}`);
    }
  }
  expect(g.s.here, `walking to ${target}`).toBe(target);
}

/**
 * A hundred weight units does not go far in Zork II, so the run caches
 * treasures in one central room and collects them for the demon at the end —
 * which is how the game is actually played.
 */
const STASH = 'CAROUSEL-ROOM';

/** Play like someone watching their lamp: dark rooms only. */
function lamp(g: Game, on: boolean): void {
  const isOn = !!g.s.oflags['LAMP']?.ONBIT;
  if (isOn !== on) go(g, [on ? 'turn on lamp' : 'turn off lamp']);
}

function stash(g: Game, ...items: string[]): void {
  walkTo(g, STASH);
  for (const it of items) go(g, [`drop ${it}`]);
}

describe('Full 400-point playthrough', () => {
  it('completes Zork II', () => {
    const g = new Game(2);
    const score = () => g.s.counters.score;

    // --- out of the barrow, and pick up the tea party's tools ---------------
    go(g, ['take sword', 'take lamp', 'turn on lamp']);
    walkTo(g, 'GAZEBO-ROOM');
    go(g, ['take teapot', 'take mat', 'take opener', 'take matchbook', 'take newspaper']);

    // --- water for the bucket, and up the well ------------------------------
    walkTo(g, 'DEEP-FORD');
    go(g, ['fill teapot with water']);
    expect(g.s.locs['WATER']).toBe('TEAPOT');
    // The way to the well is through the stone door, and the door wants an
    // answer: what is tall as a house, round as a cup, and all the king's
    // horses can't draw it up?
    walkTo(g, 'RIDDLE-ROOM');
    expect(go(g, ['answer well'])).toContain('deafening clap of thunder');
    expect(score(), 'the riddle').toBe(5);
    walkTo(g, 'PEARL-ROOM');
    go(g, ['take pearl']);
    walkTo(g, 'WELL-BOTTOM');
    go(g, ['enter bucket', 'pour water in bucket']);
    expect(g.s.here, 'the bucket is the only way up').toBe('WELL-TOP');
    go(g, ['out']);

    // --- the mad tea party: shrink, dry up the pool, take the candy ---------
    walkTo(g, 'TEA-ROOM');
    go(g, ['take red cake', 'take blue cake']);
    expect(go(g, ['eat green cake'])).toContain('become very large');
    expect(g.s.here).toBe('POSTS-ROOM');
    lamp(g, false);                      // Wonderland is lit, and the lamp is finite
    go(g, ['e']);
    lamp(g, true);                       // ...except the pool room
    go(g, ['take flask']);
    expect(go(g, ['throw red cake in pool'])).toContain('package of rare candies');
    // The teapot and the flask have done their work, and a hundred weight
    // units is a hundred weight units.
    go(g, ['drop teapot', 'drop flask', 'take candy', 'w']);
    expect(go(g, ['eat blue cake'])).toContain('getting smaller');
    expect(g.s.here).toBe('TEA-ROOM');
    expect(g.s.locs['CANDY'], 'the candy comes with you').toBe('ADVENTURER');
    lamp(g, false);                      // the tea room and the magnet rooms are lit

    // --- the robot, and stopping the carousel -------------------------------
    walkTo(g, 'MAGNET-ROOM');
    go(g, ['take green paper', 'robot, go east', 'e']);
    expect(go(g, ['robot, press the triangular button'])).toContain('dull thump');
    expect(g.s.gflags['CAROUSEL-FLIP-FLAG'], 'the carousel is stopped').toBe(true);

    // ...and the red sphere, which is a trap the robot can get you out of.
    go(g, ['robot, go south', 's']);
    expect(go(g, ['take red sphere'])).toContain('solid steel cage falls');
    expect(go(g, ['robot, lift the cage'])).toContain('hurled across the room');
    go(g, ['take red sphere']);
    expect(g.s.locs['PALANTIR-1']).toBe('ADVENTURER');

    // The only way out of the well again is the bucket, and it only sinks once
    // its water has evaporated — so wait for that in the lit tea room rather
    // than burning the lamp in the shaft.
    walkTo(g, 'TEA-ROOM');
    lamp(g, false);
    for (let i = 0; i < 60 && g.s.locs['WATER'] === 'BUCKET'; i++) go(g, ['wait']);
    expect(g.s.gflags['EVAPORATED'], 'the bucket is dry').toBe(true);
    lamp(g, true);
    walkTo(g, 'WELL-TOP');
    go(g, ['enter bucket']);
    for (let i = 0; i < 5 && g.s.here !== 'WELL-BOTTOM'; i++) go(g, ['wait']);
    expect(g.s.here, 'the bucket comes back down').toBe('WELL-BOTTOM');
    go(g, ['out']);

    // --- the locked door, and the blue sphere behind it ---------------------
    walkTo(g, 'TINY-ROOM');
    go(g, ['open lid', 'put mat under door', 'put opener in keyhole', 'take mat',
           'take key', 'take opener', 'unlock door with key', 'open door', 'n']);
    expect(g.s.here).toBe('DREARY-ROOM');
    go(g, ['take blue sphere']);
    expect(g.s.locs['PALANTIR-2']).toBe('ADVENTURER');

    // --- the dragon, walked into his own reflection -------------------------
    // Anger is the leash: each blow adds four and every turn takes two away,
    // and above six he stops playing and incinerates you.
    walkTo(g, 'DRAGON-ROOM');
    go(g, ['attack dragon with sword', 's', 'attack dragon with sword', 's',
           'attack dragon with sword']);
    expect(g.s.locs['DRAGON'], 'he is following').toBe(g.s.here);
    const melt = go(g, ['w']);
    expect(melt).toContain('sees his reflection');
    expect(g.s.gflags['ICE-MELTED']).toBe(true);
    expect(g.s.locs['DRAGON']).toBe(null);

    // --- the lair: the chest, and the princess who leads to the gold key ----
    // Rummaging in the chest startles her awake, which starts her nine-step
    // walk to the gazebo; she gives up the key there, whether or not you kept
    // up on the way.
    walkTo(g, 'DRAGON-LAIR');
    for (let i = 0; i < 20 && !fset$(g.s, 'CHEST', 'OPENBIT'); i++) go(g, ['open chest']);
    go(g, ['take statuette']);
    expect(g.s.locs['STATUETTE']).toBe('ADVENTURER');
    expect(g.s.gflags['PRINCESS-AWAKE'], 'the squeaky lid woke her').toBe(true);
    walkTo(g, 'GAZEBO-ROOM');
    lamp(g, false);                      // the garden lights itself
    for (let i = 0; i < 30 && g.s.locs['GOLD-KEY'] !== 'ADVENTURER'; i++) go(g, ['wait']);
    lamp(g, true);
    expect(g.s.locs['GOLD-KEY'], 'the unicorn brings the key').toBe('ADVENTURER');

    // The door tools have done their work.
    go(g, ['drop mat', 'drop opener', 'drop iron key', 'drop green paper', 'drop rose']);
    stash(g, 'red sphere', 'blue sphere', 'necklace', 'statuette');

    // --- the Bank of Zork ---------------------------------------------------
    walkTo(g, 'TELLER-WEST');
    go(g, ['w', 's', 'take portrait', 'n']);      // the chairman's office
    expect(g.s.locs['PORTRAIT']).toBe('ADVENTURER');
    expect(g.s.gvars['SCOL-ROOM'], 'entering from the office aims the curtain').toBe('SMALL-ROOM');
    go(g, ['walk through curtain']);
    expect(g.s.here).toBe('SMALL-ROOM');
    go(g, ['walk through south wall']);
    expect(g.s.gvars['SCOL-ROOM'], 'and the small room crosses over to the vault').toBe('VAULT');
    go(g, ['walk through curtain', 'take bills']);
    expect(g.s.here).toBe('VAULT');
    go(g, ['walk through north wall']);
    expect(g.s.here).toBe('DEPOSITORY');
    // The doors alarm if you carry the money out, so leave by the curtain.
    // Both the money and the chairman's portrait set the alarm off.
    go(g, ['drop bills', 'drop portrait', 'w', 'w', 'take bills', 'take portrait',
           'walk through curtain']);
    expect(g.s.here).toBe('VIEWING-WEST');
    go(g, ['s']);
    stash(g, 'bills', 'portrait');

    // --- the volcano: the ruby, the balloon, the ledges ---------------------
    walkTo(g, 'LAVA-ROOM');
    go(g, ['take ruby']);
    expect(g.s.locs['RUBY']).toBe('ADVENTURER');
    walkTo(g, 'MARBLE-HALL');
    go(g, ['take brick']);
    walkTo(g, 'COBWEBBY-CORRIDOR');
    go(g, ['take string']);
    expect(g.s.locs['FUSE']).toBe('ADVENTURER');

    walkTo(g, 'VOLCANO-BOTTOM');
    go(g, ['enter basket', 'open receptacle', 'put newspaper in receptacle',
           'light match', 'burn newspaper']);
    expect(g.s.gvars['BINF-FLAG'], 'the bag inflates').toBe('NEWSPAPER');
    for (let i = 0; i < 10 && g.s.here !== 'VAIR-2'; i++) go(g, ['wait']);
    expect(g.s.here).toBe('VAIR-2');
    go(g, ['w', 'tie wire to hook', 'out', 'take coin']);
    expect(g.s.here).toBe('LEDGE-1');
    expect(g.s.locs['COIN']).toBe('ADVENTURER');
    // The library is off this ledge, and the purple book has a stamp in it.
    go(g, ['s', 'read purple book', 'take stamp', 'n']);
    expect(g.s.locs['STAMP']).toBe('ADVENTURER');

    // --- up to the wide ledge, and the rusty box ----------------------------
    go(g, ['enter basket', 'untie wire']);
    for (let i = 0; i < 12 && g.s.here !== 'VAIR-4'; i++) go(g, ['wait']);
    expect(g.s.here).toBe('VAIR-4');
    go(g, ['w', 'tie wire to hook', 'out']);
    expect(g.s.here).toBe('LEDGE-2');

    // The box has been chipped at; a brick with a lit fuse finishes the job.
    go(g, ['s', 'put brick in hole', 'put string in brick', 'light match', 'burn string', 'n']);
    expect(g.s.here).toBe('LEDGE-2');
    for (let i = 0; i < 6 && !g.s.gflags['SAFE-FLAG']; i++) go(g, ['wait']);
    expect(g.s.gflags['SAFE-FLAG'], 'the box is blown open').toBe(true);
    go(g, ['s', 'take crown', 'n']);
    expect(g.s.locs['CROWN']).toBe('ADVENTURER');
    expect(g.s.here).toBe('LEDGE-2');

    // Down before the ledge follows the dusty room.
    go(g, ['enter basket', 'untie wire', 'close receptacle']);
    for (let i = 0; i < 20 && g.s.here !== 'VOLCANO-BOTTOM'; i++) go(g, ['wait']);
    expect(g.s.here, 'the balloon comes down').toBe('VOLCANO-BOTTOM');
    go(g, ['out']);
    stash(g, 'crown', 'ruby', 'coin', 'stamp');

    // --- the violin in the steel box ----------------------------------------
    walkTo(g, STASH);
    go(g, ['open box', 'take violin']);
    expect(g.s.locs['VIOLIN']).toBe('ADVENTURER');

    // --- the Wizard's door: feed the lizard, turn the gold key --------------
    walkTo(g, 'GUARDIAN-ROOM');
    expect(go(g, ['give candy to lizard'])).toContain('greedily wolfs down the candy');
    go(g, ['unlock door with gold key', 'open door', 's']);
    expect(g.s.here).toBe('WIZARDS-WORKSHOP');

    // --- the clear sphere, out of the aquarium ------------------------------
    walkTo(g, 'AQUARIUM-ROOM');
    expect(go(g, ['throw sword at aquarium'])).toContain('shatters the glass wall');
    go(g, ['take clear sphere']);
    expect(g.s.locs['PALANTIR-3']).toBe('ADVENTURER');

    // --- three spheres on three stands make a fourth -------------------------
    walkTo(g, STASH);
    go(g, ['take red sphere', 'take blue sphere']);
    walkTo(g, 'WORKBENCH-ROOM');
    go(g, ['put red sphere in ruby stand', 'put blue sphere in sapphire stand']);
    const merged = go(g, ['put clear sphere in diamond stand']);
    expect(merged).toContain('strange black sphere');
    go(g, ['take black sphere']);
    expect(g.s.locs['PALANTIR-4']).toBe('ADVENTURER');

    // --- the demon: ten treasures for one favour ----------------------------
    walkTo(g, 'PENTAGRAM-ROOM');
    expect(go(g, ['put black sphere on pentagram'])).toContain('a new master');
    for (let i = 0; i < 8 && g.s.locs['WIZARD'] !== 'PENTAGRAM-ROOM'; i++) go(g, ['wait']);
    expect(g.s.locs['WIZARD'], 'the Wizard comes to watch').toBe('PENTAGRAM-ROOM');

    const FEE = ['statuette', 'crown', 'violin', 'necklace', 'coin', 'stamp',
                 'ruby', 'bills', 'portrait', 'gold key'];
    let paid = '';
    const owed = [...FEE];
    for (let trip = 0; trip < 6 && owed.length; trip++) {
      walkTo(g, STASH);
      const carried: string[] = [];
      for (const t of [...owed]) {
        if (/Taken|already have that/.test(go(g, [`take ${t}`]))) carried.push(t);
      }
      walkTo(g, 'PENTAGRAM-ROOM');
      for (const t of carried) {
        paid = go(g, [`give ${t} to demon`]);
        owed.splice(owed.indexOf(t), 1);
      }
    }
    expect(owed, 'every treasure handed over').toEqual([]);
    expect(paid, 'ten treasures is his fee').toContain('This will do for my fee');
    expect(g.s.gflags['GENIE-READY']).toBe(true);

    const handover = go(g, ['demon, give me the wand']);
    expect(handover).toContain('I hear and obey!');
    go(g, ['take wand']);
    expect(g.s.locs['WAND']).toBe('ADVENTURER');

    // --- the menhir, and the collar under it --------------------------------
    walkTo(g, 'MENHIR-ROOM');
    go(g, ['wave wand at menhir']);
    expect(go(g, ['incant float'])).toContain('floats majestically into the air');
    go(g, ['sw', 'take collar', 'ne']);
    expect(g.s.locs['COLLAR']).toBe('ADVENTURER');
    expect(g.s.here, 'out before it sinks again').toBe('MENHIR-ROOM');

    // --- the baseball diamond ------------------------------------------------
    const BASES = ['DIAMOND-2', 'DIAMOND-4', 'DIAMOND-6', 'DIAMOND-8'];
    walkTo(g, 'STAIRWAY-TOP');
    go(g, ['down']);
    expect(g.s.here).toBe('DIAMOND-5');
    for (let i = 0; i < 200 && !g.s.gflags['DIAMOND-SOLVE']; i++) {
      if (!BASES.includes(g.s.here)) { go(g, ['n']); continue; }
      const want = ['SE', 'NE', 'NW', 'SW'][Math.max((g.s.counters.diamondCount ?? 1) - 1, 0)];
      go(g, [want.toLowerCase()]);
    }
    expect(g.s.gflags['DIAMOND-SOLVE'], 'the bases are run').toBe(true);

    // --- Cerberus, the crypt, and the end -----------------------------------
    walkTo(g, 'DIAMOND-5');
    go(g, ['down']);
    expect(g.s.here).toBe('CERBERUS-ROOM');
    expect(go(g, ['put collar on dog'])).toContain('whines happily');
    go(g, ['e']);
    expect(g.s.here).toBe('CRYPT-ANTEROOM');
    go(g, ['open crypt door', 's']);
    expect(g.s.here).toBe('CRYPT-ROOM');

    // The way on is only visible in the dark.
    expect(go(g, ['turn off lamp'])).toContain('faintly glowing letter');
    go(g, ['open secret door']);
    const ending = go(g, ['s']);
    expect(ending).toContain('you tumble down the staircase');
    expect(ending).toContain('conquered the Wizard of Frobozz');
    expect(g.s.won).toBe(true);
    expect(score(), 'a perfect score').toBe(400);
    console.log(`Zork II: ${score()}/400 in ${g.s.counters.moves} moves`);

    selectGame(1);
  });
});
