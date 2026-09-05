// Zork II's object and room ACTION routines (2actions.zil).
//
// Zork II has 189 of them. They land here batch by batch; anything not yet
// ported simply falls through to the shared verb defaults, which is what the
// ZIL does when a routine returns false.
//
// Handlers are keyed by the name of the ZIL routine rather than by object id,
// and the tables below are built by asking the extracted world data which
// objects carry that ACTION. That way a routine shared by four objects (the
// Wizard's four stands) is written once and can never be wired to three of
// them by accident.
import type { Ctx } from '../ctx';
import type { WorldState } from '../types';
import { prob, pickOne, DUMMY } from '../ctx';
import { jigsUp } from '../death';
import {
  fset, fclear, fset$, moveObj, removeObj, contents, inPlayer, mungRoom, playerVehicle,
  roomDef, roomLit, objDef, theName, PLAYER,
} from '../world';
import * as spells from '../spells';
import { spellUsed } from '../spells';
import { NEXT_SPHERE, WIZQDESCS, palantirLook } from './specialDescs';
import world from '../../data/zork2/world.gen.json';

type Handler = (ctx: Ctx) => boolean;
type RoomHandler = (ctx: Ctx, phase: 'enter' | 'end' | 'beg', dir?: string) => boolean;

/** OPEN-CLOSE (2actions.zil:93). */
function openClose(ctx: Ctx, obj: string, openMsg: string, closeMsg: string): boolean {
  const { s, out } = ctx;
  if (ctx.verb === 'open') {
    if (fset$(s, obj, 'OPENBIT')) out.tell(pickOne(ctx, DUMMY));
    else { out.tell(openMsg); fset(s, obj, 'OPENBIT'); }
    return true;
  }
  if (ctx.verb === 'close') {
    if (fset$(s, obj, 'OPENBIT')) { out.tell(closeMsg); fclear(s, obj, 'OPENBIT'); }
    else out.tell(pickOne(ctx, DUMMY));
    return true;
  }
  return false;
}

/** `,DRAGON-ATTACKS` (2actions.zil) — he is never hurt, only interested. */
const DRAGON_ATTACKS = [
  'Dragon hide is tough as steel, but you have succeeded in annoying him a bit. He looks at you as if deciding whether or not to eat you.',
  'That captured his interest. He stares at you balefully.',
  'The dragon is surprised and interested (for the moment).',
  "You've made him rather angry. You had better be very careful now.",
  'That did no damage, but he turns his smoky yellow eyes in your direction and sighs.',
];

/** PLID (2actions.zil) — the lid on this side of the door. */
function nearLid(s: import('../types').WorldState): string {
  return s.locs['LID-1'] === s.here ? 'LID-1' : 'LID-2';
}

/** `,FATAL-VAPORS` — the flask is not to be opened. */
const FATAL_VAPORS =
  'A cloud of noxious green vapor rises from the flask, and you fall to the ground, overcome by the fumes.';

/** ICEBOOM (2actions.zil:106) — the orange cake goes off like a bomb. */
function iceBoom(ctx: Ctx): void {
  ctx.out.emit({ type: 'shake' });
  mungRoom(ctx.s, ctx.s.here, 'The entrance is blocked by sticky orange rubble. Probably some careless adventurer was playing with blasting cakes.');
  jigsUp(ctx, 'You have been blasted to smithereens (wherever they are).', {});
}

/** CAKE-CRUMBLE (2actions.zil:915) — a cake carried out of its own rooms. */
function cakeCrumble(ctx: Ctx): boolean {
  const { s, out } = ctx;
  const SAFE = ['TEA-ROOM', 'POSTS-ROOM', 'POOL-ROOM', 'MACHINE-ROOM', 'MAGNET-ROOM',
    'CAGE-ROOM', 'WELL-TOP', 'IN-CAGE'];
  if (SAFE.includes(s.here)) return false;
  const cake = ctx.dobj && fset$(s, ctx.dobj, 'FOODBIT') ? ctx.dobj : ctx.iobj;
  if (!cake) return false;
  removeObj(s, cake);
  out.tell(`The ${objDef(cake).desc} has crumbled to dust.`);
  return true;
}

/** `,OTHER-PROPERTIES` (2actions.zil) — what the brick does when you light it. */
export const OTHER_PROPERTIES =
  "Now you've done it. It seems that the brick has other properties than weight, namely the ability to blow you to smithereens.";

/**
 * BOMB? (2actions.zil:1516) — a brick with a lit fuse in it. The guardian will
 * happily swallow one.
 */
export function isBomb(ctx: Ctx, obj: string): boolean {
  return obj === 'BRICK' && ctx.s.locs['FUSE'] === 'BRICK' && ctx.enabled('I-FUSE');
}

/**
 * EIGHT-DIRECTIONS (2actions.zil:88). Seven entries, and west is deliberately
 * not among them: the scramble can never send you the one way that leaves the
 * carousel, which is what makes the room a puzzle rather than a nuisance.
 */
const SCRAMBLE_DIRS = ['NORTH', 'EAST', 'SOUTH', 'NE', 'SE', 'SW', 'NW'];

/**
 * CAROUSEL-ROOM-FCN's M-BEG arm. While the carousel turns, a compass move is
 * replaced by a random one — always if you tried west, otherwise 80% of the
 * time. Up and down are untouched.
 *
 * Returns the direction actually taken, or null to let the move stand.
 */
export type WalkIntercept = { dir?: string; stop?: boolean } | null;

export function beforeWalk(ctx: Ctx, dir: string): WalkIntercept {
  const { s, out } = ctx;

  // In a vehicle it is the vehicle's M-BEG that runs, not the room's
  // (gmain.zil:212).
  if (playerVehicle(s) === 'BALLOON') return balloonWalk(ctx, dir);

  if (s.here !== 'CAROUSEL-ROOM' || s.gflags['CAROUSEL-FLIP-FLAG']) return null;
  if (dir === 'UP' || dir === 'DOWN') return null;

  let intended = dir;
  if (dir === 'OUT') {
    out.tell('Feeling dizzy, you pick a direction at random.');
    intended = 'EAST';
  } else {
    out.tell("You're not sure which direction is which. This room is very disorienting.");
  }
  if (intended === 'WEST' || prob(ctx, 80)) {
    return { dir: SCRAMBLE_DIRS[Math.floor(ctx.rng() * SCRAMBLE_DIRS.length)] };
  }
  return { dir: intended };
}

/**
 * BALLOON-FCN's M-BEG arm for WALK. You do not steer a balloon: a compass move
 * only tells it which way you would like to drift, and the drifting itself is
 * I-BALLOON's business three turns later.
 */
function balloonWalk(ctx: Ctx, dir: string): WalkIntercept {
  const { s, out } = ctx;
  const ex = roomDef(s.here).exits[dir];
  if (!ex) {
    out.tell("You can't control the balloon this way.");
    return { stop: true };
  }
  if (s.gvars['BTIE-FLAG']) {
    out.tell('You are tied to the ledge.');
    return { stop: true };
  }
  if (ex.to && !ex.per && !ex.ifFlag && !ex.ifDoor && !fset$(s, ex.to, 'RMUNGBIT')) {
    s.gvars['BLOC'] = ex.to;
  }
  ctx.queue('I-BALLOON', 3);
  return null;
}

/**
 * BALLOON-BURN (2actions.zil:227). Burning something in the receptacle fires
 * the burner instead of destroying it: verbs.ts routes V-BURN here when the
 * object is in the receptacle, exactly as gverbs.zil:252 does.
 */
export function balloonBurn(ctx: Ctx): boolean {
  const { s, out } = ctx;
  const fuel = ctx.dobj;
  if (!fuel) return false;
  out.tell(`The ${objDef(fuel).desc} burns inside the receptacle.`);
  out.emit({ type: 'sfx', name: 'z2-balloon-burner' });
  ctx.queue('I-BURNUP', (objDef(fuel).size ?? 5) * 20);
  fset(s, fuel, 'FLAMEBIT');
  fset(s, fuel, 'ONBIT');
  fclear(s, fuel, 'TAKEBIT');
  fclear(s, fuel, 'READBIT');
  if (s.gvars['BINF-FLAG']) return true;

  out.tell('The cloth bag inflates as it fills with hot air.');
  if (!s.gflags['BLAB-FLAG']) {
    out.tell('A small label drops from the bag into the basket.');
    moveObj(s, 'BALLOON-LABEL', 'BALLOON');
  }
  s.gflags['BLAB-FLAG'] = true;
  s.gvars['BINF-FLAG'] = fuel;
  ctx.queue('I-BALLOON', 3);
  return true;
}

// ------------------------------- the princess --------------------------------
/**
 * `,PRDIRS` (2actions.zil:2760). Once woken, the princess walks a fixed nine
 * step route from the dragon's lair to the gazebo, and the whole puzzle is
 * keeping up with her: she opens the secret door on the way, and the unicorn
 * only comes to her at the far end.
 */
export interface PrincessStep {
  /** The direction word she is seen to walk. */
  walks: string;
  /** Where she goes. */
  to: string;
  /** The direction word she is seen to arrive from. */
  from: string;
  /** The direction you must walk to keep up. */
  follow: string;
}

export const PRINCESS_ROUTE: PrincessStep[] = [
  { walks: 'south', to: 'DRAGON-ROOM', from: 'north', follow: 'SOUTH' },
  { walks: 'east', to: 'LEDGE-TUNNEL', from: 'west', follow: 'EAST' },
  { walks: 'east', to: 'RAVINE-LEDGE', from: 'west', follow: 'EAST' },
  { walks: 'down', to: 'DEEP-FORD', from: 'up', follow: 'DOWN' },
  { walks: 'south', to: 'MARBLE-HALL', from: 'north', follow: 'SOUTH' },
  { walks: 'east', to: 'STREAM-PATH', from: 'west', follow: 'EAST' },
  { walks: 'east', to: 'FORMAL-GARDEN', from: 'west', follow: 'EAST' },
  { walks: 'north', to: 'GARDEN-NORTH', from: 'south', follow: 'NORTH' },
  { walks: 'in', to: 'GAZEBO-ROOM', from: 'out', follow: 'IN' },
];

// -------------------------------- the demon ----------------------------------
/** `,TREASURES-MAX` — every treasure but the four spheres, candy, collar, wand. */
const TREASURES_MAX = 10;

/** `,GENIE-THANKS` — what he says as the hoard grows, one line per treasure. */
const GENIE_THANKS = [
  "Most fine, master! But 'tis not enough. I will do a great service, and are not great services bought at great price?",
  'Very nice, but not enough!',
  'Ah, truly magnificent! Keep them coming.',
  'Almost halfway there, oh worthy one!',
  'Oh, such beauty! Your generosity almost overwhelms me!',
  'Truly I shall do thee a wonderful service when thou hast finished!',
  'Truly you are most generous! But still, this is yet not enough.',
  'A fine gift, mighty one, you have almost reached my fee.',
  'Wondrous fine, master! But one treasure is yet to be given!',
];

/** CASE-WORTH (2actions.zil) — treasures already banked count towards the fee. */
function caseWorth(s: import('../types').WorldState): number {
  return contents(s, 'WIZARD-CASE').filter((o) => objDef(o)?.value).length;
}

// ============================== BANK OF ZORK =================================
// The bank is one machine, not four routines: a curtain of light in the
// depository, four identical viewing rooms, and one piece of state — which
// room the curtain currently leads to.
//
// Walking in from a teller room sets that destination from the direction you
// walked (SCOL-ROOMS). Walking through the curtain drops you there and leaves
// that room's wall passable for twelve turns (SCOL-ACTIVE). Walking back
// through the wall returns you to the depository and sets the destination to
// whatever SCOL-WALLS says that wall leads to — and for the small room, that
// is the vault. That one crossing is the whole puzzle.

/** `,SCOL-ROOMS` — the direction you walked in, and where the curtain then goes. */
const SCOL_ROOMS: Record<string, string> = {
  EAST: 'VIEWING-EAST', WEST: 'VIEWING-WEST', NORTH: 'SMALL-ROOM', SOUTH: 'VAULT',
};

/** `,SCOL-WALLS` — room -> [the wall you can walk through, where it leads]. */
const SCOL_WALLS: Record<string, [wall: string, leadsTo: string]> = {
  'VIEWING-WEST': ['SEWL', 'VIEWING-WEST'],
  'VIEWING-EAST': ['SWWL', 'VIEWING-EAST'],
  'SMALL-ROOM': ['SSWL', 'VAULT'],
  VAULT: ['SNWL', 'SMALL-ROOM'],
};

/** SCOL-OBJ (2actions.zil) — send one object through instead of yourself. */
function scolObj(ctx: Ctx, obj: string, ticks: number, room: string): void {
  const { s, out } = ctx;
  ctx.queue('I-CURTAIN', ticks);
  moveObj(s, obj, room);
  if (room === 'DEPOSITORY') {
    out.tell(`The ${objDef(obj).desc} passes through the wall and vanishes.`);
  } else {
    out.tell(`The curtain dims slightly as the ${objDef(obj).desc} passes through.`);
    s.gvars['SCOL-ROOM'] = null;
  }
}

