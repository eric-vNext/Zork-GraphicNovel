// The game registry.
//
// ZIL compiled one game at a time and resolved the differences between them at
// compile time through `,ZORK-NUMBER` (63 branch sites in the shared
// `gverbs.zil` alone — see docs/trilogy-expansion-brief.md §2). We keep that
// shape: exactly one game is active at a time, `gameNumber()` is the runtime
// stand-in for `,ZORK-NUMBER`, and everything that differs between the three
// lives in a GameDef rather than being threaded through every call signature.
//
// A GameDef is data, not behaviour: the engine reads it, it never calls back
// into the engine.

import type { GameNumber, WorldData } from '../engine/types';
import { installPresentation, placeholderPresentation, type PresentationDef } from './presentation';
import zork1World from './zork1/world.gen.json';
import zork2World from './zork2/world.gen.json';
import zork3World from './zork3/world.gen.json';
import { ZORK1_PRESENTATION } from './zork1/presentation';

export interface ScoringDef {
  /** `SCORE-MAX` from the source. */
  max: number;
  /** Rank ladder, highest threshold first. Empty for games without ranks. */
  ranks: Array<[number, string]>;
  /**
   * The SCORE line, ported from each game's `V-SCORE`. Zork I and II report a
   * score out of a total plus a rank; Zork III reports "potential" out of 7
   * and has no ranks at all.
   */
  line: (score: number, moves: number, rank: string) => string;
}

export interface GameDef {
  number: GameNumber;
  /** Directory/asset namespace: 'zork1' | 'zork2' | 'zork3'. */
  id: string;
  title: string;
  subtitle: string;
  world: WorldData;
  /** Where a new game starts. */
  startRoom: string;
  /** Daemons enabled from turn one (ZIL's initial `<QUEUE>`/`ENABLE` calls). */
  initialDaemons: string[];
  /** Starting values for `WorldState.actorRooms`. */
  actorRooms: Record<string, string>;
  scoring: ScoringDef;
  /** V-VERSION's banner (gverbs.zil:99) and the release/serial line. */
  version: string;
  presentation: PresentationDef;
  /**
   * Handlers for the few shared-library branches whose Zork II / III arms call
   * a routine defined in that game's own actions file. `verbs.ts` looks them up
   * through `runGameHook`; a game that has not been ported yet simply has none,
   * and those branches fall through to the generic behaviour.
   */
  hooks?: Record<string, (ctx: any) => boolean>;
  /** False until the game's content is ported; the UI refuses to start it. */
  playable: boolean;
}

const moveWord = (moves: number) => (moves === 1 ? 'move' : 'moves');

export const ZORK1: GameDef = {
  number: 1,
  id: 'zork1',
  title: 'Zork I',
  subtitle: 'The Great Underground Empire',
  world: zork1World as unknown as WorldData,
  startRoom: 'WEST-OF-HOUSE',
  initialDaemons: ['I-THIEF', 'I-FIGHT', 'I-SWORD', 'I-CYCLOPS', 'I-FOREST-ROOM'],
  // THIEF's initial `(IN ROUND-ROOM)` in 1dungeon.zil.
  actorRooms: { THIEF: 'ROUND-ROOM' },
  scoring: {
    max: 350,
    ranks: [
      // 1actions.zil V-SCORE tests `<G? ,SCORE n>`, so each threshold is
      // strictly greater than the number in the source.
      [350, 'Master Adventurer'], [331, 'Wizard'], [301, 'Master'], [201, 'Adventurer'],
      [101, 'Junior Adventurer'], [51, 'Novice Adventurer'], [26, 'Amateur Adventurer'],
      [0, 'Beginner'],
    ],
    line: (score, moves, rank) =>
      `Your score is ${score} (total of 350 points), in ${moves} ${moveWord(moves)}.\nThis gives you the rank of ${rank}.`,
  },
  version: 'ZORK I: The Great Underground Empire\nInfocom interactive fiction - a fantasy story\n'
    + 'Copyright (c) 1981, 1982, 1983, 1984, 1985, 1986 Infocom, Inc. All rights reserved.\n'
    + 'ZORK is a registered trademark of Infocom, Inc.\nRelease 88 / Serial number 840726',
  presentation: ZORK1_PRESENTATION,
  playable: true,
};

