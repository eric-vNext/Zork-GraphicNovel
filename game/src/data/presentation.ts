// Presentation facade.
//
// Each game ships its own room->panel/region map, music map, panel set and item
// art (`data/zorkN/presentation.ts`). This module holds the *active* game's
// tables behind live module bindings, so every consumer keeps importing
// `ROOM_PRES` / `REGION_MUSIC` / ... by name and simply sees whichever game is
// currently selected. `selectGame()` in `data/games.ts` installs them.
//
// Deliberately imports nothing from `games.ts`: the dependency runs one way, so
// selecting a game can't cycle back through the presentation layer.

/** A region name is a per-game string (Zork I: 'above' | 'house' | ...). */
export type Region = string;

export interface RoomPres {
  art: string;
  region: Region;
}

/** Dynamic panel selection based on world flags — room state variants. */
export type RoomArtFn = (
  room: string,
  gflags: Record<string, boolean>,
  oflags: (o: string, f: string) => boolean,
  caseTreasures?: number,
) => string;

export interface PresentationDef {
  /** Region -> music bed file stem. */
  regionMusic: Record<Region, string>;
  /** Room id -> base panel + region. */
  roomPres: Record<string, RoomPres>;
  /** Flag-aware panel selection for rooms with state variants. */
  roomArtFor: RoomArtFn;
  /** Panel keys that actually exist on disk; anything else falls back. */
  eventPanels: Set<string>;
  /** Panel key -> substitute panel key. */
  panelFallback: Record<string, string>;
  /** Object id -> item close-up art stem. */
  itemArt: Record<string, string>;
  /** Fallback panel when a room has no mapping at all. */
  defaultArt: string;
  /** Region used when a room has no mapping at all. */
  defaultRegion: Region;
  /** The three full-bleed interface plates, which are painted per game. */
  titleArt: string;
  deathArt: string;
  victoryArt: string;
}

// Live bindings, replaced wholesale by installPresentation().
export let REGION_MUSIC: Record<Region, string> = {};
export let ROOM_PRES: Record<string, RoomPres> = {};
export let EVENT_PANELS: Set<string> = new Set();
export let PANEL_FALLBACK: Record<string, string> = {};
export let ITEM_ART: Record<string, string> = {};
export let DEFAULT_ART = 'passage';
export let DEFAULT_REGION: Region = 'underground';

let roomArt: RoomArtFn = (room) => ROOM_PRES[room]?.art ?? DEFAULT_ART;

export function roomArtFor(
  room: string,
  gflags: Record<string, boolean>,
  oflags: (o: string, f: string) => boolean,
  caseTreasures = 0,
): string {
  return roomArt(room, gflags, oflags, caseTreasures);
}

export function installPresentation(def: PresentationDef): void {
  REGION_MUSIC = def.regionMusic;
  ROOM_PRES = def.roomPres;
  EVENT_PANELS = def.eventPanels;
  PANEL_FALLBACK = def.panelFallback;
  ITEM_ART = def.itemArt;
  DEFAULT_ART = def.defaultArt;
  DEFAULT_REGION = def.defaultRegion;
  roomArt = def.roomArtFor;
}

/**
 * A stand-in presentation for a game whose art has not been generated yet
 * (phases 5 and 8 of docs/Prompt-Trilogy.md). Every room maps to one panel and
 * one music bed, so the engine and its tests can run the game end to end while
 * the asset work is still outstanding.
 */
export function placeholderPresentation(
  rooms: Record<string, unknown>,
  region: Region,
  music: string,
  art = 'passage',
): PresentationDef {
  const roomPres: Record<string, RoomPres> = {};
  for (const id of Object.keys(rooms)) roomPres[id] = { art, region };
  return {
    regionMusic: { [region]: music },
    roomPres,
    roomArtFor: () => art,
    eventPanels: new Set<string>(),
    panelFallback: {},
    itemArt: {},
    defaultArt: art,
    defaultRegion: region,
    titleArt: 'ui/title-screen',
    deathArt: 'ui/death-screen',
    victoryArt: 'ui/victory-screen',
  };
}
