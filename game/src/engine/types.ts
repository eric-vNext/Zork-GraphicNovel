// Core world-model types, mirroring the ZIL structures in 1dungeon.zil.

export interface ExitDef {
  to?: string;       // destination room
  msg?: string;      // non-exit with failure message
  per?: string;      // routine-computed exit (handled in specials)
  ifFlag?: string;   // conditional on global flag
  ifDoor?: string;   // conditional on door object being open
  elseMsg?: string;  // message when condition fails
}

export interface RoomDef {
  desc: string;                    // short name, e.g. "West of House"
  ldesc?: string;                  // long description (verbatim from source)
  exits: Record<string, ExitDef>;
  flags: string[];                 // RLANDBIT, ONBIT, SACREDBIT, ...
  globals: string[];               // local-global objects visible here
  pseudo: string[];                // pseudo-object names
  action?: string;                 // ZIL room-action routine name
  value?: number;                  // score for first entry
}

export interface ObjDef {
  in?: string;
  synonyms: string[];
  adjectives: string[];
  desc?: string;    // short name, e.g. "brass lantern"
  fdesc?: string;   // first (untouched) room description
  ldesc?: string;   // room description
  text?: string;    // READ text
  flags: string[];
  action?: string;
  capacity?: number;
  size?: number;
  value?: number;   // score on first take
  tvalue?: number;  // score on trophy-case deposit
  strength?: number;
}

export interface WorldData {
  rooms: Record<string, RoomDef>;
  objects: Record<string, ObjDef>;
}

export type Verbosity = 'superbrief' | 'brief' | 'verbose';

export interface DaemonState { tick: number; enabled: boolean }

export interface WorldState {
  here: string;
  locs: Record<string, string | null>;          // object -> parent (room, object, 'ADVENTURER', null)
  oflags: Record<string, Record<string, true>>; // runtime object flags
  gflags: Record<string, boolean>;              // global flags (TROLL-FLAG, MAGIC-FLAG, ...)
  touched: Record<string, true>;                // visited rooms
  scoredRooms: Record<string, true>;
  scoredTakes: Record<string, true>;
  scoredCase: Record<string, true>;
  fdescGone: Record<string, true>;              // object has been disturbed (fdesc no longer shown)
  daemons: Record<string, DaemonState>;
  counters: Record<string, number>;             // score, moves, deaths, matches, lampIdx/Tick, ...
  thiefRoom: string;
  thiefEngrossed: boolean;
  verbosity: Verbosity;
  dead: boolean;
  won: boolean;
  grueTurns: number;                            // consecutive turns spent in darkness
  itRef: string | null;                         // what "it" refers to
  justArrived: boolean;                         // true for the clock tick right after a room entry:
                                                 // gives the player one beat to see the room before
                                                 // a same-turn combat daemon can steal its panel
}

// Semantic events the presentation layer consumes.
export type GameEvent =
  | { type: 'text'; text: string; cls?: 'room-name' | 'system' | 'death' | 'normal' }
  | { type: 'room'; room: string; dir?: string } // player is now here (panel + music); dir is the
                                                  // compass direction walked, when there was one —
                                                  // lets the panel slide in from that side
  | { type: 'shake' }                            // brief screen-shake pulse (serious wound, explosion, ...)
  | { type: 'panel'; key: string }              // event panel override, e.g. 'events/troll-fight'
  | { type: 'sfx'; name: string }
  | { type: 'score'; score: number; moves: number }
  | { type: 'death'; permanent: boolean }
  | { type: 'victory' }
  | { type: 'ask'; question: string; options: string[] } // disambiguation chips
  // Save/restore/restart are fulfilled by the store layer: the engine is
  // synchronous and storage-agnostic (IndexedDB is async), so SAVE/RESTORE
  // emit requests the same way ZIL's <SAVE> deferred to the interpreter.
  | { type: 'save-request' }
  | { type: 'restore-request' }
  | { type: 'restart' };
