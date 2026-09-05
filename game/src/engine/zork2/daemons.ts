// Zork II daemons. I-WIZARD is the game's signature mechanic and the reason
// the spell layer exists as a layer (docs/trilogy-research.md §3.3): it fires
// every four turns, may appear, may cast one of twelve spells, and several of
// those spells then rewrite core verb behaviour until it expires.
//
// Ported from 2actions.zil I-WIZARD (~3455-3708).
import type { Ctx } from '../ctx';
import { prob } from '../ctx';
import { jigsUp } from '../death';
import {
  fset, fset$, moveObj, removeObj, contents, inPlayer, isRoom, mungRoom, roomDef, roomLit,
  theName, PLAYER,
} from '../world';
import * as spells from '../spells';
import { SPELLS, SPELL_HINTS, SPELL_NAMES, SPELL_STOPS, type Spell } from '../spells';
import { OTHER_PROPERTIES } from './specials';

/** `<CONSTANT LOAD-MAX>` — what Feeble takes away and expiry restores. */
const LOAD_MAX = 100;

/** Rooms where floating over nothing is survivable when the spell ends. */
const SAFE_FLOAT_LANDING = ['WELL-BOTTOM', 'VOLCANO-BOTTOM'];

function overVoid(ctx: Ctx): boolean {
  const flags = roomDef(ctx.s.here)?.flags ?? [];
  return flags.includes('NONLANDBIT') && !SAFE_FLOAT_LANDING.includes(ctx.s.here);
}

/**
 * Undo an expiring spell and print its stop line. Feeble, Fierce and Fumble
 * each hold an override that has to be handed back; Float can kill you.
 */
function expireSpell(ctx: Ctx, spell: Spell): boolean {
  const { s, out } = ctx;

  if (spell === 'FLOAT') {
    if (s.here === 'WELL-TOP') {
      jigsUp(ctx, 'You plunge to the bottom of the shaft as the spell wears off.', {});
      return true;
    }
    if (overVoid(ctx)) {
      jigsUp(ctx, 'As the spell wears off, you find yourself making a half-gainer towards the bottom of the volcano.', {});
      return true;
    }
  }
  if (spell === 'FEEBLE') s.counters.loadAllowed = LOAD_MAX;
  if (spell === 'FIERCE') s.counters.swordGlow = 0;
  if (spell === 'FUMBLE') { s.counters.fumbleNumber = 7; s.counters.fumbleProb = 8; }

  const stop = SPELL_STOPS[spell];
  if (stop) out.tell(stop);
  spells.clearPlayerSpell(s);
  return false;
}

/** Apply a spell the instant it lands. Fall and Float move the player. */
function applySpell(ctx: Ctx, spell: Spell): void {
  const { s, out } = ctx;
  const vehicle = s.locs.ADVENTURER;
  const inVehicle = !!vehicle && vehicle !== s.here && fset$(s, vehicle, 'VEHBIT');

  if (spell === 'FALL' && inVehicle) {
    out.tell(`You suddenly fall headlong out of the ${theName(vehicle!)} as though someone had flipped it over.`);
    if (s.here === 'WELL-TOP') { jigsUp(ctx, 'You plummet to the bottom of the shaft.', {}); return; }
    if (overVoid(ctx)) { jigsUp(ctx, 'You make a rather messy swan dive to the bottom of the volcano.', {}); return; }
    moveObj(s, 'ADVENTURER', s.here);
    return;
  }
  if (spell === 'FLOAT' && inVehicle) {
    out.tell(`You rise majestically out of the ${theName(vehicle!)}, coming to a stop about five feet above it.`);
    moveObj(s, 'ADVENTURER', s.here);
    return;
  }
  if (spell === 'FEEBLE') s.counters.loadAllowed = Math.floor(LOAD_MAX / 2);
  if (spell === 'FUMBLE') { s.counters.fumbleNumber = 2; s.counters.fumbleProb = 40; }
  if (spell === 'FIERCE') s.counters.swordGlow = 2;
}

/** How many of the three lesser palantirs the player is carrying. */
function palantirsCarried(ctx: Ctx): number {
  return ['PALANTIR-1', 'PALANTIR-2', 'PALANTIR-3']
    .filter((p) => inPlayer(ctx.s, p)).length;
}

