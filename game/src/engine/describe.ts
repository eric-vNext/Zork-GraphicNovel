// Room and object description — a port of DESCRIBE-ROOM, DESCRIBE-OBJECTS,
// PRINT-CONT, DESCRIBE-OBJECT and FIRSTER in gverbs.zil. Four of those have
// per-game arms (see engine/branchManifest.ts).
//
// PRINT-CONT is the interesting one, and the reason this file is a faithful
// port rather than a simpler listing loop: it walks a container's children
// *twice*. The first pass prints untouched objects' first-descriptions and
// recurses into anything you can see inside; the second prints the ordinary
// listings under a FIRSTER header. That two-pass shape is what produces the
// Kitchen's
//
//     A bottle is sitting on the table.
//     The glass bottle contains:
//       A quantity of water
//     On the table is an elongated brown sack, smelling of hot peppers.
//
// from a table that is itself never mentioned, and it is why the shipped
// single-pass version dropped both objects entirely.
import type { WorldState } from './types';
import { Out, DATA, roomDef, objDef, contents, fset$, roomLit, seeInside, theName, aName, PLAYER } from './world';
import { dynamicRoomDesc, dynamicObjDesc } from './specialDescs';
import { gameNumber } from '../data/games';
import * as spells from './spells';

const INDENTS = ['', '  ', '    ', '      ', '        '];
const indent = (level: number): string => INDENTS[Math.min(Math.max(level, 0), INDENTS.length - 1)];

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
  // themselves in full on every visit; that disorientation is the puzzle.
  if (gameNumber() === 1 && r.flags.includes('MAZEBIT')) delete s.touched[s.here];
  describeObjects(s, out);
}

/** DESCRIBE-OBJECTS (gverbs.zil:1681) — `<PRINT-CONT ,HERE V? -1>`. */
export function describeObjects(s: WorldState, out: Out): void {
  printCont(s, out, s.here, -1);
}

/** Has this object been disturbed, so its first-description is spent? */
function touched(s: WorldState, obj: string): boolean {
  return !!s.fdescGone[obj] || fset$(s, obj, 'TOUCHBIT');
}

/** FIRSTER (gverbs.zil:1819) — the header above a container's listing. */
function firster(s: WorldState, out: Out, obj: string, level: number): void {
  if (gameNumber() === 1 && obj === 'TROPHY-CASE') {
    out.tell('Your collection of treasures consists of:');
    return;
  }
  if (obj === PLAYER) {
    out.tell('You are carrying:');
    return;
  }
  if (obj in DATA.rooms) return; // rooms get no header
  const pad = level > 0 ? indent(level) : '';
  const name = objDef(obj).desc;
  if (fset$(s, obj, 'SURFACEBIT')) out.tell(`${pad}Sitting on the ${name} is:`);
  else if (fset$(s, obj, 'ACTORBIT')) out.tell(`${pad}The ${name} is holding:`);
  else out.tell(`${pad}The ${name} contains:`);
}

/** DESCRIBE-OBJECT (gverbs.zil:1693). */
function describeObject(s: WorldState, out: Out, obj: string, level: number): void {
  const d = objDef(obj);
  // Zork II notes a floated object wherever it is listed (gverbs.zil:1716).
  const floating = gameNumber() === 2 ? spells.describeSuffix(s, obj) : '';

  if (level <= 0) {
    const dyn = dynamicObjDesc(s, obj);
    if (dyn) { out.tell(dyn + floating); }
    else {
      const str = (!touched(s, obj) && d.fdesc) || d.ldesc;
      if (str) out.tell(str.replace(/\n/g, ' ') + floating);
      else out.tell(`There is ${aName(obj)} here${fset$(s, obj, 'ONBIT') ? ' (providing light)' : ''}${floating}.`);
    }
  } else {
    let line = `${indent(level)}${cap(aName(obj))}`;
    if (fset$(s, obj, 'ONBIT')) line += ' (providing light)';
    else if (fset$(s, obj, 'WEARBIT') && s.locs[obj] === PLAYER) line += ' (being worn)';
    out.tell(line + floating);
  }

  if (seeInside(s, obj) && contents(s, obj).length) printCont(s, out, obj, level);
}

/**
 * PRINT-CONT (gverbs.zil:1751). Returns true when it printed something that
 * counts as a listing, which is what the caller uses to decide whether a later
 * FIRSTER header is still needed.
 */
export function printCont(s: WorldState, out: Out, obj: string, level = 0): boolean {
  const kids = contents(s, obj);
  if (!kids.length) return true;

  const inventoryListing = obj === PLAYER;
  let firstItem = true;
  let printedNothing = true;

  // Pass 1: first-descriptions of objects the player has not disturbed.
  if (!inventoryListing) {
    for (const y of kids) {
      if (y === PLAYER || fset$(s, y, 'INVISIBLE') || touched(s, y)) continue;
      const dyn = dynamicObjDesc(s, y);
      const fd = dyn ?? objDef(y).fdesc;
      if (!fd) continue;
      if (!fset$(s, y, 'NDESCBIT')) {
        out.tell(fd.replace(/\n/g, ' '));
        printedNothing = false;
      }
      if (seeInside(s, y) && contents(s, y).length) {
        if (printCont(s, out, y, 0)) firstItem = false;
      }
    }
  }

  // Pass 2: ordinary listings, under a header printed once.
  let lvl = level;
  for (const y of kids) {
    if (y === PLAYER || fset$(s, y, 'INVISIBLE')) continue;
    const hasFdesc = !!(dynamicObjDesc(s, y) ?? objDef(y).fdesc);
    if (!(inventoryListing || touched(s, y) || !hasFdesc)) continue;

    if (!fset$(s, y, 'NDESCBIT')) {
      if (firstItem) {
        firster(s, out, obj, lvl);
        lvl = lvl + 1;
        firstItem = false;
      }
      describeObject(s, out, y, Math.max(lvl, 0));
      printedNothing = false;
    } else if (contents(s, y).length && seeInside(s, y)) {
      // A container the room never mentions — the kitchen table — still spills
      // its contents into the description.
      printCont(s, out, y, lvl + 1);
      printedNothing = false;
    }
  }

  return !(firstItem && printedNothing);
}

/** Kept for the `LOOK IN`/`EXAMINE` paths, which list one container directly. */
export function containerListing(s: WorldState, container: string, depth: number): string | null {
  if (!seeInside(s, container) && !fset$(s, container, 'SURFACEBIT')) return null;
  const inner = contents(s, container).filter((o) => !fset$(s, o, 'INVISIBLE'));
  if (!inner.length) return null;
  const buffer = new Out();
  firster(s, buffer, container, depth);
  for (const o of inner) describeObject(s, buffer, o, depth + 1);
  const lines = buffer.events.filter((e) => e.type === 'text').map((e: any) => e.text);
  return lines.length ? lines.join('\n') : null;
}

export function cap(x: string): string { return x.charAt(0).toUpperCase() + x.slice(1); }

export function listInventory(s: WorldState, out: Out): void {
  const inv = contents(s, PLAYER);
  if (!inv.length) { out.tell('You are empty-handed.'); return; }
  printCont(s, out, PLAYER, 0);
}

export { theName };
