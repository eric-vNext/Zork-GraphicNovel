// Zork II's routine-generated room descriptions — the M-LOOK arms of the room
// ACTION routines in 2actions.zil.
//
// These are the rooms whose text changes with world state, so they cannot live
// in the extracted LDESC data. Every string here is verbatim from the ZIL; the
// branching mirrors its COND order exactly. Where a room has an illustrated
// state variant, the flag that gates the text is the same flag that gates the
// panel (see data/zork2/presentation.ts roomArtFor), so prose and art can never
// disagree about what state the room is in.
import type { WorldState } from '../types';
import {
  fclear, fset, fset$, contents as contents$, isRoom as isRoom$, objDef, roomLit as roomLit$,
} from '../world';

const objName = (id: string): string => objDef(id)?.desc ?? 'thing';
import { litIgnoringRoomBit } from './specials';

/** DIM-DOOR-APPEARS's text (2actions.zil); the flag clearing lives in specials. */
const DIM_DOOR_TEXT =
  'It is dark, but on the south wall is a faint outline of a rectangle, as though light were shining around a doorway. You can also make out a faintly glowing letter in the center of this area. It might be an "F".';

type Desc = (s: WorldState, viewRoom?: (target: string) => string) => string | null;

/**
 * P-DOOR (2actions.zil). The shared clause describing the door between the
 * Tiny and Dreary rooms — and it is a description with a puzzle in it: the
 * lid, whatever is sitting in the keyhole, and the place mat under the door.
 */
function palantirDoor(s: WorldState, dir: string, lid: string, keyhole: string): string {
  let t = `On the ${dir} side of the room is a massive wooden door, which has a small window barred with iron. A formidable bolt lock is set within the door frame. A keyhole `;
  if (!fset$(s, lid, 'OPENBIT')) t += 'covered by a thin metal lid ';
  t += 'lies within the lock.';
  const inHole = contents$(s, keyhole)[0];
  if (inHole) t += ` A ${objName(inHole)} is in place within the keyhole.`;
  if (s.gflags['MUD-FLAG']) {
    t += ' The edge of a place mat is visible under the door.';
    const onMat = s.gvars['MATOBJ'];
    if (onMat) t += ` Lying on the place mat is a ${objName(onMat)}.`;
  }
  return t;
}

