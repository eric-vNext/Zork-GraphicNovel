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
  fclear, fset, fset$, moveObj, removeObj, contents, inPlayer, isRoom, mungRoom, objDef,
  roomDef, roomLit, theName, PLAYER,
} from '../world';
import * as spells from '../spells';
import { SPELLS, SPELL_HINTS, SPELL_NAMES, SPELL_STOPS, type Spell } from '../spells';
import { OTHER_PROPERTIES, PRINCESS_ROUTE } from './specials';

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

  // Once his own demon is loose in the pentagram room, the Wizard stops
  // wandering and turns up there to watch his authority end (2actions.zil:3483).
  if (s.locs['GENIE'] === 'PENTAGRAM-ROOM') {
    ctx.disable('I-WIZARD');
    if (s.locs['WIZARD'] !== 'PENTAGRAM-ROOM') {
      moveObj(s, 'WIZARD', 'PENTAGRAM-ROOM');
      if (s.here === 'PENTAGRAM-ROOM') {
        out.tell('Suddenly the Wizard materializes in the room. He is astonished by what he sees: his servant in deep conversation with a common adventurer! He draws forth his wand, waves it frantically, and incants "Frobizz! Frobozzle! Frobnoid!" The demon laughs heartily. "You no longer control the Black Crystal, hedge-wizard! Your wand is powerless! Your doom is sealed!" The demon turns to you, expectantly.');
        out.emit({ type: 'sfx', name: 'z2-demon-speak' });
      }
    }
    return;
  }

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

/** Rooms the dragon will not follow you into (2actions.zil I-DRAGON). */
const DRAGON_WONT_FOLLOW = ['CAROUSEL-ROOM', 'TINY-ROOM', 'RAVINE-LEDGE', 'FRESCO-ROOM'];

/**
 * FIND-TARGET (2actions.zil). Where the quarry is: this room if they are in it,
 * otherwise whichever room one of this room's exits leads to that holds them.
 */
function findTarget(ctx: Ctx, target: string): string | null {
  const { s } = ctx;
  const loc = target === PLAYER ? s.here : s.locs[target];
  if (loc === s.here) return s.here;
  for (const ex of Object.values(roomDef(s.here)?.exits ?? {})) {
    if (ex.to && ex.to === loc) return ex.to;
  }
  return null;
}

/** DRAGON-LEAVES (2actions.zil:2559) — he goes home, and calms down doing it. */
function dragonLeaves(ctx: Ctx): void {
  const { s } = ctx;
  if (s.locs['DEAD-DRAGON']) return;
  moveObj(s, 'DRAGON', 'DRAGON-ROOM');
  s.counters.dragonAnger = 0;
  ctx.disable('I-DRAGON');
}

/**
 * I-DRAGON (2actions.zil:2467). Runs every turn once you have got his
 * attention. Anger above six kills you; anger above zero makes him follow you,
 * which is the only way to walk him into the one thing in the dungeon that can
 * kill him — his own reflection in the glacier.
 */