/** SCOL-THROUGH (2actions.zil) — send yourself. */
function scolThrough(ctx: Ctx, ticks: number, room: string): void {
  ctx.queue('I-CURTAIN', ticks);
  ctx.out.tell('You feel somewhat disoriented as you pass through...');
  ctx.out.emit({ type: 'sfx', name: 'z2-curtain-pass' });
  ctx.moveTo(room, true);
}

/** SCOL-GO (2actions.zil) — through the curtain, with or without an object. */
function scolGo(ctx: Ctx, obj: string | null): void {
  const { s } = ctx;
  const dest = s.gvars['SCOL-ROOM'];
  if (!dest) return;
  s.gvars['SCOL-ACTIVE'] = dest;
  if (obj) scolObj(ctx, obj, 0, dest);
  else scolThrough(ctx, 12, dest);
}

/** SCOL-OBJECT (2actions.zil) — the curtain's own ACTION. */
function curtainAction(ctx: Ctx, wall?: string): boolean {
  const { s, out } = ctx;
  switch (ctx.verb) {
    case 'push': case 'move': case 'take': case 'touch':
      out.tell('As you try, your hand seems to go through it.');
      return true;
    case 'attack':
      if (!ctx.iobj) return false;
      out.tell(`The ${objDef(ctx.iobj).desc} goes through it.`);
      return true;
    case 'throw': case 'put':
      // Throwing something at the curtain sends it to wherever the curtain
      // currently leads — the only way to move loot out of the vault.
      if (ctx.iobj !== (wall ?? 'CURTAIN') || !ctx.dobj) return false;
      if (!inPlayer(s, ctx.dobj)) { out.tell("You don't have that!"); return true; }
      scolGo(ctx, ctx.dobj);
      return true;
    default:
      return false;
  }
}

// ============================ OBJECT ACTIONS =================================

