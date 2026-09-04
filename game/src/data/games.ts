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
import { installPresentation, type PresentationDef } from './presentation';
import zork1World from './zork1/world.gen.json';
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
  presentation: PresentationDef;
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
      [350, 'Master Adventurer'], [330, 'Wizard'], [300, 'Master'], [200, 'Adventurer'],
      [100, 'Junior Adventurer'], [50, 'Novice Adventurer'], [25, 'Amateur Adventurer'],
      [0, 'Beginner'],
    ],
    line: (score, moves, rank) =>
      `Your score is ${score} (total of 350 points), in ${moves} ${moveWord(moves)}.\nThis gives you the rank of ${rank}.`,
  },
  presentation: ZORK1_PRESENTATION,
};

/** Every game the build knows about. Zork II and III land in phases 6-8. */
export const GAMES: Partial<Record<GameNumber, GameDef>> = { 1: ZORK1 };

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
 * `Game` or restoring a save. Throws for a game that isn't built yet, so a
 * stale save can't silently load Zork I's world under Zork II's rules.
 */
export function selectGame(n: GameNumber): GameDef {
  const def = GAMES[n];
  if (!def) throw new Error(`Zork ${n} is not part of this build yet.`);
  if (def !== active) {
    active = def;
    installPresentation(def.presentation);
  }
  return def;
}

export function rankFor(score: number): string {
  return active.scoring.ranks.find(([min]) => score >= min)?.[1] ?? '';
}
