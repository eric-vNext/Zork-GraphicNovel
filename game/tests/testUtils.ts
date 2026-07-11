// Shared test helpers. Combat is genuinely probabilistic (ported from the
// original melee tables), so a fight can end with the PLAYER dying and being
// resurrected elsewhere — that's correct game behavior, not a bug. Tests that
// need "eventually win this fight" should snapshot/retry like a real player
// saving before a dangerous room, rather than assuming a fixed room/turn count.
import { Game } from '../src/engine/engine';
import { Out } from '../src/engine/world';

export function txt(g: Game, cmd: string): string {
  return g.execute(cmd).filter((e) => e.type === 'text').map((e: any) => e.text).join('\n');
}

/**
 * Repeatedly issues `attackCmd` from `fightRoom` until `winFlag` is set,
 * restoring a snapshot taken at the start of each attempt if the player
 * dies or leaves the room instead (mirrors real save-scum play).
 */
export function fightUntilWon(g: Game, fightRoom: string, winFlag: string, attackCmd: string, attempts = 60): void {
  const snap = g.exportSave();
  for (let attempt = 0; attempt < attempts && !g.s.gflags[winFlag]; attempt++) {
    for (let i = 0; i < 40 && !g.s.gflags[winFlag]; i++) {
      g.execute(attackCmd);
      if (g.s.dead || g.s.here !== fightRoom) break;
    }
    if (!g.s.gflags[winFlag]) g.importSave(snap, new Out());
  }
}