export function dragonDaemon(ctx: Ctx): void {
  const { s, out } = ctx;
  const fireproof = spells.activeSpell(s) === 'FIREPROOF';
  const anger = s.counters.dragonAnger ?? 0;
  const oldHere = s.gvars['OLD-HERE'] ?? 'DRAGON-ROOM';

  if (anger > 6) {
    out.tell('The dragon tires of this game. With an almost bored yawn, he opens his mouth and ');
    if (fireproof) {
      out.tell('blasts you with a great gout of fire, but it washes over you harmlessly.');
    } else {
      dragonLeaves(ctx);
      out.emit({ type: 'panel', key: 'events/z2-ev-death-dragon' });
      out.emit({ type: 'sfx', name: 'z2-dragon-fire' });
      jigsUp(ctx, 'incinerates you in a blast of white-hot dragon fire.', {});
      return;
    }
  } else if (s.here === 'DRAGON-ROOM' && s.locs['DRAGON'] !== 'DRAGON-ROOM') {
    // Sneaking past him only works until he notices.
    moveObj(s, 'DRAGON', 'DRAGON-ROOM');
    out.tell('The dragon doubles back and charges into the room, maddened by your attempt to sneak past him. His eyes glow with a white heat of anger.');
    out.emit({ type: 'panel', key: 'events/z2-ev-death-dragon' });
    out.emit({ type: 'sfx', name: 'z2-dragon-fire' });
    jigsUp(ctx, fireproof
      ? "A huge ball of flame envelops you, but you don't even feel the heat. The dragon is puzzled, but not too puzzled to crush you in his jaws."
      : 'Worse for you, his mouth opens and a great gout of flame puffs out and consumes you on the spot.', {});
    return;
  } else if (anger <= 0) {
    if (prob(ctx, 50) && s.locs['DRAGON'] === s.here) {
      out.tell('The dragon looks bored.');
    } else {
      dragonLeaves(ctx);
      if (s.here === 'GLACIER-ROOM') {
        out.tell('The dragon is no longer around. He must have become bored with you.');
      } else if (s.here === oldHere) {
        out.tell(oldHere === 'DRAGON-ROOM'
          ? 'The dragon seems to have lost interest in you.'
          : 'The dragon seems to have lost interest in you. He wanders off.');
      }
    }
  } else {
    const room = findTarget(ctx, PLAYER);
    if (!room) {
      if (prob(ctx, 25)) dragonLeaves(ctx);
    } else if (DRAGON_WONT_FOLLOW.includes(room)) {
      if (prob(ctx, 25)) dragonLeaves(ctx);
      out.tell('The dragon will follow no further.');
    } else if (room === 'GLACIER-ROOM') {
      // The whole point of him.
      out.tell('\nAs the dragon enters, he sees his reflection on the icy surface of the glacier at its western end. He becomes enraged: There is another dragon here, behind that glass, he thinks! Dragons are smart, but sometimes naive, and this one has never seen ice before. He rears up to his full height to challenge this intruder into his territory. He roars a challenge! The intruder responds! The dragon takes a deep breath, and out of his mouth pours a massive gout of flame. It washes over the ice, which melts rapidly, sending out torrents of water and a huge cloud of steam! You manage to clamber up to a small shelf, but the dragon is terrified! A huge splash goes down his throat! There is a muffled explosion and the dragon, a puzzled expression on his face, dies. He is carried away by the water.\n\nWhen the flood recedes you climb gingerly down. While no trace of the dragon can be found, the melting of the ice has revealed a passage leading west.');
      removeObj(s, 'DRAGON');
      removeObj(s, 'ICE');
      moveObj(s, 'DEAD-DRAGON', 'DEEP-FORD');
      ctx.disable('I-DRAGON');
      s.counters.score += 5;
      s.gflags['ICE-MELTED'] = true;
      out.emit({ type: 'panel', key: 'events/z2-ev-glacier-melts' });
      out.emit({ type: 'sfx', name: 'z2-glacier-melt' });
      out.emit({ type: 'score', score: s.counters.score, moves: s.counters.moves });
    } else if (room !== oldHere) {
      moveObj(s, 'DRAGON', room);
      out.tell('The dragon follows you, out of mingled curiosity and anger.');
      out.emit({ type: 'sfx', name: 'z2-dragon-roar' });
    } else {
      out.tell('The dragon continues to watch you carefully.');
      if ((s.counters.dragonAnger ?? 0) <= 0) {
        s.counters.dragonAnger = 0;
        ctx.disable('I-DRAGON');
      }
    }
  }

  s.gvars['OLD-HERE'] = s.locs['DRAGON'] ?? null;
  s.counters.dragonAnger = Math.max(0, (s.counters.dragonAnger ?? 0) - 2);
}

/**
 * I-CURTAIN (2actions.zil:1427). Twelve turns after you step out of the
 * curtain the way back closes — and if you spent them in the vault, the Bank
 * of Zork's security arrangements introduce themselves.
 */
export function curtainDaemon(ctx: Ctx): void {
  const { s, out } = ctx;
  s.gvars['SCOL-ACTIVE'] = null;
  if (s.here === 'VAULT') {
    jigsUp(ctx, 'A metallic voice says "Hello, Intruder! Your unauthorized presence in the vault of the Bank of Zork has set off all sorts of nasty surprises, most of which are fatal. This message brought to you by the Frobozz Magic Vault Company."', {});
    return;
  }
  if (s.here === 'VIEWING-EAST' || s.here === 'VIEWING-WEST' || s.here === 'SMALL-ROOM') {
    out.tell('You hear a faint voice say "Curtain Door Closed."');
    // Being shut in the small room is what summons the bank's last employee.
    if (s.here === 'SMALL-ROOM' && !s.gflags['ZGNOME-FLAG']) {
      ctx.queue('I-ZGNOME', 3);
      s.gflags['ZGNOME-FLAG'] = true;
    }
  }
}