export const ZORK2_ROOM_DESCS: Record<string, Desc> = {
  'CAROUSEL-ROOM': (s) => {
    let t = 'You are in a large circular room whose high ceiling is lost in gloom. Eight identical passages leave the room.';
    if (!s.gflags['CAROUSEL-FLIP-FLAG']) {
      t += ' A loud whirring sound comes from all around, and you feel sort of disoriented in here.';
    }
    return t;
  },

  'GLACIER-ROOM': (s) => {
    let t = 'This is a large hall of ancient lava, since worn smooth by the movement of a glacier. A large passage exits to the east and an upward lava tube is at the top of a jumble of fallen rocks.';
    if (s.gflags['ICE-MELTED']) {
      t += ' A damp and scorched passage leads west. It is still partly full of steam.';
    }
    return t;
  },

  'SAFE-ROOM': (s) => {
    const t = 'You are in a dusty old room which is featureless, except for an exit on the north side.';
    return s.gflags['SAFE-FLAG']
      ? `${t} On the far wall is a rusty box, whose door has been blown off.`
      : `${t} Imbedded in the far wall is a rusty box. It appears to be somewhat damaged, since an oblong hole has been chipped out of the front of it.`;
  },

  'DEAD-PALANTIR-1': (s, view) => deadPalantir(s, 'DEAD-PALANTIR-1', view),
  'DEAD-PALANTIR-2': (s, view) => deadPalantir(s, 'DEAD-PALANTIR-2', view),
  'DEAD-PALANTIR-3': (s, view) => deadPalantir(s, 'DEAD-PALANTIR-3', view),

  // WIZARD-QUARTERS-FCN (2actions.zil) picks a description at random and only
  // avoids repeating the one before, so the room is never twice the same.
  // The roll itself needs the game's RNG, so it happens in the room's ACTION
  // (see specials.ts); this only reads which one came up.
  'WIZARDS-QUARTERS': (s) =>
    `This is where the Wizard of Frobozz lives. The room is ${WIZQDESCS[s.counters.wizQ ?? 0]}`,

  // DIAMOND-MOTION's M-LOOK arm. The window in the floor is the only feedback
  // the maze gives you: it brightens one step for every base you round.
  ...Object.fromEntries([1, 2, 3, 4, 6, 7, 8, 9].map((n) => [
    `DIAMOND-${n}`,
    (s: WorldState) =>
      `This is a room with oddly angled walls and passages in all directions. The walls are made of some glassy substance. ${diamondWindow(s)}`,
  ])),

  'DIAMOND-5': (s) => {
    const t = 'This is a room with oddly angled walls and passages in all directions. The walls are made of some glassy substance. A marble stairway leads upward.';
    return s.gflags['DIAMOND-SOLVE']
      ? `${t} The floor has swung down at the end of the stairway to reveal a secret passage leading down into unrelieved darkness.`
      : t;
  },

  'RIDDLE-ROOM': (s) => {
    const door = fset$(s, 'RIDDLE-DOOR', 'OPENBIT') ? 'open' : 'closed';
    return `This is a room which is bare on all sides. There is an exit down in the northwest corner of the room. To the east is a great ${door} door made of stone. Above the stone, the following words are written: "No man shall pass this door without solving this riddle:\n\n  What is tall as a house,\n    round as a cup,\n      and all the king's horses\n        can't draw it up?"`;
  },

  'MENHIR-ROOM': () =>
    'This is a large room which was evidently used once as a quarry. Many large limestone chunks lie helter-skelter around the room. Some are rough-hewn and unworked, others smooth and well-finished. One side of the room appears to have been used to quarry building blocks, the other to produce menhirs (standing stones). Obvious passages lead north and south.',

  // CRYPT-ROOM-FCN's M-LOOK arm takes the room's own ONBIT off before asking
  // whether it is lit, so what you see depends on your lamp, not on the bit the
  // routine itself keeps setting.
  'CRYPT-ROOM': (s) => {
    if (!litIgnoringRoomBit(s, 'CRYPT-ROOM')) {
      // M-LOOK's dark branch calls DIM-DOOR-APPEARS, which reveals the door as
      // well as describing it — looking in the dark is the whole puzzle.
      fclear(s, 'DIM-DOOR', 'INVISIBLE');
      return DIM_DOOR_TEXT;
    }
    let t = 'The room contains the earthly remains of the mighty Flatheads, twelve somewhat flat heads mounted securely on poles. While the room might be expected to contain funerary urns or other evidence of the ritual practices of the ancient Zorkers, it is empty of all such objects. There is writing carved on the crypt. The only apparent exit is to the north through the door to the anteroom. The door is ';
    t += fset$(s, 'CRYPT-DOOR', 'OPENBIT') ? 'open.' : 'closed.';
    if (!fset$(s, 'DIM-DOOR', 'INVISIBLE')) {
      t += ' Looking closely at the south wall, you can see the dim outline of a secret door labelled with the letter "F".';
    }
    return t;
  },

  'CRYPT-ANTEROOM': (s) => {
    let t = 'The anteroom is large and empty. Marble bas reliefs depict the stirring times and afterlife of the Flatheads (the latter a bit optimistically). The exit is to the west. A huge marble door stands to the south. The door is ';
    t += fset$(s, 'CRYPT-DOOR', 'OPENBIT') ? 'open.' : 'closed.';
    return `${t} Above the door is the cryptic inscription: "Feel Free".`;
  },

  'GUARDIAN-ROOM': (s) => {
    let t = 'This room is cobwebby and musty, but tracks in the dust show that it has seen visitors recently. At the south end of the room is a stained and battered (but very strong-looking) door. To the north, a corridor exits.';
    if (fset$(s, 'WIZ-DOOR', 'OPENBIT')) t += ' The door is open.';
    if (!s.gflags['GUARDIAN-FED']) {
      t += ' Imbedded in the door is a nasty-looking lizard head, with sharp teeth and beady eyes.';
      t += s.locs['CANDY'] === 'ADVENTURER'
        ? ' The lizard is sniffing at you.'
        : ' The eyes move to watch you approach.';
    } else {
      t += ' A sleepy-looking lizard head is mounted on the door.';
    }
    return t;
  },

  'WIZARDS-WORKSHOP': (s) => {
    let t = "You are standing in the entry hall of the Wizard's Workshop. Dark corridors lead west and south from here. The corridor to the west smells slightly of incense or candle smoke.";
    if (fset$(s, 'WIZ-DOOR', 'OPENBIT')) t += ' The workshop door is open.';
    return t;
  },

  'LEDGE-2': (s) => {
    const t = 'You are on a wide ledge high in the volcano. The rim of the volcano is about 200 feet above and there is a precipitous drop to the bottom.';
    return fset$(s, 'SAFE-ROOM', 'RMUNGBIT')
      ? `${t} The way to the south is blocked by rubble.`
      : `${t} There is a small door to the south.`;
  },

  'MAGNET-ROOM': () =>
    'You are in a circular room with a low ceiling. There are exits to the east and southeast.',

  'TELLER-WEST': () =>
    'You are in a small room, which was used by a bank officer who retrieved safety deposit boxes for the customer. On the north side of the room is a sign which reads "Viewing Room". On the west side of the room, above an open door, is a sign reading: BANK PERSONNEL ONLY',

  'TELLER-EAST': () =>
    'You are in a small room, which was used by a bank officer who retrieved safety deposit boxes for the customer. On the north side of the room is a sign which reads "Viewing Room". On the east side of the room, above an open door, is a sign reading: BANK PERSONNEL ONLY',

  'TINY-ROOM': (s) => {
    const t = 'This is a tiny room carved out of the wall of the ravine. There is an exit down a precarious climb.';
    // PLOOK-FLAG: having just looked through the window, you are not shown the
    // door again on the way back.
    if (s.gflags['PLOOK-FLAG']) return t;
    return `${t} ${palantirDoor(s, 'north', 'LID-1', 'KEYHOLE-1')}`;
  },

  'DREARY-ROOM': (s) => {
    const t = 'This is a small and rather dreary room, eerily illuminated by a red glow emanating from a crack in one wall. The light falls upon a dusty wooden table in the center of the room.';
    if (s.gflags['PLOOK-FLAG']) return t;
    return `${t} ${palantirDoor(s, 'south', 'LID-2', 'KEYHOLE-2')}`;
  },
};

