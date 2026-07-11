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
  rng: () => number;                       // 0..1
  queue: (name: string, ticks: number) => void; // -1 = every turn
  disable: (name: string) => void;
  enabled: (name: string) => boolean;
  die: (text: string, opts?: { panel?: string }) => void;
  winGame: () => void;
  moveTo: (room: string, describe?: boolean) => void; // teleport + describe
  perform: (verb: string, dobj?: string, iobj?: string) => void; // re-dispatch
}

export function prob(ctx: Ctx, pct: number): boolean { return ctx.rng() * 100 < pct; }

export function pickOne<T>(ctx: Ctx, arr: T[]): T { return arr[Math.floor(ctx.rng() * arr.length)]; }

export const DUMMY = ['Look around.', 'Too late for that.', 'Have your eyes checked.'];
export const HO_HUM = [' does nothing.', ' isn\'t notably helpful.', ' has no effect.'];
export const YUKS = [
  'A valiant attempt.',
  'You can\'t be serious.',
  'An interesting idea...',
  'What a concept!',
];