/** I-WIZARD (2actions.zil:3455). */
export function wizardDaemon(ctx: Ctx): void {
  const { s, out } = ctx;
  s.daemons['I-WIZARD'] = { tick: 4, enabled: true };
  if (s.dead) return;

  // A spell is running: this firing ends it.
  const active = spells.activeSpell(s);
  if (active) { expireSpell(ctx, active); return; }

  // Stranded in the dark with a broken lamp and a real score: the Wizard,
  // of all people, takes pity. This is the game's anti-softlock.
  if (!roomLit(s) && fset$(s, 'LAMP', 'RMUNGBIT') && s.counters.score > 200) {
    s.gflags['ALWAYS-LIT'] = true;
    out.tell('In the darkness you hear the voice of the Wizard. "Dear me, you seem to have gotten into quite a pickle." He chuckles. "Fluoresce!" he incants. It is no longer dark.');
    out.emit({ type: 'sfx', name: 'z2-spell-cast' });
    return;
  }

  // He is already here and usually leaves again.
  if (s.locs.WIZARD && prob(ctx, 80)) {
    if (roomLit(s) && s.locs.WIZARD === s.here) out.tell('The Wizard vanishes.');
    removeObj(s, 'WIZARD');
    s.gflags['WIZARD-HERE'] = false;
    out.emit({ type: 'sfx', name: 'z2-wizard-vanish' });
    return;
  }

  if (!prob(ctx, 10)) return;

  // --- he appears -------------------------------------------------------
  if (!roomLit(s)) {
    out.tell('You feel a slight outrush of air as something moves nearby.');
  } else if (s.here === 'POSTS-ROOM' || s.here === 'POOL-ROOM') {
    out.tell('A huge and terrible wizard appears before you, as large as the largest tree! He looks down on you as you would look upon a gnat!');
  } else if (roomDef(s.here)?.flags.includes('NONLANDBIT')) {
    out.tell('The Wizard appears, floating nonchalantly in the air beside you. He grins sideways at you.');
  } else {
    out.tell('A strange little man in a long cloak appears suddenly in the room. He is wearing a high pointed hat embroidered with astrological signs. He has a long, stringy, and unkempt beard.');
  }
  out.emit({ type: 'panel', key: 'events/z2-ev-wizard-appears' });

  // The Black Crystal frightens him off outright.
  if (inPlayer(s, 'PALANTIR-4')) {
    out.tell(roomLit(s)
      ? 'The Wizard notices that you carry the Black Crystal, and with an unseemly haste, he disappears.'
      : 'You feel a sudden inrush of air as though something disappeared.');
    removeObj(s, 'WIZARD');
    return;
  }
  if (prob(ctx, 20)) {
    out.tell(roomLit(s)
      ? 'He mutters something (muffled by his beard) and disappears as suddenly as he came.'
      : 'You hear low, confused muttering.');
    removeObj(s, 'WIZARD');
    return;
  }

  // Each lesser palantir carried makes him 20% less likely to manage a spell.
  const pcnt = palantirsCarried(ctx);
  const castProb = 80 - pcnt * 20;

  out.tell(roomLit(s)
    ? 'The Wizard draws forth his wand and waves it in your direction. It begins to glow with a faint blue glow.'
    : 'Suddenly, illuminated by the faint blue glow of a magic wand pointed in your direction, you see the Wizard!');

  if (!prob(ctx, castProb)) {
    out.tell('There is a loud crackling noise. Blue smoke rises from out of the Wizard\'s sleeve. He sighs and disappears.');
    out.emit({ type: 'panel', key: 'events/z2-ev-wizard-fumbles' });
    removeObj(s, 'WIZARD');
    return;
  }

  // --- he casts ---------------------------------------------------------
  const spell = SPELLS[Math.floor(ctx.rng() * SPELLS.length)];
  moveObj(s, 'WIZARD', s.here);
  spells.setSpellState(s, { active: spell });
  s.gflags['SPELL-ACTIVE'] = true;
  // The spell runs for 5 + random(30 - 5*pcnt) turns, so this daemon's next
  // firing is its expiry rather than the usual four-turn beat.
  s.daemons['I-WIZARD'] = { tick: 5 + Math.floor(ctx.rng() * Math.max(1, 30 - 5 * pcnt)), enabled: true };

  out.tell(prob(ctx, 75)
    ? `The Wizard, in a deep and resonant voice, speaks the word "${SPELL_NAMES[spell]}!" He then vanishes, cackling gleefully.`
    : 'The Wizard, almost inaudibly, whispers a word beginning with "F," and then disappears, chuckling nastily.');
  out.emit({ type: 'panel', key: 'events/z2-ev-wizard-casts' });
  out.emit({ type: 'sfx', name: 'z2-spell-cast' });
  removeObj(s, 'WIZARD');

  const hint = SPELL_HINTS[spell];
  if (hint) { out.tell(hint); out.emit({ type: 'sfx', name: 'z2-spell-onset' }); }

  applySpell(ctx, spell);
}

/**
 * I-FUSE (2actions.zil). Two turns after the string is lit, the brick goes off
 * wherever it happens to be — in your hands, in the safe's slot, or in a room
 * you have walked away from. The three cases are genuinely different, and only
 * the middle one is the puzzle solution.
 */