const OBJ_ROUTINES: Record<string, Handler> = {
  // --- the volcano ---------------------------------------------------------
  'GLACIER-FCN': (ctx) => {
    if (ctx.verb !== 'melt') return false;
    ctx.out.tell("This is a big glacier; you'll need a lot of heat.");
    return true;
  },

  'SAFE-FCN': (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'take' && ctx.dobj === 'SAFE') {
      out.tell('The box is imbedded in the wall.');
      return true;
    }
    if (ctx.verb === 'open') {
      out.tell(s.gflags['SAFE-FLAG'] ? 'The box has no door!' : 'The box is rusted and will not open.');
      return true;
    }
    if (ctx.verb === 'close') {
      out.tell(s.gflags['SAFE-FLAG'] ? 'The box has no door!' : "The box isn't open!");
      return true;
    }
    return false;
  },

  'SLOT-F': (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'look-in' && contents(s, 'SLOT').length === 0) {
      out.tell("There's nothing in the hole.");
      return true;
    }
    if (ctx.verb === 'examine') {
      out.tell('The oblong hole has been chipped out of the box, probably by someone wanting whatever is inside the box. The attempt was a pathetic failure, however.');
      return true;
    }
    return false;
  },

  'BRICK-FCN': (ctx) => {
    if (ctx.verb !== 'burn') return false;
    removeObj(ctx.s, 'BRICK');
    ctx.out.emit({ type: 'shake' });
    jigsUp(ctx, OTHER_PROPERTIES, {});
    return true;
  },

  'FUSE-FCN': (ctx) => {
    const { s, out } = ctx;
    const litByMatch = (ctx.verb === 'lamp-on' || ctx.verb === 'light')
      && inPlayer(s, 'MATCH') && fset$(s, 'MATCH', 'ONBIT');
    if (ctx.verb !== 'burn' && !litByMatch) return false;
    out.tell('The string starts to burn.');
    ctx.queue('I-FUSE', 2);
    return true;
  },

  // --- kit ------------------------------------------------------------------
  // LANTERN (2actions.zil:1943). The switching itself is V-LAMP-ON's job — this
  // routine returns false for that — so all it owns is the burned-out lamp and
  // the one way to break it for good.
  'LANTERN': (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'throw' && ctx.dobj === 'LAMP') {
      out.tell('The lamp has smashed into the floor, and the light has gone out.');
      ctx.disable('I-LANTERN');
      removeObj(s, 'LAMP');
      moveObj(s, 'BROKEN-LAMP', s.here);
      return true;
    }
    if (ctx.verb === 'lamp-on' || ctx.verb === 'light') {
      if (fset$(s, 'LAMP', 'RMUNGBIT')) { out.tell("A burned-out lamp won't light."); return true; }
      // <ENABLE <INT I-LANTERN>>: 300 turns on the first wick (2actions.zil:1934),
      // and wherever it had got to on every switch-on after that.
      ctx.enable('I-LANTERN', 300);
      return false;
    }
    if (ctx.verb === 'lamp-off' || ctx.verb === 'extinguish') {
      if (fset$(s, 'LAMP', 'RMUNGBIT')) { out.tell('The lamp has already burned out.'); return true; }
      ctx.disable('I-LANTERN');
      return false;
    }
    if (ctx.verb === 'examine') {
      out.tell(fset$(s, 'LAMP', 'RMUNGBIT') ? 'The lamp has burned out.'
        : fset$(s, 'LAMP', 'ONBIT') ? 'The lamp is on.' : 'The lamp is turned off.');
      return true;
    }
    return false;
  },

  // --- the Wizard's quarry -------------------------------------------------
  'MENHIR-FCN': (ctx) => {
    const { s, out } = ctx;
    switch (ctx.verb) {
      case 'look-under':
      case 'look-behind':
        out.tell(s.gflags['MENHIR-POSITION']
          ? 'Behind the menhir is some air and then a wall.'
          : 'The gap between the menhir and the wall is very narrow, but it is clear that there is a sizeable room in there. Your light only reveals a part of the far wall.');
        return true;
      case 'take':
      case 'move':
      case 'turn':
        out.tell("The menhir weighs many tons and is eight feet wide. You can't even get a grip on it, much less move it.");
        return true;
      case 'read':
        out.tell('"F"');
        return true;
      case 'examine':
        out.tell('It is nicely finished, and the letter "F" on it is particularly well carved.');
        return true;
      // The two spell arms. ENCHANT and DISENCHANT reach here once the player's
      // own spell layer is wired; until then nothing casts FLOAT at the menhir.
      case 'enchant':
        if (spellUsed(s) !== 'FLOAT') return false;
        out.tell('The menhir floats majestically into the air, rising about ten feet. The passage beneath it beckons invitingly.');
        s.gflags['MENHIR-POSITION'] = true;
        return true;
      case 'disenchant':
        if (spellUsed(s) !== 'FLOAT') return false;
        s.gflags['MENHIR-POSITION'] = false;
        if (s.here === 'MENHIR-ROOM' || s.here === 'KENNEL') out.tell('The menhir sinks to the ground.');
        return true;
      default:
        return false;
    }
  },

  // --- the robot and the cage -----------------------------------------------
  // ROBOT-FCN (2actions.zil:1237). Everything you say to the robot it answers
  // itself; the two things it will actually do are walk and lift the cage.
  'ROBOT-FCN': (ctx) => {
    const { s, out } = ctx;
    const here = () => s.locs['ROBOT'] === s.here;

    if (ctx.winner === 'ROBOT') {
      if (ctx.verb === 'follow') {
        out.tell('"My memory circuits are not that advanced. I can move as directed, though."');
        return true;
      }
      if ((ctx.verb === 'raise' || ctx.verb === 'take' || ctx.verb === 'move') && ctx.dobj === 'CAGE') {
        // The one thing it is for.
        out.tell("The cage shakes and is hurled across the room. It's hard to say, but the robot appears to be smiling.");
        out.emit({ type: 'sfx', name: 'z2-robot-lift' });
        out.emit({ type: 'panel', key: 'events/z2-ev-robot-lifts-cage' });
        ctx.disable('I-SPHERE');
        moveObj(s, 'MANGLED-CAGE', 'CAGE-ROOM');
        removeObj(s, 'CAGE');
        fclear(s, 'ROBOT', 'NDESCBIT');
        fset(s, 'PALANTIR-1', 'TAKEBIT');
        moveObj(s, 'ROBOT', 'CAGE-ROOM');
        s.gflags['CAGE-SOLVE-FLAG'] = true;
        ctx.moveTo('CAGE-ROOM', true);
        return true;
      }
      if (ctx.verb === 'eat' || ctx.verb === 'drink') {
        if (here()) out.tell('"I am sorry but that is difficult for a being with no mouth."');
        return true;
      }
      if (prob(ctx, 2) && here()) {
        out.tell('"Buzz! Buzz! Buzz! My circuits are getting rusty. Try again."');
        return true;
      }
      if (ctx.verb === 'read' || ctx.verb === 'examine') {
        if (here()) out.tell('"My vision is not sufficiently acute to do that."');
        return true;
      }
      if (ctx.verb === 'drop' || ctx.verb === 'put' || ctx.verb === 'throw') {
        if (!here()) return false;
        if (ctx.dobj && s.locs[ctx.dobj] === 'ROBOT') { out.tell('"Whirr, buzz, click!"'); return false; }
        out.tell('"Click! I don\'t have that. Buzz! Whirr!"');
        return true;
      }
      if (ctx.verb === 'walk'
          || ((ctx.verb === 'take' || ctx.verb === 'push' || ctx.verb === 'turn')
              && ctx.dobj && !fset$(s, ctx.dobj, 'ACTORBIT'))) {
        if (!here()) return false;
        out.tell(prob(ctx, 80) ? '"Whirr, buzz, click!"' : '"Buzz, click, whirr!"');
        return false;
      }
      if (here()) out.tell('"My programming is insufficient to allow me to perform that task."');
      return true;
    }

    if (ctx.verb === 'open' || ctx.verb === 'look-in' || ctx.verb === 'close') {
      out.tell("There's no access panel or door on the robot.");
      return true;
    }
    if (ctx.verb === 'give' && ctx.iobj === 'ROBOT' && ctx.dobj) {
      moveObj(s, ctx.dobj, 'ROBOT');
      out.tell(`The robot gladly takes the ${objDef(ctx.dobj).desc} and nods his head-like appendage in thanks.`);
      return true;
    }
    if (ctx.verb === 'throw' || ctx.verb === 'break') {
      out.tell('The robot falls to the ground and (being of shoddy construction) disintegrates before your eyes.');
      removeObj(s, 'ROBOT');
      return true;
    }
    return false;
  },

  // SPHERE-FCN (2actions.zil:1192). Reaching for the sphere springs the trap;
  // sending the robot to reach for it kills the robot.
  'SPHERE-FCN': (ctx) => {
    const { s, out } = ctx;
    const grabbing = !s.gflags['CAGE-SOLVE-FLAG']
      && (ctx.verb === 'take' || ctx.verb === 'move' || ctx.verb === 'put');
    if (grabbing && ctx.winner !== 'ROBOT') {
      out.tell('As you reach for the sphere, a solid steel cage falls from the ceiling to entrap you. To make matters worse, poisonous gas starts coming into the room.');
      out.emit({ type: 'sfx', name: 'z2-chomper' });
      if (s.locs['ROBOT'] === s.here) {
        moveObj(s, 'ROBOT', 'IN-CAGE');
        fset(s, 'ROBOT', 'NDESCBIT');
      }
      ctx.queue('I-SPHERE', 6);
      ctx.moveTo('IN-CAGE', true);
      moveObj(s, 'CAGE', s.here);
      fset(s, 'CAGE', 'NDESCBIT');
      fclear(s, 'CAGE', 'INVISIBLE');
      return true;
    }
    if (grabbing) {
      fset(s, 'PALANTIR-1', 'INVISIBLE');
      removeObj(s, 'ROBOT');
      moveObj(s, 'CAGE', 'CAGE-ROOM');
      fclear(s, 'CAGE', 'INVISIBLE');
      jigsUp(ctx, 'As the robot reaches for the sphere, a solid steel cage falls from the ceiling, trapping him. You can faintly hear his last words: "Whirr, buzz, click!" A cloud of smoke rising from beneath the cage confirms your fears about the fate of your brave mechanical friend.', {});
      return true;
    }
    if (ctx.verb === 'look-in' || ctx.verb === 'examine') return OBJ_ROUTINES['PALANTIR'](ctx);
    return false;
  },

  // --- the aquarium ---------------------------------------------------------
  // AQUARIUM-FCN (2actions.zil). The clear sphere is at the bottom of a tank
  // with a baby sea serpent in it: throw something heavy enough through the
  // glass and the serpent drowns in the air trying to reach you.
  'AQUARIUM-FCN': (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'enter') { ctx.walk('IN'); return true; }
    if (ctx.verb === 'look-in' && s.locs['SERPENT'] === 'AQUARIUM') {
      out.tell('In the aquarium is a baby sea-serpent who eyes you suspiciously. His scaly body writhes about in the huge tank.');
      return true;
    }
    const smashing = ((ctx.verb === 'break' || ctx.verb === 'attack') && ctx.dobj === 'AQUARIUM')
      || (ctx.verb === 'throw' && ctx.iobj === 'AQUARIUM');
    if (!smashing) return false;
    const obj = ctx.dobj === 'AQUARIUM' ? ctx.iobj : ctx.dobj;
    if (!obj) return false;
    moveObj(s, obj, s.here);
    if (s.locs['DEAD-SERPENT'] === s.here) { out.tell('The aquarium is already broken!'); return true; }
    if (obj === 'FLASK') {
      jigsUp(ctx, 'The flask shatters, and poison gas fills the room!', {});
      return true;
    }
    if (isBomb(ctx, obj)) { ctx.disable('I-FUSE'); return true; }
    if (!fset$(s, obj, 'WEAPONBIT') && (objDef(obj).size ?? 5) <= 10) {
      out.tell(`The ${objDef(obj).desc} bounces harmlessly off the glass.`);
      return true;
    }
    removeObj(s, 'SERPENT');
    moveObj(s, 'PALANTIR-3', 'AQUARIUM');
    fclear(s, 'PALANTIR-3', 'NDESCBIT');
    s.gflags['AQUARIUM-BROKEN'] = true;
    moveObj(s, 'DEAD-SERPENT', s.here);
    out.emit({ type: 'sfx', name: 'z2-aquarium-break' });
    out.tell(`The ${objDef(obj).desc} shatters the glass wall of the aquarium, spilling out an impressive amount of salt water and wet sand. It also spills out an extremely annoyed sea serpent who bites angrily at the ${objDef(obj).desc}, and then at you. He is having difficulty breathing, and he seems to hold you responsible for his current problem.`);
    if (ctx.verb === 'break') {
      out.tell('He manages to rend you limb from limb before he drowns in the air.');
      jigsUp(ctx, 'I guess you were too careless.', {});
      return true;
    }
    out.tell('He tries to slither across the stone floor towards you. Fortunately, he expires mere inches away from biting off your foot. A clear crystal sphere sits amid the sand and broken glass on the bottom of the aquarium.');
    return true;
  },

  'SERPENT-FCN': (ctx) => {
    const { out } = ctx;
    if (ctx.winner === 'SERPENT') { out.tell('The serpent only stares hungrily at you.'); return true; }
    if (ctx.verb === 'attack' || ctx.verb === 'break') {
      out.tell("He swims towards you with a powerful stroke of his flippers, dagger-like teeth dripping. Fortunately, he doesn't want to crash into the aquarium wall, and contents himself with splashing you with water.");
      return true;
    }
    if (ctx.verb === 'put' && ctx.dobj === 'SERPENT') { out.tell('Impossible for many reasons.'); return true; }
    if (ctx.verb === 'take' || ctx.verb === 'give') {
      jigsUp(ctx, 'He takes you instead. *Uurrp!*', {});
      return true;
    }
    return false;
  },

  'DEAD-SERPENT-FCN': (ctx) => {
    if (ctx.verb !== 'take') return false;
    ctx.out.tell("This may only be a baby sea serpent, but it's as big as a small whale.");
    return true;
  },

  // --- the door between the palantir rooms -----------------------------------
  // The Tiny Room and the Dreary Room share one locked door with a keyhole on
  // each side. The key is in the far keyhole: slide the place mat under the
  // door, poke the key through with the letter opener, and it lands on the mat
  // on your side.

  'PDOOR-FCN': (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'look-under' && s.gflags['MUD-FLAG']) {
      out.tell('The place mat is under the door.');
      return true;
    }
    if (ctx.verb === 'unlock' || ctx.verb === 'lock') {
      if (ctx.iobj === 'GOLD-KEY') { out.tell("It doesn't fit the lock."); return true; }
      if (ctx.iobj !== 'KEY') {
        out.tell(ctx.verb === 'unlock' ? "It can't be unlocked with that." : "It can't be locked with that.");
        return true;
      }
      if (ctx.verb === 'lock') {
        out.tell('The door is locked.');
        s.gflags['PUNLOCK-FLAG'] = false;
        return true;
      }
      const blocking = contents(s, nearLid(s) === 'LID-1' ? 'KEYHOLE-1' : 'KEYHOLE-2')[0];
      if (blocking && blocking !== 'KEY') { out.tell('The keyhole is blocked.'); return true; }
      out.tell('The door is now unlocked.');
      s.gflags['PUNLOCK-FLAG'] = true;
      return true;
    }
    if (ctx.verb === 'put' && ctx.prep === 'under') {
      if (ctx.dobj === 'ROBOT-LABEL') {
        out.tell('The paper is very small and vanishes under the door.');
        moveObj(s, ctx.dobj, s.here === 'TINY-ROOM' ? 'DREARY-ROOM' : 'TINY-ROOM');
        return true;
      }
      if (ctx.dobj === 'NEWSPAPER') {
        out.tell("The newspaper crumples up and won't go under the door.");
        return true;
      }
      return false;
    }
    if (ctx.verb === 'open' || ctx.verb === 'close') {
      if (!s.gflags['PUNLOCK-FLAG']) { out.tell('The door is locked.'); return true; }
      return openClose(ctx, 'PDOOR', 'The door is now open.', 'The door is now closed.');
    }
    return false;
  },

  'PKEY-FCN': (ctx) => {
    if (ctx.verb !== 'turn') return false;
    ctx.perform(ctx.s.gflags['PUNLOCK-FLAG'] ? 'lock' : 'unlock', 'PDOOR', 'KEY');
    return true;
  },

  'PKH-FCN': (ctx) => {
    const { s, out } = ctx;
    const here = s.here === 'DREARY-ROOM' ? 'KEYHOLE-2' : 'KEYHOLE-1';
    const far = here === 'KEYHOLE-1' ? 'KEYHOLE-2' : 'KEYHOLE-1';
    if (ctx.verb === 'look-in') {
      const other = s.here === 'DREARY-ROOM' ? 'TINY-ROOM' : 'DREARY-ROOM';
      const clear = fset$(s, 'LID-1', 'OPENBIT') && fset$(s, 'LID-2', 'OPENBIT')
        && !contents(s, 'KEYHOLE-1').length && !contents(s, 'KEYHOLE-2').length
        && roomLit(s, other);
      out.tell(clear
        ? 'You can see a lighted room at the other end.'
        : 'No light can be seen through the keyhole.');
      return true;
    }
    if (ctx.verb === 'put') {
      if (!fset$(s, nearLid(s), 'OPENBIT')) { out.tell('The lid is in the way.'); return true; }
      if (contents(s, here).length) { out.tell('The keyhole is blocked.'); return true; }
      if (ctx.dobj !== 'LETTER-OPENER' && ctx.dobj !== 'KEY') {
        out.tell(`The ${objDef(ctx.dobj ?? '').desc} doesn't fit.`);
        return true;
      }
      // Poking something in pushes whatever is in the far side out — onto the
      // place mat, if you have thought to put one there.
      const pushed = contents(s, far)[0];
      if (pushed) {
        out.tell('There is a faint noise from behind the door and a small cloud of dust rises from beneath it.');
        removeObj(s, pushed);
        if (s.gflags['MUD-FLAG']) s.gvars['MATOBJ'] = pushed;
        return false;
      }
      return false;
    }
    return false;
  },

  'PLID-FCN': (ctx) => {
    const { s, out } = ctx;
    const lid = ctx.dobj ?? nearLid(s);
    if (ctx.verb === 'open' || ctx.verb === 'raise' || ctx.verb === 'move') {
      out.tell(fset$(s, lid, 'OPENBIT') ? pickOne(ctx, DUMMY) : 'The lid is now open.');
      fset(s, lid, 'OPENBIT');
      return true;
    }
    if (ctx.verb === 'close' || ctx.verb === 'lower') {
      const hole = s.here === 'DREARY-ROOM' ? 'KEYHOLE-2' : 'KEYHOLE-1';
      if (contents(s, hole).length) { out.tell('The keyhole is occupied.'); return true; }
      out.tell('The lid covers the keyhole.');
      fclear(s, lid, 'OPENBIT');
      return true;
    }
    if (ctx.verb === 'look-behind') {
      out.tell("There's a keyhole behind the lid.");
      return true;
    }
    return false;
  },

  'PWINDOW-FCN': (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'look-in') {
      s.gflags['PLOOK-FLAG'] = true;
      if (fset$(s, 'PDOOR', 'OPENBIT')) { out.tell('The door is open, dummy.'); return true; }
      out.tell(ctx.viewRoom(s.here === 'DREARY-ROOM' ? 'TINY-ROOM' : 'DREARY-ROOM'));
      return true;
    }
    if (ctx.verb === 'enter') { out.tell('Perhaps if you were diced....'); return true; }
    return false;
  },

  'PLACE-MAT-FCN': (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'put' && ctx.prep === 'under') {
      if (ctx.iobj === 'PDOOR') {
        out.tell('The place mat fits easily under the door.');
        moveObj(s, 'PLACE-MAT', s.here);
        s.gflags['MUD-FLAG'] = true;
        return true;
      }
      if (ctx.iobj === 'WIZ-DOOR' || ctx.iobj === 'RIDDLE-DOOR' || ctx.iobj === 'CRYPT-DOOR') {
        out.tell("There's not enough room under this door.");
        return true;
      }
      return false;
    }
    if ((ctx.verb === 'take' || ctx.verb === 'move') && s.gvars['MATOBJ']) {
      const prize = s.gvars['MATOBJ']!;
      moveObj(s, prize, s.here);
      out.tell(`As the place mat is moved, a ${objDef(prize).desc} falls from it and onto the floor.`);
      s.gvars['MATOBJ'] = null;
      s.gflags['MUD-FLAG'] = false;
      return true;
    }
    return false;
  },

  'GLOBAL-PALANTIRS': (ctx) => {
    if (ctx.verb === 'break') { ctx.out.tell('The sphere is unbreakable.'); return true; }
    return false;
  },

  // --- the well -------------------------------------------------------------
  // BUCKET-FCN (2actions.zil:832). The bucket is a lift, and water is what
  // makes it go: put water in it and it rises, let the water evaporate and it
  // comes back down. Riding it is the only way up to the Tea Room.
  'BUCKET-FCN': (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'burn' && ctx.dobj === 'BUCKET') {
      out.tell("The bucket is fireproof, and won't burn.");
      return true;
    }
    if ((ctx.verb === 'drop' || ctx.verb === 'put')
        && (ctx.dobj === 'WATER' || ctx.dobj === 'SALTY-WATER')
        && ctx.iobj === 'BUCKET'
        && s.locs['BUCKET'] === 'WELL-BOTTOM'
        && playerVehicle(s) !== 'BUCKET') {
      out.tell('The bucket swiftly rises up, and is gone.');
      moveObj(s, 'BUCKET', 'WELL-TOP');
      moveObj(s, ctx.dobj, 'BUCKET');
      s.gflags['BUCKET-TOP-FLAG'] = true;
      ctx.queue('I-BUCKET', 100);
      return true;
    }
    if (ctx.verb === 'climb') { ctx.perform('enter', 'BUCKET'); return true; }
    return false;
  },

  // WATER-FCN (2actions.zil:760). Water can only be held in the teapot; every
  // other container leaks, and your hands are worse.
  'WATER-FCN': (ctx) => {
    const { s, out } = ctx;
    const vehicle = playerVehicle(s);
    const puddle = (av: string, w: string): boolean => {
      out.tell(`There is now a puddle in the bottom of the ${objDef(av).desc}.`);
      moveObj(s, w, av);
      return true;
    };
    const real = (o?: string): string =>
      (o === 'GLOBAL-WATER' ? (s.here === 'POOL-ROOM' ? 'SALTY-WATER' : 'WATER') : (o ?? 'WATER'));

    if (ctx.verb === 'fill' && ctx.iobj) {
      // "fill teapot with water" is "put water in teapot" (WATER-FCN's FILL arm).
      ctx.perform('put', real(ctx.dobj), ctx.iobj);
      return true;
    }
    const w = real(ctx.dobj);
    if (ctx.verb === 'take' || ctx.verb === 'put') {
      if (vehicle && (ctx.iobj === vehicle || (!ctx.iobj && s.locs[w] !== vehicle))) return puddle(vehicle, w);
      if (ctx.iobj && ctx.iobj !== 'TEAPOT') {
        out.tell(`The water leaks out of the ${objDef(ctx.iobj).desc} and evaporates immediately.`);
        removeObj(s, w);
        return true;
      }
      if (inPlayer(s, 'TEAPOT')) {
        if (contents(s, 'TEAPOT').length) { out.tell("The teapot isn't currently empty."); return true; }
        moveObj(s, s.here === 'POOL-ROOM' ? 'SALTY-WATER' : 'WATER', 'TEAPOT');
        out.tell('The teapot is now full of water.');
        return true;
      }
      if (s.locs[w] === 'TEAPOT' && ctx.verb === 'take' && !ctx.iobj) {
        ctx.perform('take', 'TEAPOT');
        return true;
      }
      out.tell('The water slips through your fingers.');
      return true;
    }
    // POUR X IN Y is a DROP with an indirect object (gsyntax.zil:370), which
    // is how the water gets out of the teapot and into the bucket.
    if (ctx.verb === 'drop' || ctx.verb === 'give' || ctx.verb === 'pour') {
      if (!inPlayer(s, w)) { out.tell("You don't have any water."); return true; }
      removeObj(s, w);
      if (vehicle) return puddle(vehicle, w);
      out.tell('The water spills to the floor and evaporates.');
      return true;
    }
    if (ctx.verb === 'throw') {
      out.tell('The water splashes on the walls and evaporates.');
      removeObj(s, w);
      return true;
    }
    return false;
  },

  'WELL-FCN': (ctx) => {
    const { s, out } = ctx;
    const d = ctx.dobj;
    if (d && fset$(s, d, 'TAKEBIT') && (ctx.verb === 'throw' || ctx.verb === 'put' || ctx.verb === 'drop')) {
      out.tell(`The ${objDef(d).desc} is now sitting at the bottom of the well.`);
      moveObj(s, d, 'WELL-BOTTOM');
      return true;
    }
    if (ctx.verb === 'climb' || ctx.verb === 'climb-down') {
      out.tell("You can't climb the well.");
      return true;
    }
    return false;
  },

  'TOP-ETCHINGS-F': (ctx) => {
    if (ctx.verb !== 'examine' && ctx.verb !== 'read') return false;
    ctx.out.tell([
      '       o  b  o',
      '   r             z',
      'f   M  A  G  I  C   z',
      'c    W  E   L  L    y',
      '   o             n',
      '       m  p  a',
    ].join('\n'), 'system');
    return true;
  },

  'BOTTOM-ETCHINGS-F': (ctx) => {
    if (ctx.verb !== 'examine' && ctx.verb !== 'read') return false;
    ctx.out.tell([
      '       o  b  o',
      '',
      '       A  G  I',
      '        E   L',
      '',
      '       m  p  a',
    ].join('\n'), 'system');
    return true;
  },

  'WISH-FCN': (ctx) => {
    const { s, out } = ctx;
    if (s.here === 'WELL-BOTTOM' && s.locs['COIN'] === 'WELL-BOTTOM') {
      out.tell('A whispering voice replies: "Water makes the bucket go." Unfortunately, wishing makes the coin go....');
      removeObj(s, 'COIN');
    } else {
      out.tell('No one is listening.');
    }
    return true;
  },

  'MOSS-FCN': (ctx) => {
    if (ctx.verb !== 'take' && ctx.verb !== 'touch') return false;
    ctx.out.tell('Some of the moss rubs off on you, but it stops glowing very quickly once plucked from its environment.');
    return true;
  },

  // --- Wonderland -----------------------------------------------------------
  // EATME-FCN / CAKE-FCN (2actions.zil:894). Eat the green cake and the room
  // becomes enormous; eat the blue one to come back. The other two kill you,
  // and the red one, thrown in the pool of tears, evaporates it.
  'EATME-FCN': (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb !== 'eat' || ctx.dobj !== 'EAT-ME-CAKE' || s.here !== 'TEA-ROOM') {
      return cakeCrumble(ctx);
    }
    out.tell('Suddenly, the room appears to have become very large (although everything you are carrying seems to be its normal size).');
    removeObj(s, 'EAT-ME-CAKE');
    fset(s, 'ROBOT', 'INVISIBLE');
    fset(s, 'ALICE-TABLE', 'INVISIBLE');
    // Everything loose in the room is now far too big to pick up.
    for (const o of contents(s, s.here)) {
      if (o === PLAYER || !fset$(s, o, 'TAKEBIT')) continue;
      fset(s, o, 'NONLANDBIT');
      fset(s, o, 'TRYTAKEBIT');
      moveObj(s, o, 'POSTS-ROOM');
    }
    out.emit({ type: 'sfx', name: 'z2-cake-bite' });
    out.emit({ type: 'panel', key: 'events/z2-ev-cake-shrink' });
    ctx.moveTo('POSTS-ROOM', true);
    return true;
  },

  'CAKE-FCN': (ctx) => {
    const { s, out } = ctx;
    const d = ctx.dobj;
    if (!d) return false;
    const WONDERLAND = ['TEA-ROOM', 'POSTS-ROOM', 'POOL-ROOM'];

    if (ctx.verb === 'read') {
      if (fset$(s, d, 'NONLANDBIT')) {
        out.tell('The cake is much too tall now for you to read the lettering.');
      } else if (ctx.iobj === 'FLASK') {
        // The flask is a lens: only through it are the letters legible.
        const word = d === 'RED-ICING' ? 'Evaporate' : d === 'ORANGE-ICING' ? 'Explode' : 'Enlarge';
        out.tell(`The letters, now visible, say "${word}".`);
      } else if (ctx.iobj) {
        out.tell("You can't see through that!");
      } else {
        out.tell('The first letter is a capital E. The rest is too small to read.');
      }
      return true;
    }
    if (ctx.verb === 'eat' && WONDERLAND.includes(s.here)) {
      if (d === 'ORANGE-ICING') { removeObj(s, d); iceBoom(ctx); return true; }
      if (d === 'RED-ICING') {
        removeObj(s, d);
        jigsUp(ctx, 'That was delicious, but your dying memory is of feeling horribly dehydrated and thirsty.', {});
        return true;
      }
      if (d === 'BLUE-ICING') {
        removeObj(s, d);
        out.tell('The room around you seems to be getting smaller.');
        if (s.here !== 'POSTS-ROOM') {
          jigsUp(ctx, 'The room seems to have become too small to hold you. The walls are not as compressible as your body, which is demolished.', {});
          return true;
        }
        fclear(s, 'ROBOT', 'INVISIBLE');
        fclear(s, 'ALICE-TABLE', 'INVISIBLE');
        fset(s, 'POSTS', 'INVISIBLE');
        for (const o of contents(s, s.here)) {
          if (o === PLAYER || !fset$(s, o, 'TAKEBIT')) continue;
          fclear(s, o, 'NONLANDBIT');
          fclear(s, o, 'TRYTAKEBIT');
          moveObj(s, o, 'TEA-ROOM');
        }
        ctx.moveTo('TEA-ROOM', true);
        return true;
      }
    }
    if ((ctx.verb === 'throw' || ctx.verb === 'put') && d === 'ORANGE-ICING' && WONDERLAND.includes(s.here)) {
      removeObj(s, d);
      iceBoom(ctx);
      return true;
    }
    if ((ctx.verb === 'throw' || ctx.verb === 'put') && ctx.iobj === 'POOL'
        && (d === 'RED-ICING' || d === 'BLUE-ICING' || d === 'ORANGE-ICING')) {
      if (d !== 'RED-ICING') {
        out.tell('The cake sinks majestically into the pool.');
        removeObj(s, d);
        return true;
      }
      moveObj(s, d, s.here);
      removeObj(s, 'POOL');
      s.gflags['EVAPORATED'] = true;
      out.tell('Most of the pool evaporates, revealing a (slightly damp but still valuable) package of rare candies. The red cake must be pretty strong stuff, since it remains intact!');
      fclear(s, 'CANDY', 'INVISIBLE');
      return true;
    }
    return cakeCrumble(ctx);
  },

  'POOL-FCN': (ctx) => {
    const { out } = ctx;
    if (ctx.verb === 'drink') { out.tell('The water is extremely salty.'); return true; }
    if (ctx.verb === 'look-under') {
      out.tell("You'd probably have to enter the pool to see what's below the surface.");
      return true;
    }
    if (ctx.verb === 'enter' || ctx.verb === 'swim') {
      jigsUp(ctx, 'You enter the pool, thrash around for a good while, and then drown. Sad, but true.', {});
      return true;
    }
    return false;
  },

  'FLASK-FCN': (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'look-in') {
      out.tell('You notice that objects behind the flask appear to be magnified. You might try looking at something through the flask.');
      return true;
    }
    if (ctx.verb === 'read' && ctx.iobj === 'FLASK') {
      out.tell(`The flask distorts and magnifies the ${objDef(ctx.dobj ?? '').desc}, showing details not noticed earlier.`);
      return false; // and then the object's own READ arm runs
    }
    if (ctx.verb === 'open') {
      mungRoom(s, s.here, 'Noxious vapors prevent your entry.');
      jigsUp(ctx, FATAL_VAPORS, {});
      return true;
    }
    if (ctx.verb === 'break' || ctx.verb === 'throw') {
      out.tell('The flask breaks into pieces.');
      removeObj(s, ctx.dobj ?? 'FLASK');
      out.emit({ type: 'sfx', name: 'z2-aquarium-break' });
      jigsUp(ctx, FATAL_VAPORS, {});
      return true;
    }
    return false;
  },

  // --- the demon ------------------------------------------------------------
  // PENTAGRAM-FCN (2actions.zil:3375). The black sphere on the pentagram is
  // what lets the Wizard's own demon out, and he takes you for his new master.
  'PENTAGRAM-FCN': (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'enter') {
      out.tell('You try to enter the pentagram, but are forced back by an invisible power.');
      return true;
    }
    if (ctx.verb === 'put' && ctx.dobj === 'PALANTIR-4' && ctx.iobj === 'PENTAGRAM') {
      removeObj(s, 'PALANTIR-4');
      fclear(s, 'GENIE', 'INVISIBLE');
      moveObj(s, 'GENIE', 'PENTAGRAM-ROOM');
      out.tell('A cold wind blows outward from the sphere. The candles flicker, and a low moan, almost inaudible, is heard. It rises in volume and pitch until it becomes a high-pitched keening. A dim shape becomes visible in the air above the sphere. The shape resolves into a large and somewhat formidable looking demon. He looks around, tests the walls of the pentagram experimentally, then sees you! "Hmm, a new master..." he says under his breath. "Greetings, oh master! Wouldst desire a service, as our contract stateth? For some pittance of wealth, some trifle, I will gratify thy desires to the utmost limit of my powers, and they are not inconsiderable." He makes a pass with his massive arms and the walls begin to shake a little. Another pass and the shaking stops. "A nice effect... I find it makes for a better relationship to give such a demonstration early on." He grins vilely.');
      out.emit({ type: 'panel', key: 'events/z2-ev-demon-summoned' });
      out.emit({ type: 'sfx', name: 'z2-demon-speak' });
      return true;
    }
    return false;
  },

  // GENIE-FCN (2actions.zil:3177). He will do exactly one thing, and only once
  // his fee is paid: every treasure in the game bar the spheres, the candy,
  // the collar and the wand itself.
  'GENIE-FCN': (ctx) => {
    const { s, out } = ctx;
    const leaves = (noisy = true): boolean => {
      fset(s, 'GENIE', 'INVISIBLE');
      removeObj(s, 'GENIE');
      if (noisy) out.tell('The genie departs, his agreement fulfilled.');
      return true;
    };
    if (ctx.verb === 'hello') { out.tell('The genie grins demonically, but says nothing.'); return true; }

    if (ctx.winner === 'GENIE') {
      if (!s.gflags['GENIE-READY']) {
        out.tell('"My fee is not paid! I perform no tasks for free! We demons have a strong union these days."');
        return true;
      }
      const d = ctx.dobj;
      if (ctx.verb === 'move' && (d === 'GLOBAL-MENHIR' || d === 'MENHIR')) {
        s.gflags['MENHIR-POSITION'] = true;
        out.tell('The demon is gone for a moment. "A trifle... My little finger alone was enough."');
        return leaves();
      }
      if (ctx.verb === 'take') {
        if (d === 'GLOBAL-MENHIR' || d === 'MENHIR') {
          removeObj(s, 'MENHIR');
          s.gflags['MENHIR-POSITION'] = true;
          out.tell('The demon flashes away for a second. "I have little use for such a thing, but perhaps as a doorstop..."');
          return leaves();
        }
        if (d === 'WAND') {
          out.tell('"This I do gladly, oh fool!" cackles the demon gleefully. He stretches out an enormous hand towards the wand and taking it like a toothpick (this is a large demon), points it at himself. "Free!" he commands, and the demon and his wand vanish forever.');
          leaves(false);
          removeObj(s, 'WAND');
          return true;
        }
        if (d && fset$(s, d, 'TAKEBIT')) {
          leaves(false);
          removeObj(s, d);
          out.tell(`The demon snaps his fingers, the ${objDef(d).desc} spins wildly in the air in front of him, then he and it depart.`);
          return true;
        }
        out.tell('"I fear that I cannot take such a thing."');
        return true;
      }
      if (ctx.verb === 'give' && ctx.iobj === 'ME') {
        if (d === 'WAND') {
          // The whole game turns on this line.
          out.tell('"I hear and obey!" says the demon. He stretches out an enormous hand towards the wand. The Wizard is unsure what to do, pointing it threateningly at the demon, then at you. "Fudge!" he cries, but aside from a strong odor of chocolate in the air, there is no effect. The demon plucks the wand out of his hand (it\'s about toothpick-size to him) and gingerly lays it before you. He fades into the smoke, which disperses. The wizard runs from the room in terror.');
          removeObj(s, 'WIZARD');
          leaves(false);
          fclear(s, 'WAND', 'NDESCBIT');
          moveObj(s, 'WAND', s.here);
          out.emit({ type: 'panel', key: 'events/z2-ev-wand-taken' });
          return true;
        }
        if (d === 'GLOBAL-MENHIR' || d === 'MENHIR') {
          moveObj(s, 'MENHIR', 'PENTAGRAM-ROOM');
          fclear(s, 'MENHIR', 'NDESCBIT');
          fclear(s, 'MENHIR', 'TAKEBIT');
          s.gflags['MENHIR-POSITION'] = true;
          out.tell('He waves his hands, and the menhir drops softly at your feet.');
          return leaves();
        }
        if (d && fset$(s, d, 'TAKEBIT')) {
          moveObj(s, d, 'PENTAGRAM-ROOM');
          out.tell(`The ${objDef(d).desc} appears before you and settles to the ground.`);
          return leaves();
        }
        out.tell('"Were it possible, this would be my fondest wish, but alas..."');
        return true;
      }
      if (ctx.verb === 'attack') {
        if (d === 'GLOBAL-CERBERUS' || d === 'CERBERUS') {
          out.tell('"This may prove taxing, but we\'ll see. Perhaps I\'ll tame him for a pup instead." The demon disappears for an instant, then reappears. He looks rather gnawed and scratched. He winces. "Too much for me. Puppy dog, indeed. You\'re welcome to him. Never did like dogs anyway... Any other orders, oh beneficent one?"');
          return true;
        }
        if (d === 'WIZARD') {
          out.tell('The demon grins hideously. "This has been my desire e\'er since this charlatan bent me to his service. I perform this deed with pleasure!" The demon forms himself back into a cloud of greasy smoke. The cloud envelops the Wizard, who waves his wand fruitlessly, mumbling various phrases which begin with "F". A horrible scream is heard, and the smoke begins to clear. Nothing remains of the Wizard but his wand.');
          removeObj(s, 'WIZARD');
          fclear(s, 'WAND', 'NDESCBIT');
          moveObj(s, 'WAND', s.here);
          out.emit({ type: 'panel', key: 'events/z2-ev-wand-taken' });
          return leaves();
        }
        if (d === 'ME' || d === 'ADVENTURER') {
          leaves(false);
          jigsUp(ctx, '"Foolish mortal, if you insist..." The demon crushes you with one blow of his enormous hand.', {});
          return true;
        }
        out.tell(`"I know no way to kill a ${objDef(d ?? '')?.desc ?? 'thing'}."`);
        return true;
      }
      if (ctx.verb === 'examine' || ctx.verb === 'find') {
        out.tell(`"I am not permitted to ${ctx.verb === 'find' ? 'answer questions' : 'perform such menial tasks'}. The terms of my contract are explicit on this matter, learned one. Surely you would not wish to violate my contract?" He licks his lips with a forked tongue like a snake's. "The penalty clauses are ... hmm ... devilish."`);
        return true;
      }
      out.tell('"Apologies, oh master, but even for such a one as I this is not possible." He seems somewhat chagrined to have to admit this.');
      return true;
    }

    if (ctx.verb === 'attack' || ctx.verb === 'break') {
      out.tell('The demon laughs uproariously.');
      return true;
    }
    if (ctx.verb === 'give' && ctx.iobj === 'GENIE') {
      let gift = ctx.dobj;
      if (!gift) return false;
      if (gift === 'IRON-BOX' && s.locs['VIOLIN'] === 'IRON-BOX') {
        out.tell(`The genie frowns briefly, then ${fset$(s, gift, 'OPENBIT') ? 'looks inside' : 'opens'} the box. He smiles horribly.`);
        removeObj(s, 'IRON-BOX');
        gift = 'VIOLIN';
      }
      if (isBomb(ctx, gift)) {
        out.tell('"I fear that this violates my contract, oh foolish one. Thus, I am free to depart."');
        return leaves(false);
      }
      if (objDef(gift)?.value && gift !== 'SWORD') {
        removeObj(s, gift);
        s.counters.genieHoard = (s.counters.genieHoard ?? 0) + 1;
        s.counters.score += 2;
        out.emit({ type: 'score', score: s.counters.score, moves: s.counters.moves });
        const hoard = s.counters.genieHoard + caseWorth(s);
        if (hoard >= TREASURES_MAX) {
          s.gflags['GENIE-READY'] = true;
          out.tell('"This will do for my fee. \'Tis a paltry hoard, but as you have done me a small service by loosing me from this wizard, it will suffice."');
        } else {
          out.tell(`"${GENIE_THANKS[Math.min(hoard, GENIE_THANKS.length) - 1]}"`);
          if (hoard === 8) out.tell('The Wizard looks at you as if you are a madman. He tears his beard and stares at you fearfully.');
        }
        return true;
      }
      removeObj(s, gift);
      out.tell(`The demon gladly takes the ${objDef(gift).desc} and smiles balefully, revealing enormous fangs.`);
      return true;
    }
    return false;
  },

  // WIZARD-FCN (2actions.zil:3399) — the Wizard as something you can address,
  // rather than the daemon that torments you.
  'WIZARD-FCN': (ctx) => {
    const { s, out } = ctx;
    if (ctx.winner === 'WIZARD') {
      out.tell(ctx.verb === 'give'
        ? 'The Wizard replies "Foolishment!"'
        : 'The Wizard considers your statement carefully. His expression indicates he regards it as fanciful.');
      return true;
    }
    if (ctx.verb === 'give' && ctx.iobj === 'WIZARD' && ctx.dobj) {
      const gift = ctx.dobj;
      const wasLit = roomLit(s);
      if (isBomb(ctx, gift)) {
        removeObj(s, gift);
        if (s.locs['GENIE'] === 'PENTAGRAM-ROOM') {
          moveObj(s, gift, s.here);
          out.tell('The wizard accepts this final folly resignedly.');
        } else {
          removeObj(s, 'WIZARD');
          out.tell('"Hmm..." The Wizard mutters something, then waves his wand over the bomb. It transforms into a bouquet of flowers. Both Wizard and flowers disappear.');
        }
        return true;
      }
      removeObj(s, gift);
      out.tell(wasLit && !roomLit(s)
        ? `"Thank you." As the Wizard places the ${objDef(gift).desc} under his robe, the room becomes dark.`
        : '"Thank you."');
      return true;
    }
    if (ctx.verb === 'hello') {
      out.tell('The Wizard seems surprised, much as you might be if a dog talked.');
      return true;
    }
    if (ctx.verb === 'attack' || ctx.verb === 'break') {
      removeObj(s, 'WIZARD');
      out.tell(s.locs['WAND'] === 'WIZARD'
        ? 'The Wizard retreats, waving his wand and chanting. He says "Fear!"'
        : 'The Wizard tries to cast the "Fear!" spell, but without his wand!');
      if (!fset$(s, 'GENIE', 'INVISIBLE')) {
        out.tell('Nothing happens! With a terrified glance at the demon, the wizard runs past you and out of the room.');
        return true;
      }
      out.tell('You are suddenly terrified. The Wizard seems huge and terrible, looming over you. You flee, terrified. He chuckles, snaps his fingers, and disappears.');
      spells.setSpellState(s, { active: 'FEAR' });
      s.gflags['SPELL-ACTIVE'] = true;
      ctx.queue('I-WIZARD', 10);
      return true;
    }
    return false;
  },

  // --- the crystal spheres --------------------------------------------------
  // PALANTIR (2actions.zil). Each sphere is a window onto the room the next
  // one is in; the black one is a window onto the demon watching all of them.
  PALANTIR: (ctx) => {
    const { s, out } = ctx;
    const d = ctx.dobj;
    if (!d) return false;
    if (ctx.verb === 'look-in') {
      out.tell(palantirLook(s, NEXT_SPHERE[d] ?? 'PALANTIR-4', false, ctx.viewRoom));
      out.emit({ type: 'panel', key: 'events/z2-ev-palantir-vision' });
      out.emit({ type: 'sfx', name: 'z2-palantir-hum' });
      return true;
    }
    if (ctx.verb === 'examine') {
      out.tell('There is something misty in the sphere. Perhaps if you were to look into it...');
      return true;
    }
    return false;
  },

  // --- the riddle -----------------------------------------------------------
  'RIDDLE-DOOR-FCN': (ctx) => {
    const { s, out } = ctx;
    const open = fset$(s, 'RIDDLE-DOOR', 'OPENBIT');
    if (ctx.verb === 'open') {
      out.tell(open ? 'It is open!' : 'The door can only be opened by answering the riddle.');
      return true;
    }
    if (ctx.verb === 'close') {
      out.tell(open ? 'Not a chance. The door weighs many tons.' : 'It is closed!');
      return true;
    }
    return false;
  },

  // --- Cerberus -------------------------------------------------------------
  // CERBERUS-FCN (2actions.zil:2298). The dog guarding the tomb is not a fight
  // you can win; it is a dog, and it wants a collar.
  'CERBERUS-FCN': (ctx) => {
    const { s, out } = ctx;
    const leashed = !!s.gflags['CERBERUS-LEASHED'];

    // The wand is aimed at him by the arm below; this only comments on it.
    if ((ctx.verb === 'wave' || ctx.verb === 'touch' || ctx.verb === 'raise') && ctx.dobj === 'WAND') {
      out.tell('The dog looks puzzled.');
      return false;
    }
    if (spells.wandOn(s) && (ctx.verb === 'say' || ctx.verb === 'incant')) return false;

    if (ctx.verb === 'hello') {
      out.tell(leashed ? '"Arf! Arf! Arf!"' : '"Grrrr!"');
      return true;
    }
    if (ctx.verb === 'attack' || ctx.verb === 'break') {
      if (leashed) {
        removeObj(s, 'CERBERUS');
        out.tell('With a quiet bark of disappointment, the creature expires. Its six eyes look at you reproachfully. As it dies, it collapses into a small pile of dust which blows away into nothing.');
      } else if (prob(ctx, 50)) {
        out.emit({ type: 'sfx', name: 'z2-cerberus-growl' });
        jigsUp(ctx, 'The dog-thing snaps at you viciously, and succeeds. Your head, it seems, is only a small mouthful for the poor animal, who is just as hungry afterward.', {});
      } else {
        out.tell('The maddened dog-thing snaps viciously at you.');
      }
      return true;
    }
    if (ctx.verb === 'put' && ctx.dobj === 'COLLAR') {
      moveObj(s, 'COLLAR', 'CERBERUS');
      fset(s, 'COLLAR', 'NDESCBIT');
      fset(s, 'COLLAR', 'TRYTAKEBIT');
      s.gflags['CERBERUS-LEASHED'] = true;
      out.tell('The creature whines happily, then the center head licks your face (which is roughly like experiencing a sandpaper washcloth). The other two heads look about, as though the monster felt a sudden need to find a pair of slippers somewhere. Its huge tail wags enthusiastically, knocking small rocks around and almost blowing you over from the breeze it creates.');
      out.emit({ type: 'panel', key: 'events/z2-ev-guardians-pass' });
      return true;
    }
    if (ctx.verb === 'enchant') {
      const used = spells.spellUsedWord(s);
      if (used === 'FLOAT') {
        spells.setSpellHandled(s, true);
        out.tell('The huge dog rises about an inch off the ground, for a moment.');
        return true;
      }
      if (used === 'FIERCE') {
        spells.setSpellHandled(s, true);
        jigsUp(ctx, 'Cerberus tears you limb from limb! What ferocity!', {});
        return true;
      }
      if (used === 'FEEBLE') {
        out.tell('What an effect! He now has the strength of just one elephant, rather than ten!');
        return true;
      }
      return false;
    }
    if (!leashed) {
      out.tell('The three-headed dog snaps at you viciously!');
      return true;
    }
    if (ctx.verb === 'touch') {
      out.tell('The dog is now insanely happy, slobbering all over the place and whining with uncontained doggish joy.');
      return true;
    }
    return false;
  },

  'COLLAR-FCN': (ctx) => {
    const { s } = ctx;
    if (ctx.verb === 'take' && s.gflags['CERBERUS-LEASHED']) {
      jigsUp(ctx, "That wasn't such a good idea. The creature was enjoying being your pet. As you unfasten the collar, the disappointed monster hound begins to growl, and then its three fang-crammed mouths rend you into little doggy biscuits.", {});
      return true;
    }
    if (ctx.verb === 'enchant' && spells.spellUsedWord(s) === 'FLOAT') {
      ctx.perform('enchant', 'CERBERUS');
      return true;
    }
    return false;
  },

  // --- the princess ---------------------------------------------------------
  // CHEST-FCN (2actions.zil:2671). Rummaging in the dragon's chest is the other
  // way to wake her, and the rusty hinges only give one time in four.
  'CHEST-FCN': (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb !== 'open' || s.gflags['CHEST-TRIED']) return false;
    const asleep = s.locs['PRINCESS'] === s.here && !s.gflags['PRINCESS-AWAKE'];
    if (prob(ctx, 25)) {
      fset(s, 'CHEST', 'OPENBIT');
      out.tell('Opened.');
      if (asleep) out.tell('The opening of the squeaky lid startles the young woman.');
    } else {
      out.tell('The hinges are very rusty, but they seem to be starting to give. You can probably open it if you try again. There is something bumping around inside.'
        + (asleep ? ' All this rummaging around has startled the young woman.' : ''));
    }
    s.gflags['CHEST-TRIED'] = true;
    if (asleep) ctx.perform('alarm', 'PRINCESS');
    return true;
  },

  'PRINCESS-FCN': (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'follow') {
      if (s.locs['PRINCESS'] === s.here) out.tell("You can't follow her until she leaves...");
      else if (s.gvars['PRFOLLOW']) ctx.walk(s.gvars['PRFOLLOW']!);
      else out.tell('I seem to have lost track of her.');
      return true;
    }
    if (s.locs['PRINCESS'] !== s.here) { out.tell('There is no princess here.'); return true; }

    if (ctx.verb === 'attack' || ctx.verb === 'break') {
      removeObj(s, 'PRINCESS');
      out.tell('The princess screams as you approach. "Won\'t someone deliver me from this awful fate?" she cries. '
        + (s.locs['WIZARD'] === s.here
          ? 'Shocked, the Wizard of Frobozz turns toward you.'
          : 'Just in time, the Wizard of Frobozz appears, seeming to unroll himself out of nothing like a window shade.')
        + ' "Fry!" he intones, and a massive bolt of lightning reduces you to a pile of smoking ashes. (Serves you right, too, if you ask me.)');
      jigsUp(ctx, '', {});
      return true;
    }
    const spokenTo = ctx.verb === 'hello' || ctx.verb === 'say' || ctx.verb === 'alarm'
      || ctx.verb === 'kiss' || ctx.verb === 'examine' || ctx.verb === 'touch';
    if (spokenTo) {
      if (s.locs['PRINCESS'] === 'DRAGON-LAIR' && !ctx.enabled('I-PRINCESS')) {
        ctx.queue('I-PRINCESS', 2);
        s.gflags['PRINCESS-AWAKE'] = true;
        out.tell('The princess (for she is obviously one) shakes herself awake, then notices you for the first time. She smiles. "Thank you for rescuing me from that horrid worm," she says. "I must depart. My parents will be worried about me." With that, she arises, looking purposefully out of the lair.');
        out.emit({ type: 'panel', key: 'events/z2-ev-princess-wakes' });
        return true;
      }
      out.tell('The princess ignores you. She looks about the room, but her eyes fix on the '
        + (s.here === 'GAZEBO-ROOM' ? 'garden outside'
          : s.here === 'GARDEN-NORTH' ? 'gazebo'
          : s.here === 'RAVINE-LEDGE' ? 'ledge'
          : PRINCESS_ROUTE[Math.min(s.counters.prCount ?? 0, PRINCESS_ROUTE.length - 1)].walks) + '.');
      return true;
    }
    if (!s.gflags['PRINCESS-AWAKE']) { out.tell("She's in a trance!"); return true; }
    return false;
  },

  // --- the unicorn ----------------------------------------------------------
  'UNICORN-FCN': (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'hello') {
      out.tell('The unicorn listens distractedly, then goes back to cropping grass.');
      return true;
    }
    if (ctx.verb === 'follow') { out.tell('The unicorn shies away as you approach.'); return true; }
    if (ctx.verb === 'examine') {
      out.tell(ctx.dobj === 'UNICORN'
        ? "The unicorn shies away as you approach for a closer look, but you do notice a tiny gold key hanging from a red satin ribbon looped around the animal's neck."
        : 'The unicorn shies away as you approach.');
      return true;
    }
    if (['take', 'put', 'touch', 'break', 'attack'].includes(ctx.verb)) {
      removeObj(s, 'UNICORN');
      s.gflags['UNICORN-FRIGHTENED'] = true;
      out.tell('The unicorn, unsurprised by this evidence that you are indeed the uncouth sort of vagabond it suspected you were, melts into the hedges and is gone.');
      return true;
    }
    return false;
  },

  'GLOBAL-UNICORN-FCN': (ctx) => {
    const { s, out } = ctx;
    if (s.locs['UNICORN'] === 'GARDEN-NORTH') {
      out.tell('The unicorn is way up at the north end of the garden.');
    } else if (ctx.verb === 'follow') {
      out.tell(fset$(s, 'UNICORN', 'TOUCHBIT')
        ? "I don't know where it is now."
        : 'The unicorn is a mythical beast.');
    } else {
      out.tell('Unicorn? What unicorn?');
    }
    return true;
  },

  'GAZEBO-FCN': (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'enter') {
      if (s.here === 'GARDEN-NORTH') { ctx.walk('IN'); return true; }
      if (s.here === 'GAZEBO-ROOM') { out.tell("You're already in it."); return true; }
    }
    if (ctx.verb === 'exit' && s.here === 'GAZEBO-ROOM') { ctx.walk('OUT'); return true; }
    return false;
  },

  // --- the Wizard's wand ----------------------------------------------------
  // WAND-FCN (2actions.zil). Waving the wand at something aims it; the word
  // comes afterwards. It will not aim twice without recharging, and trying
  // has a small chance of ending the game very strangely indeed.
  'WAND-FCN': (ctx) => {
    const { s, out } = ctx;
    if ((ctx.verb === 'take' || ctx.verb === 'put' || ctx.verb === 'give') && s.locs['WAND'] === 'WIZARD') {
      out.tell('The Wizard snatches it away.');
      return true;
    }
    if (ctx.verb === 'wave' && ctx.iobj === 'GRUE') {
      out.tell('There is no grue in sight, but a hissing sound issues forth from the darkness.');
      return true;
    }
    if (ctx.verb !== 'wave' && ctx.verb !== 'touch' && ctx.verb !== 'raise') return false;

    if (ctx.dobj === 'WAND' && !inPlayer(s, 'WAND')) {
      out.tell("You don't have the wand!");
      return true;
    }
    if (spells.wandOn(s) || spells.spellUsedWord(s) || spells.spellVictim(s)) {
      if (prob(ctx, 5)) {
        jigsUp(ctx, 'The wand was still recharging from its last use. It discharges magic all over everything. You turn into a toad, the room fills with a fetid smell, and all sorts of other grubby things happen. Then the wand explodes!', {});
      } else {
        out.tell('A lot you know about magic! A magic wand takes a while to recharge after use! You might cause it to short-circuit!');
      }
      return true;
    }
    if (ctx.verb === 'raise') {
      out.tell('The wand grows warm and seems to vibrate.');
      return true;
    }
    let target: string | null = null;
    if (ctx.verb === 'wave') {
      if (ctx.dobj === 'WAND' && ctx.iobj) target = ctx.iobj;
      else { out.tell('At what?'); return true; }
    } else {
      // "rub the X with the wand" aims it just as well.
      if (ctx.iobj === 'WAND' && ctx.dobj) target = ctx.dobj;
      else { out.tell('Touch what?'); return true; }
    }
    spells.setSpellState(s, { wandOn: target, used: null, victim: null });
    if (target === 'ME' || target === 'ADVENTURER' || target === 'WAND') {
      spells.setSpellState(s, { wandOn: null });
      out.tell('Fortunately a safety interlock prevents the fatal feedback loop that this would cause.');
      return true;
    }
    s.gvars['WAND-ON-LOC'] = s.here;
    out.tell(`The wand grows warm, the ${objDef(target).desc} seems to glow dimly with magical essences, and you feel suffused with power.`);
    out.emit({ type: 'sfx', name: 'z2-spell-onset' });
    ctx.queue('I-WAND', 2);
    return true;
  },

  // --- the balloon ----------------------------------------------------------
  // BALLOON-FCN's M-LOOK and M-OBJDESC arms live in specialDescs and its M-BEG
  // arm in beforeAction below; nothing is left for the object table.

  // BCONTENTS (2actions.zil:334) — the bag, the receptacle and the wire are
  // parts of the basket, not objects you can pocket.
  'BCONTENTS': (ctx) => {
    const { s, out } = ctx;
    const d = ctx.dobj;
    if (!d) return false;
    if (ctx.verb === 'take') {
      out.tell(`The ${objDef(d).desc} is an integral part of the basket and cannot be removed.`
        + (d === 'BRAIDED-WIRE' ? ' The wire might possibly be tied, though.' : ''));
      return true;
    }
    if (d === 'CLOTH-BAG' && (ctx.verb === 'look-in' || ctx.verb === 'open')) {
      out.tell(ctx.verb === 'open'
        ? 'The bag is enormous. The concept of opening it here is ludicrous.'
        : "It doesn't appear that there's anything inside.");
      return true;
    }
    if (ctx.verb === 'examine' && d === 'RECEPTACLE') {
      out.tell(`The receptacle is ${fset$(s, 'RECEPTACLE', 'OPENBIT') ? 'open.' : 'closed.'}`);
      return true;
    }
    if (ctx.verb === 'examine') {
      out.tell(`The ${objDef(d).desc} is part of the basket. It may be manipulated within the basket but cannot be removed.`);
      return true;
    }
    return false;
  },

  // WIRE-FCN (2actions.zil:353) — tying up is what stops the balloon drifting.
  'WIRE-FCN': (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'take' || ctx.verb === 'examine') return OBJ_ROUTINES['BCONTENTS'](ctx);
    if (ctx.verb === 'tie') {
      if (ctx.dobj !== 'BRAIDED-WIRE' || (ctx.iobj !== 'HOOK-1' && ctx.iobj !== 'HOOK-2')) return false;
      s.gvars['BTIE-FLAG'] = ctx.iobj;
      fset(s, ctx.iobj, 'NDESCBIT');
      ctx.disable('I-BALLOON');
      out.tell('The balloon is fastened to the hook.');
      return true;
    }
    if (ctx.verb === 'untie' && ctx.dobj === 'BRAIDED-WIRE') {
      const hook = s.gvars['BTIE-FLAG'];
      if (!hook) { out.tell('The wire is not tied to anything.'); return true; }
      ctx.queue('I-BALLOON', 3);
      fclear(s, hook, 'NDESCBIT');
      s.gvars['BTIE-FLAG'] = null;
      out.tell('The wire falls off of the hook.');
      return true;
    }
    return false;
  },

  // --- the Bank of Zork -----------------------------------------------------
  'SCOL-OBJECT': (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'enter') {
      // V-THROUGH's Zork II arm (gverbs.zil): the curtain only goes somewhere
      // if it currently leads somewhere.
      if (s.gvars['SCOL-ROOM']) { scolGo(ctx, null); return true; }
      out.tell("You can't go more than part way through the curtain.");
      return true;
    }
    return curtainAction(ctx);
  },

  'SCOLWALL': (ctx) => {
    const { s, out } = ctx;
    const wall = ctx.verb === 'enter' ? ctx.dobj : ctx.iobj;
    if (!wall) return false;
    const here = SCOL_WALLS[s.here];

    if (ctx.verb === 'enter') {
      // The depository's north wall is the curtain seen from the other side.
      if (s.here === 'DEPOSITORY' && wall === 'SNWL' && s.gvars['SCOL-ROOM']) {
        scolGo(ctx, null);
        return true;
      }
      if (here && wall === here[0] && s.here === s.gvars['SCOL-ACTIVE']) {
        s.gvars['SCOL-ROOM'] = here[1];
        scolThrough(ctx, 0, 'DEPOSITORY');
        return true;
      }
      out.tell(`You hit your head against the ${objDef(wall).desc} as you attempt this feat.`);
      return true;
    }
    // SCOLWALL: throwing something at the live wall puts it in the depository.
    if (here && wall === here[0] && s.here === s.gvars['SCOL-ACTIVE']) {
      if (ctx.verb === 'throw' || ctx.verb === 'put') {
        if (!ctx.dobj) return false;
        if (!inPlayer(s, ctx.dobj)) { out.tell("You don't have that!"); return true; }
        scolObj(ctx, ctx.dobj, 0, 'DEPOSITORY');
        return true;
      }
      return curtainAction(ctx, wall);
    }
    return false;
  },

  'BILLS-OBJECT': (ctx) => {
    ctx.s.gflags['BANK-SOLVE-FLAG'] = true;
    if (ctx.verb === 'burn') {
      ctx.out.tell('Nothing like having money to burn!');
      return false; // and then they burn
    }
    if (ctx.verb === 'eat') {
      ctx.out.tell('Talk about eating rich foods!');
      return true;
    }
    return false;
  },

  'BOX-F': (ctx) => {
    if (ctx.verb === 'take') { ctx.out.tell('The gnome clutches it possessively.'); return true; }
    return false;
  },

  'ZGNOME-FCN': (ctx) => {
    const { s, out } = ctx;
    const gift = ctx.dobj;
    if ((ctx.verb === 'give' || ctx.verb === 'throw') && ctx.iobj === 'GNOME-OF-ZURICH' && gift) {
      if (objDef(gift)?.value) {
        out.tell(`The gnome carefully places the ${objDef(gift).desc} in the deposit box. "Let me show you the way out," he says, making it clear he will be pleased to see the last of you. Then, you are momentarily disoriented, and when you recover you are back at the Bank Entrance.`);
        removeObj(s, 'GNOME-OF-ZURICH');
        removeObj(s, gift);
        ctx.disable('I-ZGNOME-OUT');
        ctx.moveTo('BANK-ENTRANCE', true);
        return true;
      }
      if (isBomb(ctx, gift)) {
        removeObj(s, 'GNOME-OF-ZURICH');
        moveObj(s, gift, s.here);
        ctx.disable('I-ZGNOME');
        ctx.disable('I-ZGNOME-OUT');
        out.tell('"You are so very gracious. I really cannot accept." he says. He disappears, a wry smile on his lips.');
        return true;
      }
      out.tell(`"I wouldn't put THAT in a safety deposit box," remarks the gnome with disdain, tossing it over his shoulder, where it disappears with an understated "pop".`);
      removeObj(s, gift);
      return true;
    }
    if (ctx.verb === 'attack') {
      out.tell('The gnome says "Well, I never..." and disappears with a snap of his fingers, leaving you alone.');
      removeObj(s, 'GNOME-OF-ZURICH');
      ctx.disable('I-ZGNOME-OUT');
      return true;
    }
    out.tell('The gnome appears increasingly impatient.');
    return true;
  },

  // --- the dragon ----------------------------------------------------------
  // DRAGON-FCN (2actions.zil:2389). Everything you do to the dragon makes him
  // angrier, and anger is the only thing that will make him follow you — which
  // is the entire puzzle, since the glacier is what has to meet him.
  'DRAGON-FCN': (ctx) => {
    const { s, out } = ctx;
    ctx.queue('I-DRAGON', -1);
    const anger = (n: number) => { s.counters.dragonAnger = (s.counters.dragonAnger ?? 0) + n; };
    const talkedTo = ctx.verb === 'hello' || ctx.verb === 'say' || ctx.verb === 'answer';

    if (talkedTo) {
      out.tell('The dragon looks amused. He speaks in a voice so deep you feel it rather than hear it, but the tongue is unknown to you. You find yourself almost hypnotized.');
      anger(2);
      return true;
    }
    if (ctx.verb === 'examine') {
      out.tell("He turns and looks back at you, his cat's eyes yellow in the gloom. You start to feel weak, and quickly turn away.");
      anger(1);
      return true;
    }
    if (ctx.verb === 'attack' || ctx.verb === 'break' || ctx.verb === 'lamp-on') {
      out.tell(ctx.verb === 'lamp-on' || (ctx.verb === 'attack' && !ctx.iobj)
        ? 'With your bare hands? I doubt the dragon even noticed.'
        : pickOne(ctx, DRAGON_ATTACKS));
      out.emit({ type: 'sfx', name: 'z2-dragon-roar' });
      anger(4);
      return true;
    }
    if (ctx.verb === 'give' && ctx.iobj === 'DRAGON' && ctx.dobj) {
      anger(1);
      if (objDef(ctx.dobj)?.value) {
        moveObj(s, ctx.dobj, 'CHEST');
        out.tell('The dragon is pleased by your gift, excuses himself for a moment, and returns without it.');
      } else if (isBomb(ctx, ctx.dobj)) {
        anger(2);
        removeObj(s, 'BRICK');
        out.tell('The dragon snakes his long red tongue around the bomb and politely swallows it. A few moments later he belches and smoke curls out of his nostrils.');
      } else {
        out.tell('The dragon refuses your gift.');
      }
      return true;
    }
    // The WALK arm is unreachable here: our exits already carry the north exit's
    // own refusal ("The dragon hisses at you and blocks your way"), and walking
    // never consults an object's ACTION.
    return false;
  },

  // --- the crypt and the guardian ------------------------------------------
  'CANDY-FCN': (ctx) => {
    const { out } = ctx;
    if (ctx.verb === 'examine' || ctx.verb === 'read') {
      out.tell([
        '       Frobozz Magic Candy Company',
        '         >>Special Assortment<<',
        '          Candied Grasshoppers',
        '             Chocolated Ants',
        '              Worms Glacee',
        '(By Appointment to His Majesty, Dimwit I)',
      ].join('\n'), 'system');
      return true;
    }
    if (ctx.verb === 'eat' || ctx.verb === 'open') {
      out.tell('Such rich food would probably not be good for you.');
      return true;
    }
    return false;
  },

  'CRYPT-DOOR-FCN': (ctx) =>
    openClose(ctx, 'CRYPT-DOOR', 'The crypt door squeaks open.', 'The crypt door squeaks closed.'),

  'DIM-DOOR-FCN': (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'knock') { out.tell('A hollow echo responds.'); return true; }
    if (ctx.verb === 'open' || ctx.verb === 'close') {
      // The flag is what the room's south exit reads, so it is set before the
      // OPENBIT — an already-open door still counts as open.
      s.gflags['DIM-DOOR-FLAG'] = ctx.verb === 'open';
      return openClose(ctx, 'DIM-DOOR',
        'The secret door opens noiselessly.', 'The secret door closes noiselessly.');
    }
    return false;
  },

  'DOOR-KEEPER-FCN': (ctx) => {
    const { s, out } = ctx;
    const given = ctx.dobj;
    if (ctx.verb === 'alarm' && s.gflags['GUARDIAN-FED']) {
      out.tell("Try as you may, you can't wake it.");
      return true;
    }
    if (ctx.verb === 'give' && ctx.iobj === 'DOOR-KEEPER' && given) {
      if (s.gflags['GUARDIAN-FED']) {
        out.tell('He is asleep, at least for the moment.');
      } else if (given === 'CANDY') {
        s.gflags['GUARDIAN-FED'] = true;
        removeObj(s, 'CANDY');
        out.tell('The guardian greedily wolfs down the candy, including the package. (It seemed to enjoy the grasshoppers particularly.) It then becomes quiet and its eyes close. (Lizards are known to sleep a long time while digesting their meals.)');
        out.emit({ type: 'sfx', name: 'z2-lizard-snap' });
      } else if (given === 'FLASK') {
        out.tell('The lizard sniffs it experimentally, then looks at you angrily, hissing and snapping.');
      } else if (isBomb(ctx, given)) {
        removeObj(s, given);
        out.tell("The guardian greedily wolfs it down. After a while, you hear a very small pop and the guardian's eyes bulge out. It hisses nastily at you.");
      } else if (given === 'PALANTIR-1' || given === 'PALANTIR-2' || given === 'PALANTIR-3') {
        out.tell('The guardian greedily gobbles the sphere, but finds it unchewable. He then tries repeatedly to swallow it whole, with disappointing results. Finally, he spits it on the ground.');
        moveObj(s, given, s.here);
      } else {
        removeObj(s, given);
        out.tell(`The lizard wolfs down the ${objDef(given)?.desc ?? 'thing'}, crunching greedily.`);
      }
      return true;
    }
    if (ctx.verb === 'attack' || ctx.verb === 'break') {
      out.tell("The guardian seems impervious to your attack. In fact, your blows don't even seem to be landing.");
      return true;
    }
    return false;
  },

  'WIZ-DOOR-FCN': (ctx) => {
    const { s, out } = ctx;
    if (!s.gflags['GUARDIAN-FED']) {
      if (ctx.verb === 'open') {
        out.tell('The lizard comes to life and snaps at you as you reach for the handle.');
        return true;
      }
      if (ctx.verb === 'unlock') {
        let tail = '';
        if (ctx.iobj === 'GOLD-KEY' && prob(ctx, 5)) {
          removeObj(s, 'GOLD-KEY');
          tail = ' The guardian does get the key, though. It grins maniacally.';
        } else if (prob(ctx, 20)) {
          moveObj(s, 'GOLD-KEY', s.here);
          tail = ' You drop the key, though.';
        }
        out.tell(`The lizard door keeper comes awake and bites at your hand. You jerk away just in time.${tail}`);
        return true;
      }
      return false;
    }
    if (ctx.verb === 'unlock') {
      if (s.gflags['WIZ-DOOR-FLAG']) out.tell('It is already!');
      else if (ctx.iobj === 'GOLD-KEY') {
        s.gflags['WIZ-DOOR-FLAG'] = true;
        out.tell('The key turns and the bolt clicks. The door is unlocked.');
      } else {
        s.gflags['WIZ-DOOR-FLAG'] = false;
        out.tell("That won't unlock it.");
      }
      return true;
    }
    if (ctx.verb === 'lock') {
      if (!s.gflags['WIZ-DOOR-FLAG']) out.tell('It is locked already.');
      else if (ctx.iobj === 'GOLD-KEY') {
        out.tell('The door is now locked.');
        s.gflags['WIZ-DOOR-FLAG'] = false;
      } else out.tell("That won't lock it.");
      return true;
    }
    if (ctx.verb === 'open' || ctx.verb === 'close') {
      if (s.gflags['WIZ-DOOR-FLAG']) {
        return openClose(ctx, 'WIZ-DOOR', 'The door creaks open.', 'The door reluctantly closes.');
      }
      if (ctx.verb === 'open') { out.tell('The door is locked!'); return true; }
    }
    return false;
  },

  // --- the Wizard's workshop -----------------------------------------------
  'ARCANA-PSEUDO': (ctx) => {
    if (ctx.verb !== 'take') return false;
    ctx.out.tell('The stuff on the bench appears to be so much junk, and you decide that it would only get in your way if you took it.');
    return true;
  },

  'TROPHY-PSEUDO': (ctx) => {
    if (ctx.verb === 'read') return false;
    if (ctx.verb === 'take' || ctx.verb === 'touch') {
      ctx.out.tell('As your fingers near it, you get a nasty shock (but fortunately not a fatal one).');
      return true;
    }
    return false;
  },

  'STAND-FCN': (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'take') {
      out.tell(`The ${objDef(ctx.dobj ?? '')?.desc ?? 'stand'} is firmly attached to the bench.`);
      return true;
    }
    const spheres = ['PALANTIR-1', 'PALANTIR-2', 'PALANTIR-3'];
    const stands = ['STAND-1', 'STAND-2', 'STAND-3'];
    if (ctx.verb === 'put' && ctx.dobj && ctx.iobj
        && spheres.includes(ctx.dobj) && stands.includes(ctx.iobj)) {
      // ZIL calls <V-PUT> itself and returns T, so the shared PUT never runs.
      if (!inPlayer(s, ctx.dobj)) { out.tell(`You don't have ${theName(ctx.dobj)}.`); return true; }
      moveObj(s, ctx.dobj, ctx.iobj);
      out.tell('Done.');
      if (s.locs['PALANTIR-1'] === 'STAND-1'
          && s.locs['PALANTIR-2'] === 'STAND-2'
          && s.locs['PALANTIR-3'] === 'STAND-3') {
        for (const p of spheres) removeObj(s, p);
        moveObj(s, 'STAND-4', 'WORKBENCH');
        out.tell(`As you place the ${objDef(ctx.dobj).desc} in the ${objDef(ctx.iobj).desc}, a low humming noise begins, and you can feel the hairs on the back of your neck begin to stand up. The three spheres begin to vibrate, faster and faster, as the noise becomes higher and higher pitched. Three puffs of smoke, one red, one blue, one white, rise up from empty stands. The spheres are gone! But in the center of the triangle formed by the stands is now a black stand of obsidian in which rests a strange black sphere.`);
        out.emit({ type: 'sfx', name: 'z2-palantir-hum' });
      }
      return true;
    }
    return false;
  },
};

