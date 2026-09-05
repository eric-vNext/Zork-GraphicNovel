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
  fset, fclear, fset$, moveObj, removeObj, contents, inPlayer, roomLit,
  objDef, theName,
} from '../world';
import { spellUsed } from '../spells';
import world from '../../data/zork2/world.gen.json';

type Handler = (ctx: Ctx) => boolean;
type RoomHandler = (ctx: Ctx, phase: 'enter' | 'end') => boolean;

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
export function beforeWalk(ctx: Ctx, dir: string): string | null {
  const { s, out } = ctx;
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
    return SCRAMBLE_DIRS[Math.floor(ctx.rng() * SCRAMBLE_DIRS.length)];
  }
  return intended;
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

/** `(DIR PER ROUTINE)` exits. Zork II has 11. */
export const SPECIAL_EXITS: Record<string, (ctx: Ctx) => string | null> = {};

export function objAction(ctx: Ctx, obj?: string): boolean {
  if (!obj) return false;
  return OBJ_ACTIONS[obj]?.(ctx) ?? false;
}

export function roomAction(ctx: Ctx, room: string, phase: 'enter' | 'end'): boolean {
  return ROOM_ACTIONS[room]?.(ctx, phase) ?? false;
}

export function specialExit(ctx: Ctx, per: string): string | null {
  return SPECIAL_EXITS[per]?.(ctx) ?? null;
}

export const ZORK2_SPECIALS = { objAction, roomAction, specialExit, beforeWalk };
