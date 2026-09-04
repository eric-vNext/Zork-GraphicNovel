// The thief's wanderings (I-THIEF in 1actions.zil). Gives the thief a real,
// evolving position that marches through the room list each turn — robbing
// any previously-visited room he currently occupies, not just the player's
// current room — instead of a flat "9% chance he appears here" coin flip.
//
// Scoped simplification (see docs/handoff-2026-07-11.md item 5): the source's
// I-THIEF can re-run itself mid-turn via <AGAIN> after a move, letting the
// thief process up to two rooms in a single player turn, and its
// THIEF-VS-ADVENTURER co-location routine has ~6 distinct probabilistic
// branches with their own flavor text. This port advances at most one room
// per turn and keeps this project's existing (already-tested) encounter
// flavor text for the co-located case, rather than reproducing that whole
// branch tree byte for byte. HACK-TREASURES' incremental reveal-on-return-
// home behavior is also not ported; treasures still surface correctly on the
// thief's death via killThief() in melee.ts.
import type { Ctx } from './ctx';
import { prob, pickOne } from './ctx';
import { fset, fclear, fset$, moveObj, contents, roomOf, roomDef, PLAYER, DATA } from './world';

const ROOM_LIST = Object.keys(DATA.rooms);

function isValidThiefRoom(id: string): boolean {
  const r = roomDef(id);
  return !r.flags.includes('SACREDBIT') && r.flags.includes('RLANDBIT');
}

function nextThiefRoom(from: string): string {
  let idx = ROOM_LIST.indexOf(from);
  for (let i = 0; i < ROOM_LIST.length; i++) {
    idx = (idx + 1) % ROOM_LIST.length;
    if (isValidThiefRoom(ROOM_LIST[idx])) return ROOM_LIST[idx];
  }
  return from;
}

/** ROB: each treasure in the room has an independent 75% chance of vanishing into his bag. */
function robRoom(ctx: Ctx, room: string): void {
  const { s } = ctx;
  const items = contents(s, room).filter(
    (o) => !fset$(s, o, 'INVISIBLE') && !fset$(s, o, 'SACREDBIT') && (DATA.objects[o]?.tvalue ?? 0) > 0
  );
  for (const item of items) {
    if (prob(ctx, 75)) {
      moveObj(s, item, 'LARGE-BAG');
      if (item === 'EGG') s.gflags['THIEF-HAS-EGG'] = true;
    }
  }
}

/** STEAL-JUNK: steals at most one non-treasure TAKEBIT item — always the stiletto if it's loose. */
function stealJunk(ctx: Ctx, room: string): void {
  const { s } = ctx;
  const items = contents(s, room).filter(
    (o) => (DATA.objects[o]?.tvalue ?? 0) === 0 && fset$(s, o, 'TAKEBIT') &&
      !fset$(s, o, 'SACREDBIT') && !fset$(s, o, 'INVISIBLE')
  );
  for (const item of items) {
    if (item === 'STILETTO' || prob(ctx, 10)) {
      moveObj(s, item, 'LARGE-BAG');
      return;
    }
  }
}

export function thiefDaemon(ctx: Ctx): void {
  const { s, out } = ctx;
  if (s.gflags['THIEF-DEAD'] || s.dead) return;
  if (s.here === 'TREASURE-ROOM') return; // handled by fightDaemon / the TREASURE-ROOM special

  if (s.gflags['THIEF-HERE']) {
    // He's manifesting to the player right now; he leaves this turn, robbing
    // the room or the player's pockets first if there's anything worth it.
    const roomLoot = contents(s, s.here).filter(
      (o) => (DATA.objects[o]?.tvalue ?? 0) > 0 && !fset$(s, o, 'NDESCBIT') && !fset$(s, o, 'SACREDBIT')
    );
    const invLoot = contents(s, PLAYER).filter((o) => (DATA.objects[o]?.tvalue ?? 0) > 0);
    let robbed: 'room' | 'player' | null = null;
    if (roomLoot.length) {
      const item = pickOne(ctx, roomLoot);
      moveObj(s, item, 'LARGE-BAG');
      if (item === 'EGG') s.gflags['THIEF-HAS-EGG'] = true;
      robbed = 'room';
    } else if (invLoot.length) {
      const item = pickOne(ctx, invLoot);
      moveObj(s, item, 'LARGE-BAG');
      if (item === 'EGG') s.gflags['THIEF-HAS-EGG'] = true;
      robbed = 'player';
    }
    if (robbed === 'player') {
      out.tell('The thief just left, still carrying his large bag. You may not have noticed that he robbed you blind first.');
      out.emit({ type: 'panel', key: 'events/thief-steals' });
    } else if (robbed === 'room') {
      out.tell('The thief just left, still carrying his large bag. You may not have noticed that he appropriated the valuables in the room.');
    } else {
      out.tell('The thief, finding nothing of value, left disgusted.');
    }
    s.gflags['THIEF-HERE'] = false;
    fset(s, 'THIEF', 'INVISIBLE');
    s.actorRooms.THIEF = nextThiefRoom(s.actorRooms.THIEF);
    return;
  }

  // Off-stage: rob/pilfer whatever room he's currently sitting in, if the
  // player has ever been there — this is what makes it "room-graph pathing"
  // rather than appearance probabilities: treasures can now vanish from
  // rooms the player isn't even standing in.
  if (s.actorRooms.THIEF !== 'TREASURE-ROOM' && s.touched[s.actorRooms.THIEF]) {
    robRoom(ctx, s.actorRooms.THIEF);
    stealJunk(ctx, s.actorRooms.THIEF);
  }

  // Encounter check: he only manifests where the player actually is, and
  // only in an unlit room with the troll not present (a lit/guarded room
  // isn't his kind of territory).
  const hereRoom = roomDef(s.here);
  const trollHere = roomOf(s, 'TROLL') === s.here && !fset$(s, 'TROLL', 'INVISIBLE');
  if (s.actorRooms.THIEF === s.here && !hereRoom.flags.includes('ONBIT') && !trollHere && prob(ctx, 30)) {
    out.tell('Someone carrying a large bag is casually leaning against one of the walls here. He does not speak, but it is clear from his aspect that the bag will be taken only over his dead body.');
    out.emit({ type: 'panel', key: 'characters/thief' });
    out.emit({ type: 'sfx', name: 'thief-snicker' });
    s.gflags['THIEF-HERE'] = true;
    moveObj(s, 'THIEF', s.here);
    fclear(s, 'THIEF', 'INVISIBLE');
    return;
  }

  s.actorRooms.THIEF = nextThiefRoom(s.actorRooms.THIEF);
}
