// JIGS-UP: death, item scattering, resurrection (ports 1actions.zil JIGS-UP).
import type { Ctx } from './ctx';
import { contents, moveObj, fset$, fclear, PLAYER } from './world';

export function jigsUp(ctx: Ctx, text: string, opts?: { panel?: string }): void {
  const { s, out } = ctx;
  out.tell(text, 'death');
  out.emit({ type: 'sfx', name: 'death-stinger' });
  if (opts?.panel) out.emit({ type: 'panel', key: opts.panel });
  s.counters.score = Math.max(0, s.counters.score - 10);
  s.counters.deaths += 1;
  out.tell('    ****  You have died  ****', 'death');

  if (s.counters.deaths > 2) {
    out.tell(
      "You clearly are a suicidal maniac. We don't allow psychotics in the cave, since they may harm other adventurers. Your remains will be installed in the Land of the Living Dead, where your fellow adventurers may gloat over them.",
      'death'
    );
    s.dead = true;
    out.emit({ type: 'death', permanent: true });
    return;
  }

  out.tell(
    "Now, let's take a look here... Well, you probably deserve another chance. I can't quite fix you up completely, but you can't have everything.",
    'death'
  );

  // scatter: lamp to living room, other carried items dropped where you died
  for (const o of contents(s, PLAYER)) {
    if (o === 'LAMP') { moveObj(s, o, 'LIVING-ROOM'); fclear(s, o, 'ONBIT'); }
    else moveObj(s, o, s.here);
  }
  s.gflags['IN-BOAT'] = false;
  s.counters.wounds = 0;
  s.counters.loadAllowed = 100;
  s.grueTurns = 0;
  s.here = 'FOREST-1';
  s.touched['FOREST-1'] = true;
  out.emit({ type: 'death', permanent: false });
  out.emit({ type: 'panel', key: 'events/resurrection' });
  out.emit({ type: 'room', room: 'FOREST-1' });
  out.tell('Forest', 'room-name');
  out.tell('This is a forest, with trees in all directions. To the east, there appears to be sunlight.');
}
