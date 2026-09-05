// World-state container and object-tree operations (ports gmain.zil helpers).
import { activeGame, gameNumber } from '../data/games';
import type { WorldData, WorldState, RoomDef, ObjDef, GameEvent } from './types';
import { SAVE_VERSION } from './types';

/**
 * The active game's rooms and objects. A getter pair rather than a plain
 * object so that `selectGame()` swaps the world under every existing
 * `DATA.rooms[...]` call site without any of them having to change.
 */
export const DATA: WorldData = {
  get rooms() { return activeGame().world.rooms; },
  get objects() { return activeGame().world.objects; },
};
export const PLAYER = 'ADVENTURER';

// `<DIRECTIONS ...>` across the three games. Zork I omits CROSS; Zork III adds
// ENTER, which it uses as its IN direction on the mirror-box rooms (see
// utils/extract-world.py).
export const DIRS = ['NORTH', 'SOUTH', 'EAST', 'WEST', 'NE', 'NW', 'SE', 'SW', 'UP', 'DOWN', 'IN', 'OUT', 'LAND', 'CROSS', 'ENTER'] as const;

export function roomDef(id: string): RoomDef { return DATA.rooms[id]; }
export function objDef(id: string): ObjDef { return DATA.objects[id]; }
export function isRoom(id: string): boolean { return id in DATA.rooms; }

export function newState(): WorldState {
  const def = activeGame();
  const locs: Record<string, string | null> = {};
  const oflags: Record<string, Record<string, true>> = {};
  for (const [id, o] of Object.entries(def.world.objects)) {
    locs[id] = o.in ?? null;
    const f: Record<string, true> = {};
    for (const fl of o.flags) f[fl] = true;
    oflags[id] = f;
  }
  return {
    saveVersion: SAVE_VERSION,
    game: def.number,
    here: def.startRoom,
    locs, oflags,
    gflags: {},
    touched: {}, scoredRooms: {}, scoredTakes: {}, scoredCase: {}, fdescGone: {},
    daemons: {},
    counters: { score: 0, moves: 0, deaths: 0, matches: 6, wounds: 0, lampIdx: 0, lampTick: 100, candleIdx: 0, candleTick: 20, loadAllowed: 100 },
    actorRooms: { ...def.actorRooms },
    actorFlags: {},
    gvars: {},
    mungedRooms: {},
    verbosity: 'brief',
    dead: false, won: false,
    grueTurns: 0,
    itRef: null,
    justArrived: false,
  };
}

// ---- flags -----------------------------------------------------------------
export function fset(s: WorldState, obj: string, flag: string): void { (s.oflags[obj] ??= {})[flag] = true; }
export function fclear(s: WorldState, obj: string, flag: string): void { if (s.oflags[obj]) delete s.oflags[obj][flag]; }
export function fset$(s: WorldState, obj: string, flag: string): boolean { return !!s.oflags[obj]?.[flag]; }

// ---- object tree -----------------------------------------------------------
export function locOf(s: WorldState, obj: string): string | null { return s.locs[obj] ?? null; }
export function moveObj(s: WorldState, obj: string, to: string | null): void { s.locs[obj] = to; }
export function removeObj(s: WorldState, obj: string): void { s.locs[obj] = null; }
/**
 * A container's children, in ZIL's `FIRST?`/`NEXT?` order.
 *
 * ZIL builds each container's list by pushing, so the object defined *last* in
 * the source comes out first. Listing in definition order put the brass lantern
 * above the elvish sword in the Living Room, where the original does the
 * reverse.
 */
export function contents(s: WorldState, container: string): string[] {
  const out: string[] = [];
  for (const o of Object.keys(s.locs)) if (s.locs[o] === container) out.push(o);
  return out.reverse();
}
export function inPlayer(s: WorldState, obj: string): boolean {
  let p = locOf(s, obj);
  while (p) {
    if (p === PLAYER) return true;
    p = locOf(s, p);
  }
  return false;
}
export function inventory(s: WorldState): string[] { return contents(s, PLAYER); }

/** The room an object is ultimately located in (or null). */
export function roomOf(s: WorldState, obj: string): string | null {
  let p: string | null = obj === PLAYER ? s.here : locOf(s, obj);
  const seen = new Set<string>();
  while (p && !isRoom(p)) {
    if (seen.has(p)) return null;
    seen.add(p);
    p = p === PLAYER ? s.here : locOf(s, p);
  }
  return p;
}

/** Objects whose contents are visible: open or transparent containers. */
export function seeInside(s: WorldState, obj: string): boolean {
  return fset$(s, obj, 'OPENBIT') || fset$(s, obj, 'TRANSBIT');
}