/**
 * BALLOON-FCN's M-LOOK arm: what you see standing in the basket. The bag, the
 * receptacle and the wire each have two states, and the balloon is the only
 * object in the trilogy that describes itself differently from inside.
 */
function balloonInside(s: WorldState): string {
  let t: string;
  const fuel = s.gvars['BINF-FLAG'];
  const open = fset$(s, 'RECEPTACLE', 'OPENBIT');
  if (fuel) {
    t = 'The cloth bag is inflated and ';
    t += open
      ? `there is a ${objName(fuel)} burning in the receptacle.`
      : 'some smoke is leaking out of the closed receptacle.';
  } else {
    t = 'The cloth bag is draped over the side of the basket. Directly in the middle of the basket is a metal receptacle which is ';
    if (open) {
      t += 'open';
      const inside = contents$(s, 'RECEPTACLE')[0];
      if (inside) t += `. A ${objName(inside)} is ${inside === fuel ? 'burning' : 'nestled'} inside`;
    } else {
      t += 'closed';
    }
    t += '.';
  }
  return t + (s.gvars['BTIE-FLAG']
    ? ' The balloon is tied to a hook by the braided wire.'
    : ' A braided wire is dangling over the side of the basket.');
}

/** BALLOON-FCN's M-OBJDESC arm: what you see standing next to it. */
function balloonOutside(s: WorldState): string {
  let t = 'There is a large and extremely heavy wicker basket here. An enormous cloth bag ';
  const fuel = s.gvars['BINF-FLAG'];
  if (fuel) {
    t += 'attached to the basket is inflated. A metal receptacle is fastened to the center of the basket. ';
    t += fset$(s, 'RECEPTACLE', 'OPENBIT')
      ? `In it is a burning ${objName(fuel)}`
      : 'Some smoke leaks out around its closed lid';
  } else {
    t += 'is draped over the side and is firmly attached to the basket. A metal receptacle is fastened to the center of the basket';
  }
  return t + (s.gvars['BTIE-FLAG']
    ? '. A piece of wire tied to a hook holds the balloon in place.'
    : '. Dangling from the basket is a piece of braided wire.');
}

// ------------------------------ the palantirs --------------------------------
// Each sphere shows you the room the next one is in: red shows blue, blue
// shows white, white shows red, and the black one shows the demon who is
// watching all of it. The afterlife is the inside of those same spheres.

export const NEXT_SPHERE: Record<string, string> = {
  'PALANTIR-1': 'PALANTIR-2', 'PALANTIR-2': 'PALANTIR-3',
  'PALANTIR-3': 'PALANTIR-1', 'PALANTIR-4': 'PALANTIR-4',
};

/** Which room an object is really in, however deeply it is nested. */
function roomOf$(s: WorldState, obj: string): string | null {
  let p: string | null = s.locs[obj] ?? null;
  while (p && !isRoom$(p)) p = s.locs[p] ?? null;
  return p && isRoom$(p) ? p : null;
}

/**
 * PALANTIR-LOOK (2actions.zil). `inside` is the afterlife's version, which is
 * looking *out* through the mist rather than into a sphere in your hands.
 */