/** I-ZGNOME (2actions.zil:1445) — the Gnome of Zurich comes to collect. */
export function zgnomeDaemon(ctx: Ctx): void {
  const { s, out } = ctx;
  if (s.here !== 'SMALL-ROOM') return;
  ctx.queue('I-ZGNOME-OUT', 12);
  out.emit({ type: 'sfx', name: 'z2-gnome-cough' });
  const opening = 'An epicene gnome of Zurich wearing a three-piece suit and carrying a safety deposit box materializes in the room.';
  if (inPlayer(s, 'WAND')) {
    out.tell(`${opening} He notices the wand and dematerializes speedily.`);
    return;
  }
  out.tell(`${opening} "You seem to have forgotten to deposit your valuables," he says, tapping the lid of the box impatiently. "We don't usually allow customers to use the boxes here, but we can make this ONE exception, I suppose..." He looks askance at you over his wire-rimmed bifocals.`);
  moveObj(s, 'GNOME-OF-ZURICH', s.here);
}

/** I-ZGNOME-OUT (2actions.zil:1512) — he has other customers. */
export function zgnomeOutDaemon(ctx: Ctx): void {
  const { s, out } = ctx;
  removeObj(s, 'GNOME-OF-ZURICH');
  if (s.here === 'SMALL-ROOM') {
    out.tell('The gnome looks impatient: "I may have another customer waiting; you\'ll just have to fend for yourself, I\'m afraid." He disappears, leaving you alone.');
  }
}

// --------------------------------- the balloon -------------------------------
// The balloon is not steered. Every three turns it rises if the burner is lit
// and falls if it is not, and the volcano is a four-storey shaft: VAIR-1 at
// the bottom, VAIR-4 at the rim. Two of those levels have a ledge you can
// drift onto. Rise past the top and you leave the volcano for good, which is
// fatal if you are aboard.

/** `,BALLOON-UPS` — the level above each level. */
const BALLOON_UPS: Record<string, string> = {
  'VAIR-1': 'VAIR-2', 'VAIR-2': 'VAIR-3', 'VAIR-3': 'VAIR-4',
};
/** `,BALLOON-FLOATS` — the ledge each level drifts onto, and back. */
const BALLOON_FLOATS: Record<string, string> = {
  'LEDGE-1': 'VAIR-2', 'LEDGE-2': 'VAIR-4',
};
/** `,BALLOON-DOWNS` — the level below each level. */
const BALLOON_DOWNS: Record<string, string> = {
  'VAIR-4': 'VAIR-3', 'VAIR-3': 'VAIR-2', 'VAIR-2': 'VAIR-1',
};

/** Where the player can watch the balloon move without being in it. */
const VOLCANO_FLOOR = ['LEDGE-1', 'LEDGE-2', 'VOLCANO-BOTTOM'];

/** PUT-BALLOON (2actions.zil:246) — move the empty balloon, in view or not. */
function putBalloon(ctx: Ctx, there: string, verb: string): void {
  const { s, out } = ctx;
  if (VOLCANO_FLOOR.includes(s.here)) out.tell(`You watch as the balloon slowly ${verb}`);
  moveObj(s, 'BALLOON', there);
  s.gvars['BLOC'] = there;
}

