// Zork II's object and room ACTION routines (2actions.zil).
//
// Zork II has 189 of them. They land here game by game; anything not yet
// ported simply falls through to the shared verb defaults, which is what the
// ZIL does when a routine returns false.
import type { Ctx } from '../ctx';

type Handler = (ctx: Ctx) => boolean;

/** Per-object ACTION routines. */
export const OBJ_ACTIONS: Record<string, Handler> = {};

/** Per-room ACTION routines, for the M-ENTER and M-END phases. */
export const ROOM_ACTIONS: Record<string, (ctx: Ctx, phase: 'enter' | 'end') => boolean> = {};

/** `(DIR PER ROUTINE)` exits. Zork II has 11. */
export const SPECIAL_EXITS: Record<string, (ctx: Ctx) => string | null> = {};

export function objAction(ctx: Ctx, obj?: string): boolean {
  if (!obj) return false;
  return OBJ_ACTIONS[obj]?.(ctx) ?? false;
}

export function roomAction(ctx: Ctx, room: string, phase: 'enter' | 'end'): boolean {
  return ROOM_ACTIONS[room]?.(ctx, phase) ?? false;
}

export function specialExit(ctx: Ctx, per: string): string | null {
  return SPECIAL_EXITS[per]?.(ctx) ?? null;
}

export const ZORK2_SPECIALS = { objAction, roomAction, specialExit };