/**
 * BALLOON-FCN's M-BEG arm (2actions.zil:177). While you are in the basket the
 * vehicle sees every command first, which is how the burning fuel stops being
 * an ordinary object you can pick up or list.
 */
export function beforeAction(ctx: Ctx): boolean {
  const { s, out } = ctx;
  // In a vehicle it is the vehicle's M-BEG that runs; otherwise the room's.
  if (playerVehicle(s) !== 'BALLOON') return roomAction(ctx, s.here, 'beg');

  if (ctx.verb === 'open' && s.gvars['BINF-FLAG'] && ctx.dobj === 'RECEPTACLE'
      && contents(s, 'RECEPTACLE').length) {
    out.tell(`Opening it reveals a burning ${objDef(s.gvars['BINF-FLAG']!).desc}.`);
    fset(s, 'RECEPTACLE', 'OPENBIT');
    return true;
  }
  if (ctx.verb === 'take' && ctx.dobj && ctx.dobj === s.gvars['BINF-FLAG']) {
    out.tell(`You don't really want to hold a burning ${objDef(ctx.dobj).desc}.`);
    return true;
  }
  if (ctx.verb === 'put' && ctx.iobj === 'RECEPTACLE') {
    if (contents(s, 'RECEPTACLE').length) { out.tell('The receptacle is already occupied.'); return true; }
    // Whatever goes in stops being listed separately; the basket describes it.
    if (ctx.dobj) fset(s, ctx.dobj, 'NDESCBIT');
    return false;
  }
  if (ctx.verb === 'inflate') {
    out.tell('It takes more than words to inflate a balloon.');
    return true;
  }
  return false;
}