/** RISE-AND-SHINE (2actions.zil:262) — the burner is lit, so up it goes. */
function riseAndShine(ctx: Ctx): void {
  const { s, out } = ctx;
  const aboard = s.locs[PLAYER] === 'BALLOON';
  const bloc = s.gvars['BLOC'] ?? 'VOLCANO-BOTTOM';
  ctx.queue('I-BALLOON', 3);

  if (bloc === 'VAIR-4') {
    // Over the rim: the view is magnificent and the landing is not.
    ctx.disable('I-BURNUP');
    ctx.disable('I-BALLOON');
    removeObj(s, 'BALLOON');
    if (aboard) {
      out.emit({ type: 'sfx', name: 'z2-balloon-rise' });
      jigsUp(ctx, 'The balloon floats majestically out of the volcano, revealing a breathtaking view of a wooded river valley surrounded by impassable mountains. In a clearing stands a white house. You drift into high winds, which carry you towards the snow-capped peaks. Oh, no! You crash into the jagged cliffs of the Flathead Mountains!', {});
    } else if (VOLCANO_FLOOR.includes(s.here)) {
      out.tell('You watch the balloon drift out over the rim and away on the wind.');
    }
    s.gvars['BLOC'] = 'VOLCANO-BOTTOM';
    return;
  }

  const up = BALLOON_UPS[bloc];
  if (up) {
    if (aboard) {
      out.tell('The balloon ascends.');
      out.emit({ type: 'sfx', name: 'z2-balloon-rise' });
      s.gvars['BLOC'] = up;
      ctx.moveTo(up, true);
    } else putBalloon(ctx, up, 'ascends.');
    return;
  }

  const off = BALLOON_FLOATS[bloc];
  if (off) {
    // Sitting on a ledge, it drifts back off it.
    if (aboard) {
      out.tell('The balloon leaves the ledge.');
      s.gvars['BLOC'] = off;
      ctx.moveTo(off, true);
    } else {
      ctx.queue('I-GNOME', 10);
      putBalloon(ctx, off, 'floats away. It seems to be ascending, due to its light load.');
      fset(s, 'RECEPTACLE', 'OPENBIT');
    }
    return;
  }

  if (aboard) {
    s.gvars['BLOC'] = 'VAIR-1';
    out.tell('The balloon rises slowly from the ground.');
    out.emit({ type: 'sfx', name: 'z2-balloon-rise' });
    ctx.moveTo('VAIR-1', true);
  } else {
    putBalloon(ctx, 'VAIR-1', 'lifts off.');
  }
}

/** DECLINE-AND-FALL (2actions.zil:304) — no fire, so down it comes. */
function declineAndFall(ctx: Ctx): void {
  const { s, out } = ctx;
  const aboard = s.locs[PLAYER] === 'BALLOON';
  const bloc = s.gvars['BLOC'] ?? 'VOLCANO-BOTTOM';
  ctx.queue('I-BALLOON', 3);

  if (bloc === 'VAIR-1') {
    if (!aboard) { putBalloon(ctx, 'VOLCANO-BOTTOM', 'lands.'); return; }
    s.gvars['BLOC'] = 'VOLCANO-BOTTOM';
    if (s.gvars['BINF-FLAG']) {
      out.tell('The balloon has landed.');
      ctx.moveTo('VOLCANO-BOTTOM', true);
      return;
    }
    // Falling with a cold bag is survivable; the balloon does not survive it.
    removeObj(s, 'BALLOON');
    moveObj(s, 'DEAD-BALLOON', 'VOLCANO-BOTTOM');
    moveObj(s, PLAYER, null);
    ctx.disable('I-BALLOON');
    out.tell('You have landed, but the balloon did not survive.');
    ctx.moveTo('VOLCANO-BOTTOM', true);
    return;
  }

  const down = BALLOON_DOWNS[bloc];
  if (!down) return;
  if (aboard) {
    out.tell('The balloon descends.');
    s.gvars['BLOC'] = down;
    ctx.moveTo(down, true);
  } else {
    putBalloon(ctx, down, 'descends.');
  }
}

/** I-BALLOON (2actions.zil:219). */
export function balloonDaemon(ctx: Ctx): void {
  const { s } = ctx;
  if ((fset$(s, 'RECEPTACLE', 'OPENBIT') && s.gvars['BINF-FLAG'])
      || s.here === 'LEDGE-1' || s.here === 'LEDGE-2') {
    riseAndShine(ctx);
  } else {
    declineAndFall(ctx);
  }
}

/** I-BURNUP (2actions.zil:365) — the fuel runs out and the bag goes cold. */
export function burnupDaemon(ctx: Ctx): void {
  const { s, out } = ctx;
  const fuel = contents(s, 'RECEPTACLE')[0];
  if (fuel && s.here === s.gvars['BLOC']) {
    out.tell(`The ${objDef(fuel).desc} has now burned out, and the cloth bag starts to deflate.`);
  }
  if (fuel) removeObj(s, fuel);
  s.gvars['BINF-FLAG'] = null;
}

// ------------------------------ the garden -----------------------------------

/**
 * I-PRINCESS (2actions.zil:2770). She walks her nine steps whether or not you
 * keep up. Two of them are worth being present for: the secret door she opens
 * out of the Marble Hall, and the gazebo, where the unicorn comes to her.
 */
