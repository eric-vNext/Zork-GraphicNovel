// Room and object description (ports the M-LOOK/describers in gmain.zil).
import type { WorldState } from './types';
import { Out, DATA, roomDef, objDef, contents, fset$, roomLit, seeInside, theName, aName } from './world';
import { dynamicRoomDesc } from './specialDescs';

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
  describeObjects(s, out);
}

export function describeObjects(s: WorldState, out: Out): void {
  const items = contents(s, s.here).filter(
    (o) => !fset$(s, o, 'INVISIBLE') && !fset$(s, o, 'NDESCBIT') && o !== 'ADVENTURER'
  );
  const plain: string[] = [];
  for (const o of items) {
    const d = objDef(o);
    if (d.fdesc && !s.fdescGone[o]) out.tell(d.fdesc.replace(/\n/g, ' '));
    else if (d.ldesc) out.tell(d.ldesc.replace(/\n/g, ' '));
    else plain.push(o);
    // visible contents of open/transparent containers
    const inner = containerListing(s, o, 0);
    if (inner) out.tell(inner);
  }
  if (plain.length === 1) out.tell(`There is ${aName(plain[0])} here.`);
  else if (plain.length > 1) {
    out.tell(`There are ${plain.map((p) => aName(p)).join(', ')} here.`);
  }
}

export function containerListing(s: WorldState, container: string, depth: number): string | null {
  if (!seeInside(s, container) && !fset$(s, container, 'SURFACEBIT')) return null;
  const inner = contents(s, container).filter((o) => !fset$(s, o, 'INVISIBLE'));
  if (!inner.length) return null;
  const pad = '  '.repeat(depth);
  const lines = [`${pad}The ${objDef(container).desc} contains:`];
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