/** PCHECK (2actions.zil) — housekeeping for the two palantir rooms. */
function pcheck(ctx: Ctx, phase: 'enter' | 'end' | 'beg'): boolean {
  const { s } = ctx;
  if (phase !== 'beg' || ctx.verb === 'look') return false;
  s.gflags['PLOOK-FLAG'] = false;
  if (s.locs['KEY'] === 'KEYHOLE-1' || s.locs['KEY'] === 'KEYHOLE-2') fset(s, 'KEY', 'NDESCBIT');
  else fclear(s, 'KEY', 'NDESCBIT');
  if (inPlayer(s, 'PLACE-MAT')) s.gflags['MUD-FLAG'] = false;
  if (s.gflags['MUD-FLAG']) {
    moveObj(s, 'PLACE-MAT', s.here);
    fset(s, 'PLACE-MAT', 'NDESCBIT');
  } else {
    fclear(s, 'PLACE-MAT', 'NDESCBIT');
  }
  return false;
}

// ============================= ROOM ACTIONS ==================================

/**
 * Is the room lit by something other than its own ONBIT? The Crypt asks this
 * question twice a turn: it keeps its own bit set so the player can always act
 * there, and consults the real answer to decide what to describe.
 */
export function litIgnoringRoomBit(s: WorldState, room: string): boolean {
  const had = fset$(s, room, 'ONBIT');
  if (had) fclear(s, room, 'ONBIT');
  const lit = roomLit(s, room);
  if (had) fset(s, room, 'ONBIT');
  return lit;
}

