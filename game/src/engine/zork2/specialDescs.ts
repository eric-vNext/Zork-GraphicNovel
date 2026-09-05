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
import { fset$ } from '../world';

type Desc = (s: WorldState) => string | null;

/** P-DOOR: the palantir rooms' shared "there is a door" clause. */
function palantirDoor(s: WorldState, dir: string, lid: string): string {
  if (fset$(s, lid, 'OPENBIT')) {
    return `On the ${dir} side of the room is a stone door which is open.`;
  }
  return `On the ${dir} side of the room is a stone door with a small keyhole in it.`;
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

  'MENHIR-ROOM': () =>
    'This is a large room which was evidently used once as a quarry. Many large limestone chunks lie helter-skelter around the room. Some are rough-hewn and unworked, others smooth and well-finished. One side of the room appears to have been used to quarry building blocks, the other to produce menhirs (standing stones). Obvious passages lead north and south.',

  'CRYPT-ROOM': (s) => {
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

  'TINY-ROOM': (s) =>
    `This is a tiny room carved out of the wall of the ravine. There is an exit down a precarious climb. ${palantirDoor(s, 'north', 'LID-1')}`,

  'DREARY-ROOM': (s) =>
    `This is a small and rather dreary room, eerily illuminated by a red glow emanating from a crack in one wall. The light falls upon a dusty wooden table in the center of the room. ${palantirDoor(s, 'south', 'LID-2')}`,
};

/** The description for `room`, or null to fall back to its extracted LDESC. */
export function zork2RoomDesc(s: WorldState, room: string): string | null {
  const fn = ZORK2_ROOM_DESCS[room];
  return fn ? fn(s) : null;
}

export function hasDesc(room: string): boolean {
  return room in ZORK2_ROOM_DESCS;
}