/** All objects visible to the player right now (room + inventory + local-globals + nested). */
export function visibleObjects(s: WorldState): string[] {
  const out = new Set<string>();
  const addTree = (holder: string) => {
    for (const o of contents(s, holder)) {
      if (fset$(s, o, 'INVISIBLE')) continue;
      out.add(o);
      if (seeInside(s, o) || fset$(s, o, 'SURFACEBIT')) addTree(o);
    }
  };
  addTree(s.here);
  addTree(PLAYER);
  const r = roomDef(s.here);
  for (const g of r.globals ?? []) out.add(g);
  // objects that live in GLOBAL-OBJECTS are reachable everywhere
  for (const [id, o] of Object.entries(DATA.objects)) {
    if (o.in === 'GLOBAL-OBJECTS' && !fset$(s, id, 'INVISIBLE')) out.add(id);
  }
  return [...out];
}

/**
 * Scope for ALL/EVERYTHING (take all, drop all, ...). Unlike visibleObjects,
 * this does NOT reach into ordinary containers (bottles, boxes, cases) even
 * transparent ones — only loose items directly in the room/inventory, plus
 * items resting on open surfaces (tables). Matches the original ZIL "take
 * all" convention: you take what's lying around, not what's sealed away.
 */
export function allScopeObjects(s: WorldState): string[] {
  const out = new Set<string>();
  const addTree = (holder: string) => {
    for (const o of contents(s, holder)) {
      if (fset$(s, o, 'INVISIBLE')) continue;
      out.add(o);
      if (fset$(s, o, 'SURFACEBIT')) addTree(o);
    }
  };
  addTree(s.here);
  addTree(PLAYER);
  return [...out];
}

/** Is the object reachable for taking/manipulation (not just visible through glass)? */
export function reachable(s: WorldState, obj: string): boolean {
  let p = locOf(s, obj);
  while (p && p !== s.here && p !== PLAYER) {
    if (!isRoom(p) && !fset$(s, p, 'OPENBIT') && !fset$(s, p, 'SURFACEBIT')) return false;
    p = locOf(s, p);
  }
  return true;
}

// ---- light -----------------------------------------------------------------
export function objectProvidesLight(s: WorldState, o: string): boolean {
  return fset$(s, o, 'ONBIT') && (fset$(s, o, 'LIGHTBIT') || fset$(s, o, 'FLAMEBIT'));
}

export function roomLit(s: WorldState, room?: string): boolean {
  const here = room ?? s.here;
  const r = roomDef(here);
  // A room's ONBIT can be set at runtime as well as in the source: the Crypt
  // takes its own bit off and puts it back around every look, which is how it
  // can describe itself as dark while still letting you act (2actions.zil
  // CRYPT-ROOM-FCN).
  if (r.flags.includes('ONBIT') || fset$(s, here, 'ONBIT')) return true;
  // any lit light source in the room or carried
  const check = (holder: string): boolean =>
    contents(s, holder).some((o) => objectProvidesLight(s, o) || ((seeInside(s, o) || fset$(s, o, 'SURFACEBIT')) && check(o)));
  return check(room ?? s.here) || check(PLAYER);
}

// ---- room munging ----------------------------------------------------------
/**
 * MUNG-ROOM (gverbs.zil:2237). The room is gone: GOTO stops printing its name
 * and prints `desc` instead of moving you there. Zork II refuses to mung Inside
 * the Barrow, which would otherwise strand a player on their way back out.
 */
export function mungRoom(s: WorldState, room: string, desc: string): void {
  if (gameNumber() === 2 && room === 'INSIDE-BARROW') return;
  fset(s, room, 'RMUNGBIT');
  s.mungedRooms[room] = desc;
}

/** The replacement description for a munged room, or null if it still stands. */
export function roomMunged(s: WorldState, room: string): string | null {
  return fset$(s, room, 'RMUNGBIT') ? (s.mungedRooms[room] ?? null) : null;
}

// ---- naming ----------------------------------------------------------------
export function theName(id: string): string {
  const d = objDef(id)?.desc ?? id.toLowerCase().replace(/-/g, ' ');
  return `the ${d}`;
}
export function aName(id: string): string {
  const d = objDef(id)?.desc ?? id.toLowerCase().replace(/-/g, ' ');
  return /^[aeiou]/i.test(d) ? `an ${d}` : `a ${d}`;
}

// ---- weight (LOAD limits) --------------------------------------------------
export function objWeight(s: WorldState, obj: string): number {
  let w = objDef(obj)?.size ?? 5;
  for (const c of contents(s, obj)) w += objWeight(s, c);
  return w;
}
export function loadWeight(s: WorldState): number {
  return inventory(s).reduce((sum, o) => sum + objWeight(s, o), 0);
}

// ---- event buffer helper ---------------------------------------------------
export class Out {
  events: GameEvent[] = [];
  tell(text: string, cls?: 'room-name' | 'system' | 'death' | 'normal'): void {
    this.events.push({ type: 'text', text, cls });
  }
  emit(e: GameEvent): void { this.events.push(e); }
}