/** DIM-DOOR-APPEARS (2actions.zil). */
export function dimDoorAppears(ctx: Ctx): void {
  ctx.out.tell('It is dark, but on the south wall is a faint outline of a rectangle, as though light were shining around a doorway. You can also make out a faintly glowing letter in the center of this area. It might be an "F".');
  fclear(ctx.s, 'DIM-DOOR', 'INVISIBLE');
  ctx.out.emit({ type: 'panel', key: 'rooms/z2-crypt-dark' });
}

const ROOM_ROUTINES: Record<string, RoomHandler> = {
  // IN-AQUARIUM-FCN (2actions.zil) — climbing into the tank is fatal either
  // way: the serpent eats you, or the broken glass does for you.
  'IN-AQUARIUM-FCN': (ctx, phase) => {
    if (phase !== 'enter') return false;
    jigsUp(ctx, ctx.s.locs['SERPENT'] === 'AQUARIUM'
      ? 'You drop into the aquarium with a splash (which attracts the serpent). He greedily eats you. He\'s just a baby, after all, and needs all the food he can get.'
      : "Oh dear, you have cut yourself severely on the broken glass. I'm afraid you've bled to death.", {});
    return true;
  },

  // PCHECK (2actions.zil): the key only lists itself when it is out of a
  // keyhole, and the place mat stays under the door until you pull it back.
  'TINY-ROOM-FCN': (ctx, phase) => pcheck(ctx, phase),
  'DREARY-ROOM-FCN': (ctx, phase) => pcheck(ctx, phase),

  // POSTS-ROOM-FCN's M-BEG arm: everything in the room is enormous now.
  'POSTS-ROOM-FCN': (ctx, phase) => {
    if (phase !== 'beg' || ctx.verb !== 'take' || !ctx.dobj) return false;
    if (!fset$(ctx.s, ctx.dobj, 'NONLANDBIT')) return false;
    ctx.out.tell(`The ${objDef(ctx.dobj).desc} is now much larger than you are. You have no hope of taking it.`);
    return true;
  },

  // RIDDLE-ROOM-FCN's M-BEG arm (2actions.zil:2007). The answer is a word,
  // not an object, so it arrives through ANSWER/SAY rather than the verb table.
  'RIDDLE-ROOM-FCN': (ctx, phase) => {
    const { s, out } = ctx;
    if (phase !== 'beg') return false;
    if (ctx.verb !== 'answer' && ctx.verb !== 'say') return false;
    if (fset$(s, 'RIDDLE-DOOR', 'OPENBIT')) return false;
    if ((ctx.word ?? '').toLowerCase() === 'well') {
      out.tell('There is a deafening clap of thunder and the stone door quietly swings open to reveal a passageway beyond.');
      out.emit({ type: 'sfx', name: 'z2-riddle-open' });
      s.counters.score += 5;
      out.emit({ type: 'score', score: s.counters.score, moves: s.counters.moves });
      fset(s, 'RIDDLE-DOOR', 'OPENBIT');
    } else {
      out.tell('A hollow laugh seems to come from the stone door.');
    }
    return true;
  },

  // WIZARD-QUARTERS-FCN (2actions.zil). The room redecorates itself every time
  // it is described, and never twice the same way running.
  'WIZARD-QUARTERS-FCN': (ctx, phase) => {
    const { s } = ctx;
    if (phase !== 'enter' && !(phase === 'beg' && ctx.verb === 'look')) return false;
    const last = s.counters.wizQ ?? -1;
    let pick = Math.floor(ctx.rng() * WIZQDESCS.length);
    if (pick === last) pick = pick === WIZQDESCS.length - 1 ? pick - 1 : pick + 1;
    s.counters.wizQ = pick;
    return false;
  },

  // ZORK3-FCN (2actions.zil). The landing at the bottom of the Wizard's stair
  // is the end of the game: with his wand you go down it, and without it the
  // wards kill you.
  'ZORK3-FCN': (ctx, phase) => {
    const { s, out } = ctx;
    if (phase !== 'enter') return false;
    out.tell('Beyond the door is a roughly hewn staircase leading down into darkness. The landing on which you stand is covered with carefully drawn magical runes like those sketched upon the workbench of the Wizard of Frobozz. These have been overlaid with sweeping green lines of enormous power, which undulate back and forth across the landing.');
    if (!inPlayer(s, 'WAND')) {
      jigsUp(ctx, 'The green curves begin to vibrate toward you, as if searching for something. One by one your possessions glow bright green. Finally, you are attacked by these magical wardens, and destroyed!', {});
      return true;
    }
    out.tell('The wand begins to vibrate in harmony with the motion of the lines. You feel yourself compelled downward, and you yield, stepping onto the staircase. As you pass the green lines, they flare and disappear with a burst of light, and you tumble down the staircase!\n\nAt the bottom, a vast red-lit hall stretches off into the distance. Sinister statues guard the entrance to a dimly visible room far ahead. With courage and cunning you have conquered the Wizard of Frobozz and become the master of his domain, but the final challenge awaits!\n\n(The ultimate adventure concludes in "Zork III: The Dungeon Master".)');
    out.emit({ type: 'panel', key: 'events/z2-ev-victory-landing' });
    ctx.winGame();
    return true;
  },

  // DEAD-PALANTIR's M-ENTER arm: the black sphere at the end of the afterlife,
  // and the demon who decides whether you get another go. Three deaths is his
  // limit, whatever JIGS-UP allows.
  'DEAD-PALANTIR': (ctx, phase) => {
    const { s, out } = ctx;
    if (phase !== 'enter' || s.here !== 'DEAD-PALANTIR-4') return false;
    out.tell('You follow a corridor of black mist into a black walled spherical room.');
    if (s.locs['GENIE'] === 'PENTAGRAM-ROOM') {
      out.tell("The room is empty. A huge face looks down on you from outside and laughs sardonically. It doesn't look like you're getting out of this predicament!");
      s.dead = true;
      out.emit({ type: 'death', permanent: true });
      return true;
    }
    out.tell('As you enter, a huge and horrible face materializes out of the mist.\n\n"What brings you here to trouble my imprisonment, wanderer?" it asks. Hearing no immediate answer, it studies you for a moment.');
    if (s.counters.deaths >= 3) {
      out.tell('"Not you again! This is getting tedious. You\'ll obviously never be much help to me. Better luck next time, oh wondrous adventurer." The face disappears and everything goes black.');
      s.dead = true;
      out.emit({ type: 'death', permanent: true });
      return true;
    }
    out.tell('"Perhaps you may be of some use to me in gaining my freedom from this place. Return to your foolish quest! I shall not destroy you this time. Mayhap you will repay this favor in kind someday." The face vanishes and the mist begins to swirl. When it clears you are returned to the world of life.');
    ctx.moveTo('INSIDE-BARROW', true);
    return true;
  },

  // IN-CAGE-FCN (2actions.zil:1234) — once the robot has lifted the cage the
  // room you were trapped in is simply the cage room again.
  'IN-CAGE-FCN': (ctx, phase) => {
    if (phase === 'enter' && ctx.s.gflags['CAGE-SOLVE-FLAG']) ctx.s.here = 'CAGE-ROOM';
    return false;
  },

  // GARDEN-ROOM-FCN (2actions.zil:2624) — the garden's own wandering daemon.
  'GARDEN-ROOM-FCN': (ctx, phase) => {
    if (phase === 'enter') ctx.queue('I-GARDEN', -1);
    return false;
  },

  // DEPOSITORY-FCN (2actions.zil:1359). Which way you walked in is which room
  // the curtain will let you out into.
  'DEPOSITORY-FCN': (ctx, phase, dir) => {
    if (phase === 'enter' && dir && SCOL_ROOMS[dir]) ctx.s.gvars['SCOL-ROOM'] = SCOL_ROOMS[dir];
    return false;
  },

  // The M-LOOK arm lives in specialDescs.ts with the other room descriptions;
  // this is the M-END arm, which watches for the light going out.
  'CRYPT-ROOM-FCN': (ctx, phase) => {
    const { s } = ctx;
    if (phase === 'enter') {
      // ZIL only maintains CRYPT-LIT? from M-END, which leaves it stale for the
      // turn you walk in. Our panel layer reads the same flag to choose between
      // the lit and dark crypt, and it chooses before the description runs, so
      // the flag has to be true from the first frame or art and prose disagree.
      s.gflags['CRYPT-LIT'] = litIgnoringRoomBit(s, 'CRYPT-ROOM');
      return false;
    }
    if (phase !== 'end' || s.here !== 'CRYPT-ROOM') return false;
    const wasLit = !!s.gflags['CRYPT-LIT'];
    const lit = litIgnoringRoomBit(s, 'CRYPT-ROOM');
    s.gflags['CRYPT-LIT'] = lit;
    if (wasLit && !lit) dimDoorAppears(ctx);
    // Keeping the room's own ONBIT set is what stops the darkness from eating
    // the player while they stand in it reading the wall.
    fset(s, 'CRYPT-ROOM', 'ONBIT');
    return false;
  },
};