export function princessDaemon(ctx: Ctx): void {
  const { s, out } = ctx;
  const step = PRINCESS_ROUTE[s.counters.prCount ?? 0];
  if (!step) return;
  const from = s.locs['PRINCESS'];
  moveObj(s, 'PRINCESS', step.to);
  s.gvars['PRFOLLOW'] = null;

  if (step.to === 'STREAM-PATH' && s.here === 'MARBLE-HALL') {
    out.tell('The princess presses a loose piece of marble in the wall and a large section of the wall slides away, revealing a passage to the east. She enters it.');
    if (s.here === from) s.gvars['PRFOLLOW'] = step.follow;
    s.gflags['SECRET-DOOR'] = true;
  } else if (step.to === 'STREAM-PATH' && s.here === 'STREAM-PATH') {
    s.gflags['SECRET-DOOR'] = true;
    out.tell('The princess appears from behind some rocks, as though she had walked through a wall.');
  } else if (s.here === from) {
    s.gvars['PRFOLLOW'] = step.follow;
    if (from === 'GARDEN-NORTH') {
      out.tell('The princess enters the gazebo'
        + (fset$(s, 'GAZEBO-ROOM', 'RMUNGBIT')
          ? ', although you would never get past the debris. She must be magically protected.'
          : '') + '.');
    } else if (from === 'RAVINE-LEDGE') {
      out.tell('The princess climbs daintily down the rock face.');
    } else {
      out.tell(`The princess walks ${step.walks}. She glances back at you as she goes.`);
    }
  } else if (s.locs['PRINCESS'] === s.here) {
    if (s.here === 'GAZEBO-ROOM') out.tell('The princess joins you in the gazebo.');
    else if (s.here === 'DEEP-FORD') out.tell('The princess climbs down the rock wall onto the beach.');
    else out.tell(`The princess enters from the ${step.from}. She seems surprised to see you.`);
  }

  if (s.locs['PRINCESS'] === 'GAZEBO-ROOM') {
    ctx.disable('I-PRINCESS');
    ctx.queue('I-UNICORN', 6);
  } else {
    s.counters.prCount = (s.counters.prCount ?? 0) + 1;
    ctx.queue('I-PRINCESS', prob(ctx, 75) ? 1 : 2);
  }
}

/**
 * I-UNICORN (2actions.zil:2823). The reward for having followed her: the gold
 * key that opens the Wizard's door. Miss it and she simply leaves.
 */
export function unicornDaemon(ctx: Ctx): void {
  const { s, out } = ctx;
  if (s.here === 'GAZEBO-ROOM' || s.here === 'GARDEN-NORTH') {
    moveObj(s, 'ROSE', PLAYER);
    fclear(s, 'GOLD-KEY', 'NDESCBIT');
    moveObj(s, 'GOLD-KEY', PLAYER);
    if (!s.scoredTakes['GOLD-KEY']) {
      s.scoredTakes['GOLD-KEY'] = true;
      s.counters.score += objDef('GOLD-KEY').value ?? 0;
      out.emit({ type: 'score', score: s.counters.score, moves: s.counters.moves });
    }
    out.tell('Shyly, a unicorn peeks out of the hedges. It notices the princess and seems captivated. It approaches her and bows its head as though curtseying to her. Around its neck is a red satin ribbon on which is strung a delicate gold key. The princess takes the ribbon and uses it to tie up her hair. She looks at you and then, smiling, hands you the key and a fresh rose which she plucks from the arbor. "You may have use of such a thing," she says. "It is the least I can do for one who rescued me from a fate I dare not contemplate." With that, she mounts the unicorn (side-saddle, of course) and rides off into the gloom.');
    out.emit({ type: 'panel', key: 'events/z2-ev-unicorn-collared' });
    out.emit({ type: 'sfx', name: 'z2-unicorn-whinny' });
    removeObj(s, 'PRINCESS');
    return;
  }
  removeObj(s, 'PRINCESS');
  moveObj(s, 'ROSE', 'GAZEBO-ROOM');
}

/** `,UNICORN-MSGS` — glimpses of it, in rising order of how close it has come. */
const UNICORN_MSGS = [
  'There is a large, white animal partly hidden behind some trees.',
  'You catch a glimpse of something white between two hedges.',
  'A unicorn is cropping grass on the other side of the room. A gold key hangs from a ribbon around its neck.',
  'There is a beautiful unicorn eating roses here. Around his neck is a red satin ribbon on which is strung a tiny key.',
];

