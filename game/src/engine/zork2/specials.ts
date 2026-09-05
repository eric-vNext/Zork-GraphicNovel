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
  fset, fclear, fset$, moveObj, removeObj, contents, inPlayer, playerVehicle,
  roomDef, roomLit, objDef, theName,
} from '../world';
import { spellUsed } from '../spells';
import world from '../../data/zork2/world.gen.json';

type Handler = (ctx: Ctx) => boolean;
type RoomHandler = (ctx: Ctx, phase: 'enter' | 'end', dir?: string) => boolean;

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
  if (playerVehicle(s) !== 'BALLOON') return false;

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

export function roomAction(ctx: Ctx, room: string, phase: 'enter' | 'end', dir?: string): boolean {
  return ROOM_ACTIONS[room]?.(ctx, phase, dir) ?? false;
}

export function specialExit(ctx: Ctx, per: string, dir?: string): string | null {
  return SPECIAL_EXITS[per]?.(ctx, dir) ?? null;
}

export const ZORK2_SPECIALS = { objAction, roomAction, specialExit, beforeWalk, beforeAction };
