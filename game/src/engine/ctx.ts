// Shared per-command context passed through verb handlers, specials, and daemons.
import type { WorldState } from './types';
import { Out } from './world';

export interface Ctx {
  s: WorldState;
  out: Out;
  verb: string;
  dobj?: string;
  iobj?: string;
  prep?: string;
  /** The raw word after INCANT or ANSWER, which is not an object. */
  word?: string;
  /**
   * `,WINNER` — who is being told to act. The player unless the command was
   * addressed to an actor ("robot, go south"); the parser resets it every turn.
   */
  winner: string;
  rng: () => number;                       // 0..1
  queue: (name: string, ticks: number) => void; // -1 = every turn
  /**
   * `<ENABLE <INT name>>` — resume a daemon with whatever countdown it still
   * has, queueing it with `ticksIfNew` if it has never run. This is how a lamp
   * switched off and on again keeps burning down rather than starting over.
   */
  enable: (name: string, ticksIfNew: number) => void;
  disable: (name: string) => void;
  enabled: (name: string) => boolean;
  die: (text: string, opts?: { panel?: string }) => void;
  winGame: () => void;
  moveTo: (room: string, describe?: boolean) => void; // teleport + describe
  /** DO-WALK: take an exit as though the player had typed the direction. */
  walk: (dir: string) => void;
  perform: (verb: string, dobj?: string, iobj?: string) => void; // re-dispatch
}

export function prob(ctx: Ctx, pct: number): boolean { return ctx.rng() * 100 < pct; }

export function pickOne<T>(ctx: Ctx, arr: T[]): T { return arr[Math.floor(ctx.rng() * arr.length)]; }

export const DUMMY = ['Look around.', 'Too late for that.', 'Have your eyes checked.'];
export const HO_HUM = [' doesn\'t seem to work.', ' isn\'t notably helpful.', ' has no effect.'];
export const YUKS = [
  'A valiant attempt.',
  'You can\'t be serious.',
  'An interesting idea...',
  'What a concept!',
];