const GARDEN_ROOMS = ['GARDEN-NORTH', 'GAZEBO-ROOM', 'TOPIARY-ROOM', 'FORMAL-GARDEN'];

/**
 * I-GARDEN (2actions.zil:2565). The unicorn drifts in and out of the garden
 * while the princess is still asleep — it is the other way to the gold key —
 * and the topiary animals close in on anyone who lingers among them.
 */
export function gardenDaemon(ctx: Ctx): void {
  const { s, out } = ctx;
  if (!GARDEN_ROOMS.includes(s.here)) {
    removeObj(s, 'UNICORN');
    ctx.disable('I-GARDEN');
    return;
  }
  if (s.locs['UNICORN'] === 'GARDEN-NORTH' && prob(ctx, 33)) {
    removeObj(s, 'UNICORN');
    if (s.here !== 'TOPIARY-ROOM') out.tell('The unicorn bounds lightly away.');
    return;
  }
  if (s.locs['PRINCESS'] === 'DRAGON-LAIR' && s.locs['UNICORN'] !== 'GARDEN-NORTH'
      && prob(ctx, 25) && s.here !== 'TOPIARY-ROOM') {
    // Frightening it off buys it one turn's grace before it dares come back.
    if (s.gflags['UNICORN-FRIGHTENED']) { s.gflags['UNICORN-FRIGHTENED'] = false; return; }
    moveObj(s, 'UNICORN', 'GARDEN-NORTH');
    out.tell(s.here === 'GARDEN-NORTH'
      ? UNICORN_MSGS[Math.floor(ctx.rng() * UNICORN_MSGS.length)]
      : 'A unicorn is peacefully cropping grass at the north end of the garden. There is something hanging around its neck.');
    return;
  }
  if (s.here !== 'TOPIARY-ROOM') return;
  if (!s.gflags['TOPIARY-MOVED'] && prob(ctx, 12)) {
    s.gflags['TOPIARY-MOVED'] = true;
    out.tell('You look around, and strangely, the topiary animals seem to have changed position slightly.');
  } else if (s.gflags['TOPIARY-MOVED'] && !s.gflags['TOPIARY-NEAR'] && prob(ctx, 8)) {
    s.gflags['TOPIARY-NEAR'] = true;
    out.tell('The topiary animals seem to close in on you. You turn and they are very close. They seem to be leering at you.');
  } else if (s.gflags['TOPIARY-NEAR'] && prob(ctx, 4)) {
    s.gflags['TOPIARY-MOVED'] = false;
    s.gflags['TOPIARY-NEAR'] = false;
    jigsUp(ctx, 'The topiary animals attack! You are crushed by their branches and clawed by their thorns.', {});
  }
}

/**
 * I-SPHERE (2actions.zil:1226). Six turns in the cage and the gas has you —
 * unless the robot has been walked in and told to lift it.
 */
export function sphereDaemon(ctx: Ctx): void {
  const { s } = ctx;
  if (s.here !== 'CAGE-ROOM' && s.here !== 'IN-CAGE') return;
  fset(s, 'PALANTIR-1', 'INVISIBLE');
  mungRoom(s, 'CAGE-ROOM', 'You are stopped by a cloud of poisonous gas.');
  jigsUp(ctx, 'Time passes...and you die from some obscure poisoning.', {});
}

export const ZORK2_DAEMONS: Record<string, (ctx: Ctx) => void> = {
  // The player's own spell, and the wand's charge, both time out.
  'I-SPELL': spells.spellTimeout,
  'I-WAND': spells.wandTimeout,
  'I-WIZARD': wizardDaemon,
  'I-FUSE': fuseDaemon,
  'I-SAFE': safeDaemon,
  'I-LEDGE': ledgeDaemon,
  'I-DRAGON': dragonDaemon,
  'I-CURTAIN': curtainDaemon,
  'I-ZGNOME': zgnomeDaemon,
  'I-ZGNOME-OUT': zgnomeOutDaemon,
  'I-BALLOON': balloonDaemon,
  'I-BURNUP': burnupDaemon,
  'I-PRINCESS': princessDaemon,
  'I-UNICORN': unicornDaemon,
  'I-GARDEN': gardenDaemon,
  'I-SPHERE': sphereDaemon,
};