// ---------------------------------------------------------------------------
// Wiring: ask the world data which objects and rooms carry each ported routine.

function tableFor<T>(defs: Record<string, { action?: string }>, routines: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [id, def] of Object.entries(defs)) {
    const fn = def.action && routines[def.action];
    if (fn) out[id] = fn;
  }
  return out;
}

/** Per-object ACTION routines. */
export const OBJ_ACTIONS: Record<string, Handler> =
  tableFor(world.objects as Record<string, { action?: string }>, OBJ_ROUTINES);

/** Per-room ACTION routines, for the M-ENTER and M-END phases. */
export const ROOM_ACTIONS: Record<string, RoomHandler> =
  tableFor(world.rooms as Record<string, { action?: string }>, ROOM_ROUTINES);

/**
 * BKLEAVEE / BKLEAVEW (2actions.zil:1322). You may leave the depository by the
 * ordinary doors, but not carrying the bank's money — that has to go through
 * the curtain, which is the point of the curtain.
 */
function bankLeave(ctx: Ctx, room: string): string | null {
  const { s, out } = ctx;
  if (inPlayer(s, 'BILLS') || inPlayer(s, 'PORTRAIT')) {
    out.tell('An alarm rings briefly, and an invisible force bars your way.');
    out.emit({ type: 'sfx', name: 'z2-riddle-open' });
    return null;
  }
  return room;
}