export function palantirLook(
  s: WorldState,
  obj: string,
  inside: boolean,
  viewRoom?: (target: string) => string,
): string {
  if (obj === 'PALANTIR-4') {
    return 'As you peer into the sphere, a strange vision takes shape...a huge and fearful face with yellow eyes. The face peers out at you expectantly.';
  }
  const rm = roomOf$(s, obj);
  if (!rm || !roomLit$(s, rm) || !viewRoom) return 'You see only darkness.';
  const preamble = inside
    ? 'As you peer through the mist, a strangely colored vision of a huge room takes shape...'
    : 'As you peer into the sphere, a strange vision takes shape of a distant room, which can be described clearly....';
  const wasHere = s.here === rm;
  const hidden = fset$(s, obj, 'INVISIBLE');
  if (!hidden) fset(s, obj, 'INVISIBLE');
  const vision = viewRoom(rm);
  if (!hidden) fclear(s, obj, 'INVISIBLE');
  const tail = wasHere ? '\nAn astonished adventurer is staring into a crystal sphere.' : '';
  const fade = inside ? '' : '\nThe vision fades, revealing only an ordinary crystal sphere.';
  return `${preamble}\n\n${vision}${tail}${fade}`;
}

/** DEAD-PALANTIR's M-LOOK arm: the inside of a sphere, seen from the inside. */
function deadPalantir(s: WorldState, room: string, viewRoom?: (t: string) => string): string {
  const which = room === 'DEAD-PALANTIR-1'
    ? { mist: 'red', west: 'blue', sphere: 'PALANTIR-1' }
    : room === 'DEAD-PALANTIR-2'
      ? { mist: 'blue', west: 'white', sphere: 'PALANTIR-2' }
      : { mist: 'white', west: 'black', sphere: 'PALANTIR-3' };
  let t = `You are inside a huge crystalline sphere filled with thin ${which.mist} mist. The mist becomes ${which.west} to the west.`;
  t += '\nYou strain to look out through the mist... ';
  if (fset$(s, which.sphere, 'TOUCHBIT')) {
    return `${t}\n${palantirLook(s, which.sphere, true, viewRoom)}`;
  }
  if (which.sphere === 'PALANTIR-1') {
    return `${t}\nYou see a small room with a sign on the wall, but it is too blurry to read.`;
  }
  if (which.sphere === 'PALANTIR-2') {
    return `${t}\nYou look out into a large, dreary room with a great door and a huge table. There is an odd glow to the mist.`;
  }
  return `${t}\nA strange blurry room is barely visible.`;
}

/** `,DWDESCS` — how brightly the window in the floor is glowing. */
const DWDESCS = ['dark', 'flickering dimly', 'dimly glowing', 'glowing', 'glowing brightly'];

/** DWINDOW-DESC (2actions.zil:2188). */
export function diamondWindow(s: WorldState): string {
  const state = s.gflags['DIAMOND-SOLVE']
    ? 'glowing serenely'
    : DWDESCS[Math.min(s.counters.diamondCount ?? 0, DWDESCS.length - 1)];
  return `On the floor is a very small diamond shaped window which is ${state}.`;
}

/** `,WIZQDESCS` — the Wizard's quarters are never the same room twice. */
export const WIZQDESCS = [
  'sparsely furnished and almost monkish in its austerity.',
  'an opulently furnished seraglio out of an Arabian folktale.',
  'decorated in the Louis XIV style.',
  'overhung with palm-trees and lianas. The only furniture is a hammock.',
  'constructed of delicate and wispy cloud-stuffs.',
  'furnished in plastic and metal and looks like the control deck of a spaceship.',
  "a suburban bedroom out of the 1950's, complete with bunk beds.",
  'a dank and dimly lighted cave, its floor piled with furs and old bones.',
];

/** The balloon's M-LOOK arm, printed after the room you are drifting through. */
export function zork2VehicleDesc(s: WorldState, obj: string): string | null {
  return obj === 'BALLOON' ? balloonInside(s) : null;
}

/** Zork II's M-OBJDESC arms, for objects that describe themselves by state. */
export function zork2ObjDesc(s: WorldState, obj: string): string | null {
  if (obj === 'BALLOON') return balloonOutside(s);
  // Two objects have their LDESC rewritten by the routine that changes them
  // (<PUTP ... P?LDESC ...>), which is the same thing said a different way.
  if (obj === 'PRINCESS' && s.gflags['PRINCESS-AWAKE']) {
    return 'There is a dishevelled and slightly unkempt princess here.';
  }
  if (obj === 'AQUARIUM' && s.gflags['AQUARIUM-BROKEN']) {
    return 'A shattered aquarium fills the northern half of the room.';
  }
  if (obj === 'CERBERUS' && s.gflags['CERBERUS-LEASHED']) {
    return 'An insipidly grinning three-headed dog is wagging its tail here. It is wearing a huge dog collar.';
  }
  return null;
}

/** The description for `room`, or null to fall back to its extracted LDESC. */
export function zork2RoomDesc(
  s: WorldState,
  room: string,
  viewRoom?: (target: string) => string,
): string | null {
  const fn = ZORK2_ROOM_DESCS[room];
  return fn ? fn(s, viewRoom) : null;
}

export function hasDesc(room: string): boolean {
  return room in ZORK2_ROOM_DESCS;
}