/**
 * Zork II. World data is extracted; the specials, daemons and art land in
 * phases 4-5 of docs/Prompt-Trilogy.md, so it is not playable yet — but it is
 * selectable, which is what makes the shared library's `,ZORK-NUMBER 2` arms
 * testable before the content exists.
 */
export const ZORK2: GameDef = {
  number: 2,
  id: 'zork2',
  title: 'Zork II',
  subtitle: 'The Wizard of Frobozz',
  world: zork2World as unknown as WorldData,
  startRoom: 'INSIDE-BARROW', // 2dungeon.zil GO
  initialDaemons: ['I-WIZARD'],
  actorRooms: {},
  scoring: {
    max: 400,
    ranks: [
      [400, 'Master Adventurer'], [361, 'Wizard'], [321, 'Master'], [241, 'Adventurer'],
      [161, 'Junior Adventurer'], [81, 'Novice Adventurer'], [41, 'Amateur Adventurer'],
      [0, 'Beginner'],
    ],
    line: (score, moves, rank) =>
      `Your score is ${score} (total of 400 points), in ${moves} ${moveWord(moves)}.\nThis gives you the rank of ${rank}.`,
  },
  version: 'ZORK II: The Wizard of Frobozz\nInfocom interactive fiction - a fantasy story\n'
    + 'Copyright (c) 1981, 1982, 1983, 1986 Infocom, Inc. All rights reserved.\n'
    + 'ZORK is a registered trademark of Infocom, Inc.\nRelease 48 / Serial number 840904',
  presentation: placeholderPresentation(zork2World.rooms, 'wizard', 'underground'),
  playable: false,
};

/**
 * Zork III. Scores nothing: one valued object, `SCORE-MAX 7`, and V-SCORE
 * reports "potential" with no rank ladder at all (3actions.zil:2066).
 */
export const ZORK3: GameDef = {
  number: 3,
  id: 'zork3',
  title: 'Zork III',
  subtitle: 'The Dungeon Master',
  world: zork3World as unknown as WorldData,
  startRoom: 'ZORK2-STAIR', // 3dungeon.zil GO
  initialDaemons: ['I-VIEW-CHANGE'],
  actorRooms: {},
  scoring: {
    max: 7,
    ranks: [],
    line: (score, moves) =>
      `Your potential is ${score} of a possible 7, in ${moves} ${moveWord(moves)}.`,
  },
  version: 'ZORK III: The Dungeon Master\nInfocom interactive fiction - a fantasy story\n'
    + 'Copyright 1982, 1983, 1984, 1986 Infocom, Inc. All rights reserved.\n'
    + 'ZORK is a registered trademark of Infocom, Inc.\nRelease 17 / Serial number 840727',
  presentation: placeholderPresentation(zork3World.rooms, 'dungeon', 'underground'),
  playable: false,
};

/** Every game the build knows about. */
export const GAMES: Partial<Record<GameNumber, GameDef>> = { 1: ZORK1, 2: ZORK2, 3: ZORK3 };

let active: GameDef = ZORK1;
installPresentation(active.presentation);

/** The runtime stand-in for ZIL's `,ZORK-NUMBER`. */
export function gameNumber(): GameNumber {
  return active.number;
}

export function activeGame(): GameDef {
  return active;
}

/**
 * Make `n` the active game. Idempotent, and safe to call before constructing a
 * `Game` or restoring a save. Selecting a game whose content is not ported yet
 * is allowed — that is how the shared library's per-game arms get exercised —
 * but `playable` gates whether the UI will start it.
 */
export function selectGame(n: GameNumber): GameDef {
  const def = GAMES[n];
  if (!def) throw new Error(`Zork ${n} is not a known game.`);
  if (def !== active) {
    active = def;
    installPresentation(def.presentation);
  }
  return def;
}

export function rankFor(score: number): string {
  return active.scoring.ranks.find(([min]) => score >= min)?.[1] ?? '';
}