/** `(DIR PER ROUTINE)` exits. Zork II has 11. */
export const SPECIAL_EXITS: Record<string, (ctx: Ctx, dir?: string) => string | null> = {
  BKLEAVEE: (ctx) => bankLeave(ctx, 'TELLER-EAST'),
  BKLEAVEW: (ctx) => bankLeave(ctx, 'TELLER-WEST'),

  // MAGNET-ROOM-EXIT (2actions.zil). Once the carousel is stopped the room
  // still spins you: you cannot tell which way you left.
  'MAGNET-ROOM-EXIT': (ctx, dir) => {
    const { s, out } = ctx;
    if (s.gflags['CAROUSEL-FLIP-FLAG']) {
      out.tell('You cannot get your bearings...');
      return prob(ctx, 50) ? 'MACHINE-ROOM' : 'TEA-ROOM';
    }
    if (dir === 'EAST') return 'MACHINE-ROOM';
    if (dir === 'SE' || dir === 'OUT') return 'TEA-ROOM';
    out.tell("You can't go that way.");
    return null;
  },
};

export function objAction(ctx: Ctx, obj?: string): boolean {
  if (!obj) return false;
  return OBJ_ACTIONS[obj]?.(ctx) ?? false;
}

export function roomAction(ctx: Ctx, room: string, phase: 'enter' | 'end' | 'beg', dir?: string): boolean {
  return ROOM_ACTIONS[room]?.(ctx, phase, dir) ?? false;
}

export function specialExit(ctx: Ctx, per: string, dir?: string): string | null {
  return SPECIAL_EXITS[per]?.(ctx, dir) ?? null;
}

/**
 * BUCKET-FCN's M-END arm (2actions.zil:849). ZIL runs M-END on whatever the
 * player is standing in, which while riding is the bucket — so the lift only
 * moves with you aboard.
 */
export function vehicleEnd(ctx: Ctx, vehicle: string): boolean {
  const { s, out } = ctx;
  if (vehicle !== 'BUCKET') return false;
  const wet = s.locs['WATER'] === 'BUCKET' || s.locs['SALTY-WATER'] === 'BUCKET';
  if (wet && !s.gflags['BUCKET-TOP-FLAG']) {
    out.tell('The bucket rises and comes to a stop.');
    s.gflags['BUCKET-TOP-FLAG'] = true;
    s.gflags['EVAPORATED'] = false;
    moveObj(s, 'BUCKET', 'WELL-TOP');
    ctx.moveTo('WELL-TOP', true);
    ctx.queue('I-BUCKET', 100);
    return true;
  }
  if (!wet && s.gflags['BUCKET-TOP-FLAG']) {
    out.tell(s.gflags['EVAPORATED']
      ? 'The last of the water evaporates, and the bucket descends.'
      : 'The bucket descends and comes to a stop.');
    s.gflags['BUCKET-TOP-FLAG'] = false;
    moveObj(s, 'BUCKET', 'WELL-BOTTOM');
    ctx.moveTo('WELL-BOTTOM', true);
    return true;
  }
  return false;
}

export const ZORK2_SPECIALS = {
  objAction, roomAction, specialExit, beforeWalk, beforeAction, vehicleEnd,
};