export function fuseDaemon(ctx: Ctx): void {
  const { s, out } = ctx;
  if (s.locs['FUSE'] === 'BRICK') {
    // Where is the brick, really? It may be in a sack, in your hands, in a room.
    let room: string | null = s.locs['BRICK'];
    while (room && !isRoom(room)) room = s.locs[room] ?? null;
    if (!room) return; // nowhere at all: the fuse burns on

    moveObj(s, 'EXPLOSION', room);
    delete s.touched[room];
    out.emit({ type: 'sfx', name: 'z2-safe-blast' });

    if (room === s.here) {
      out.emit({ type: 'shake' });
      mungRoom(s, room, 'The way is blocked by debris from an explosion.');
      jigsUp(ctx, OTHER_PROPERTIES, {});
      return;
    }

    out.tell('There is an explosion nearby.');
    ctx.queue('I-SAFE', 5);
    s.gvars['MUNGED-ROOM'] = room;
    if (room === 'SAFE-ROOM') {
      // The one placement that pays: the brick was in the slot, so the blast
      // takes the box's door off instead of the ceiling.
      if (s.locs['BRICK'] === 'SLOT') {
        fset(s, 'SLOT', 'INVISIBLE');
        fset(s, 'SAFE', 'OPENBIT');
        delete s.touched['SAFE-ROOM'];
        s.gflags['SAFE-FLAG'] = true;
        out.emit({ type: 'panel', key: 'events/z2-ev-safe-blown' });
      }
    } else {
      // Anywhere else, the blast buries everything portable in the room.
      for (const o of contents(s, room)) {
        if (fset$(s, o, 'TAKEBIT')) fset(s, o, 'INVISIBLE');
      }
    }
    removeObj(s, 'BRICK');
  } else if (s.locs['FUSE'] === PLAYER || s.locs['FUSE'] === s.here) {
    out.tell('The string rapidly burns into nothingness.');
  }
  removeObj(s, 'FUSE');
}

/**
 * I-SAFE (2actions.zil). Five turns after the explosion the damaged room comes
 * down. Being in it is fatal; hearing it from elsewhere is just a warning.
 */
export function safeDaemon(ctx: Ctx): void {
  const { s, out } = ctx;
  const munged = s.gvars['MUNGED-ROOM'];
  if (!munged) return;
  if (s.here === munged) {
    out.emit({ type: 'shake' });
    jigsUp(ctx, 'The room trembles and 5000 tons of rock fall on you, turning you into a pancake.', {});
  } else if (!s.dead) {
    out.tell('You may recall that recent explosion. Probably as a result of it, you hear an ominous rumbling, as if a nearby room had collapsed.');
    // The dusty room is under the ledge, and the ledge goes next.
    if (munged === 'SAFE-ROOM') ctx.queue('I-LEDGE', 8);
  }
  mungRoom(s, munged, 'The way is blocked by debris from an explosion.');
}

/**
 * I-LEDGE (2actions.zil:476). Eight turns after the dusty room falls in, so
 * does the ledge above it — with you on it, if you have lingered.
 */
export function ledgeDaemon(ctx: Ctx): void {
  const { s, out } = ctx;
  if (s.here === 'LEDGE-2') {
    if (s.locs[PLAYER] === 'BALLOON') {
      if (s.gflags['BTIE-FLAG']) {
        // Tied to the ledge, the balloon goes down with it.
        s.gvars['BLOC'] = 'VOLCANO-BOTTOM';
        removeObj(s, 'BALLOON');
        moveObj(s, 'DEAD-BALLOON', 'VOLCANO-BOTTOM');
        s.gflags['BTIE-FLAG'] = false;
        s.gflags['BINF-FLAG'] = false;
        ctx.disable('I-BALLOON');
        ctx.disable('I-BURNUP');
        out.emit({ type: 'shake' });
        jigsUp(ctx, 'The ledge collapses, probably as a result of the explosion, and plummets to the ground far below. Sadly, you were still attached to the ledge.', {});
      } else {
        out.tell('The ledge collapses, leaving you with no place to land.');
      }
    } else {
      out.emit({ type: 'shake' });
      jigsUp(ctx, 'The force of the recent explosion has caused the ledge to collapse.', {});
    }
  } else if (!s.dead) {
    out.tell('The ledge collapses. (That was a narrow escape!)');
  }
  mungRoom(s, 'LEDGE-2', 'The ledge has collapsed and cannot be landed on.');
}

export const ZORK2_DAEMONS: Record<string, (ctx: Ctx) => void> = {
  'I-WIZARD': wizardDaemon,
  'I-FUSE': fuseDaemon,
  'I-SAFE': safeDaemon,
  'I-LEDGE': ledgeDaemon,
};
