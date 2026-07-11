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
      "It takes a talented person to be killed while already dead. YOU are such a talent. Unfortunately, it takes a talented person to deal with it. I am not such a talent. Sorry.",
      'death'
    );
    s.dead = true;
    out.emit({ type: 'death', permanent: true });
    return;
  }

  out.tell(
    'As you take your last breath, you feel relieved of your burdens. The feeling passes as you find yourself before the gates of Hell, where the spirits jeer at you and deny you entry. Your senses are disturbed. The objects in the dungeon appear indistinct, bleary, less real. A pale light flickers. The words, "This will never do," come thundering into your mind from a distance. In a definite case of mistaken identity, you have been resurrected.',
    'death'
  );

  // scatter: lamp to living room, other carried items dropped where you died
  for (const o of contents(s, PLAYER)) {
    if (o === 'LAMP') { moveObj(s, o, 'LIVING-ROOM'); fclear(s, o, 'ONBIT'); }
    else moveObj(s, o, s.here);
  }
  s.gflags['IN-BOAT'] = false;
  s.counters.wounds = 0;
  s.grueTurns = 0;
  s.here = 'FOREST-1';
  s.touched['FOREST-1'] = true;
  out.emit({ type: 'death', permanent: false });
  out.emit({ type: 'panel', key: 'events/resurrection' });
  out.emit({ type: 'room', room: 'FOREST-1' });
  out.tell('Forest', 'room-name');
  out.tell('This is a forest, with trees in all directions. To the east, there appears to be sunlight.');
}
