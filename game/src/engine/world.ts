// World-state container and object-tree operations (ports gmain.zil helpers).
import worldGen from '../data/world.gen.json';
import type { WorldData, WorldState, RoomDef, ObjDef, GameEvent } from './types';

export const DATA = worldGen as unknown as WorldData;
export const PLAYER = 'ADVENTURER';

export const DIRS = ['NORTH', 'SOUTH', 'EAST', 'WEST', 'NE', 'NW', 'SE', 'SW', 'UP', 'DOWN', 'IN', 'OUT', 'LAND', 'CROSS'] as const;

export function roomDef(id: string): RoomDef { return DATA.rooms[id]; }
export function objDef(id: string): ObjDef { return DATA.objects[id]; }
export function isRoom(id: string): boolean { return id in DATA.rooms; }

export function newState(): WorldState {
  const locs: Record<string, string | null> = {};
  const oflags: Record<string, Record<string, true>> = {};
  for (const [id, o] of Object.entries(DATA.objects)) {
    locs[id] = o.in ?? null;
    const f: Record<string, true> = {};
    for (const fl of o.flags) f[fl] = true;
    oflags[id] = f;
  }
  return {
    here: 'WEST-OF-HOUSE',
    locs, oflags,
    gflags: {},
    touched: {}, scoredRooms: {}, scoredTakes: {}, scoredCase: {}, fdescGone: {},
    daemons: {},
    counters: { score: 0, moves: 0, deaths: 0, matches: 6, wounds: 0, lampIdx: 0, lampTick: 100, candleIdx: 0, candleTick: 20, loadAllowed: 100 },
    thiefRoom: 'ROUND-ROOM', // matches THIEF's initial (IN ROUND-ROOM) in 1dungeon.zil
    thiefEngrossed: false,
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
export function contents(s: WorldState, container: string): string[] {
  return Object.keys(s.locs).filter((o) => s.locs[o] === container);
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
  const r = roomDef(room ?? s.here);
  if (r.flags.includes('ONBIT')) return true;
  // any lit light source in the room or carried
  const check = (holder: string): boolean =>
    contents(s, holder).some((o) => objectProvidesLight(s, o) || ((seeInside(s, o) || fset$(s, o, 'SURFACEBIT')) && check(o)));
  return check(room ?? s.here) || check(PLAYER);
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
