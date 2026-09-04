// Room and object description (ports DESCRIBE-ROOM / DESCRIBE-OBJECT /
// PRINT-CONT / FIRSTER in gverbs.zil). Four of those have per-game arms.
import type { WorldState } from './types';
import { Out, DATA, roomDef, objDef, contents, fset$, roomLit, seeInside, theName, aName } from './world';
import { dynamicRoomDesc, dynamicObjDesc } from './specialDescs';
import { gameNumber } from '../data/games';
import * as spells from './spells';

export function describeRoom(s: WorldState, out: Out, force = false): void {
  const r = roomDef(s.here);
  if (!roomLit(s)) {
    out.tell('It is pitch black. You are likely to be eaten by a grue.');
    return;
  }
  out.tell(r.desc, 'room-name');
  const first = !s.touched[s.here];
  if (force || first || s.verbosity === 'verbose') {
    const dyn = dynamicRoomDesc(s, s.here);
    if (dyn) out.tell(dyn);
    else if (r.ldesc) out.tell(r.ldesc.replace(/\n/g, ' '));
  }
  // gverbs.zil:1653 — Zork I clears TOUCHBIT on maze rooms so they describe
  // themselves in full every single visit; that disorientation is the puzzle.
  if (gameNumber() === 1 && r.flags.includes('MAZEBIT')) delete s.touched[s.here];
  describeObjects(s, out);
}

export function describeObjects(s: WorldState, out: Out): void {
  const items = contents(s, s.here).filter(
    (o) => !fset$(s, o, 'INVISIBLE') && !fset$(s, o, 'NDESCBIT') && o !== 'ADVENTURER'
  );
  for (const o of items) {
    const d = objDef(o);
    const dyn = dynamicObjDesc(s, o);
    if (dyn) out.tell(dyn);
    else if (d.fdesc && !s.fdescGone[o]) out.tell(d.fdesc.replace(/\n/g, ' '));
    else if (d.ldesc) out.tell(d.ldesc.replace(/\n/g, ' '));
    // gverbs.zil:1716 — Zork II notes a floated object in the room listing.
    else out.tell(`There is ${aName(o)} here${gameNumber() === 2 ? spells.describeSuffix(s, o) : ''}.`);
    // visible contents of open/transparent containers (actors don't spill their
    // held weapon in the room description — that's revealed only in combat text)
    if (!fset$(s, o, 'ACTORBIT')) {
      const inner = containerListing(s, o, 0);
      if (inner) out.tell(inner);
    }
  }
}

export function containerListing(s: WorldState, container: string, depth: number): string | null {
  if (!seeInside(s, container) && !fset$(s, container, 'SURFACEBIT')) return null;
  const inner = contents(s, container).filter((o) => !fset$(s, o, 'INVISIBLE'));
  if (!inner.length) return null;
  const pad = '  '.repeat(depth);
  // FIRSTER (gverbs.zil:1819): the Zork I trophy case gets its own header.
  const header = gameNumber() === 1 && container === 'TROPHY-CASE'
    ? 'Your collection of treasures consists of:'
    : fset$(s, container, 'SURFACEBIT')
      ? `Sitting on the ${objDef(container).desc} is:`
      : fset$(s, container, 'ACTORBIT')
        ? `The ${objDef(container).desc} is holding:`
        : `The ${objDef(container).desc} contains:`;
  const lines = [`${pad}${header}`];
  for (const o of inner) {
    lines.push(`${pad}  ${cap(aName(o).replace(/^an? /, (m) => m))}`);
    const nested = containerListing(s, o, depth + 1);
    if (nested) lines.push(nested);
  }
  return lines.join('\n');
}

export function cap(x: string): string { return x.charAt(0).toUpperCase() + x.slice(1); }

export function listInventory(s: WorldState, out: Out): void {
  const inv = contents(s, 'ADVENTURER');
  if (!inv.length) { out.tell('You are empty-handed.'); return; }
  const lines = ['You are carrying:'];
  for (const o of inv) {
    lines.push(`  ${cap(aName(o).replace(/^./, (c) => c))}`);
    const nested = containerListing(s, o, 1);
    if (nested) lines.push(nested);
  }
  out.tell(lines.join('\n'));
}
