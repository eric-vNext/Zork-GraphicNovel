// JIGS-UP: death, item scattering, resurrection.
//
// Each game has its own. Zork I drops you in the forest, sends the lamp to the
// Living Room, and kills you permanently on the third death. Zork II drops you
// in the Room of Red Mist — its afterlife is the palantir rooms — sends the
// lamp back to the barrow, and has no death limit at all
// (2actions.zil:3959 JIGS-UP + RANDOMIZE-OBJECTS).
import type { Ctx } from './ctx';
import { contents, moveObj, fset$, fclear, roomDef, PLAYER } from './world';
import { activeGame } from '../data/games';

export function jigsUp(ctx: Ctx, text: string, opts?: { panel?: string }): void {
  const { s, out } = ctx;
  out.tell(text, 'death');
  out.emit({ type: 'sfx', name: 'death-stinger' });
  if (opts?.panel) out.emit({ type: 'panel', key: opts.panel });
  s.counters.score = Math.max(0, s.counters.score - 10);
  s.counters.deaths += 1;
  out.tell('    ****  You have died  ****', 'death');

  const rules = activeGame().death;
  if (s.counters.deaths > rules.maxDeaths) {
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

  // Scatter what you were carrying: the lamp goes home, everything else is
  // left where you died.
  for (const o of contents(s, PLAYER)) {
    if (o === 'LAMP') { moveObj(s, o, rules.lampHome); fclear(s, o, 'ONBIT'); }
    else moveObj(s, o, s.here);
  }
  s.gflags['IN-BOAT'] = false;
  s.counters.wounds = 0;
  s.counters.loadAllowed = 100;
  s.grueTurns = 0;
  // A spell does not survive its victim (2actions.zil sets SPELL? to false).
  s.gflags['SPELL-ACTIVE'] = false;
  if (s.spell) s.spell.active = null;

  s.here = rules.resurrectRoom;
  s.touched[s.here] = true;
  out.emit({ type: 'death', permanent: false });
  if (rules.panel) out.emit({ type: 'panel', key: rules.panel });
  out.emit({ type: 'room', room: s.here });
  const r = roomDef(s.here);
  out.tell(r.desc, 'room-name');
  if (r.ldesc) out.tell(r.ldesc.replace(/\n/g, ' '));
}
