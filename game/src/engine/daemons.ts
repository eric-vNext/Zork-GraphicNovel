// The clock (gclock.zil) and all daemons/timers from 1actions.zil,
// including combat (I-FIGHT), the thief (I-THIEF), lamp/candle fuel, and the river.
import type { Ctx } from './ctx';
import { prob, pickOne } from './ctx';
import { jigsUp } from './death';
import {
  fset, fclear, fset$, moveObj, removeObj, contents, inPlayer, roomOf,
  roomLit, PLAYER, roomDef, theName, DATA,
} from './world';

type Daemon = (ctx: Ctx) => void;

const LAMP_TABLE: Array<[number, string | null]> = [
  [100, 'The lamp appears a bit dimmer.'],
  [70, 'The lamp is definitely dimmer now.'],
  [15, 'The lamp is nearly out.'],
  [0, null],
];
const CANDLE_TABLE: Array<[number, string | null]> = [
  [20, 'The candles grow shorter.'],
  [10, 'The candles are becoming quite short.'],
  [5, "The candles won't last long now."],
  [0, null],
];

export const DAEMONS: Record<string, Daemon> = {
  'I-LANTERN': (ctx) => {
    const { s, out } = ctx;
    const idx = s.counters.lampIdx;
    const [, msg] = LAMP_TABLE[idx];
    if (idx >= LAMP_TABLE.length - 1 || LAMP_TABLE[idx + 1][0] === 0 && idx + 1 === LAMP_TABLE.length - 1) {
      // fall through below
    }
    const next = idx + 1;
    if (next < LAMP_TABLE.length && LAMP_TABLE[next][0] > 0) {
      if (msg && (inPlayer(s, 'LAMP') || roomOf(s, 'LAMP') === s.here)) out.tell(msg);
      s.counters.lampIdx = next;
      ctx.queue('I-LANTERN', LAMP_TABLE[next][0]);
    } else {
      if (inPlayer(s, 'LAMP') || roomOf(s, 'LAMP') === s.here)
        out.tell("You'd better have more light than from the lantern.");
      fclear(s, 'LAMP', 'ONBIT');
      fclear(s, 'LAMP', 'LIGHTBIT');
      fset(s, 'LAMP', 'RMUNGBIT');
      out.emit({ type: 'sfx', name: 'lamp-off' });
      checkNowDark(ctx);
    }
  },
  'I-CANDLES': (ctx) => {
    const { s, out } = ctx;
    const idx = s.counters.candleIdx;
    const [, msg] = CANDLE_TABLE[idx];
    const next = idx + 1;
    if (next < CANDLE_TABLE.length && CANDLE_TABLE[next][0] > 0) {
      if (msg && inPlayer(s, 'CANDLES')) out.tell(msg);
      s.counters.candleIdx = next;
      ctx.queue('I-CANDLES', CANDLE_TABLE[next][0]);
    } else {
      if (inPlayer(s, 'CANDLES')) out.tell("You'd better have more light than from the pair of candles.");
      fclear(s, 'CANDLES', 'ONBIT');
      fclear(s, 'CANDLES', 'FLAMEBIT');
      fset(s, 'CANDLES', 'RMUNGBIT');
      removeObj(s, 'CANDLES');
      checkNowDark(ctx);
    }
  },
  'I-MATCH': (ctx) => {
    const { s, out } = ctx;
    fclear(s, 'MATCH', 'ONBIT');
    fclear(s, 'MATCH', 'FLAMEBIT');
    out.tell('The match has gone out.');
    checkNowDark(ctx);
  },
  'I-FOREST-ROOM': (ctx) => {
    const FOREST = ['FOREST-1', 'FOREST-2', 'FOREST-3', 'PATH', 'UP-A-TREE', 'GRATING-CLEARING', 'CLEARING'];
    if (!FOREST.includes(ctx.s.here)) { ctx.disable('I-FOREST-ROOM'); return; }
    if (prob(ctx, 15)) ctx.out.tell('You hear in the distance the chirping of a song bird.');
  },
  'I-RFILL': (ctx) => {
    const { s, out } = ctx;
    s.gflags['LOW-TIDE'] = false;
    if (s.here === 'RESERVOIR') {
      jigsUp(ctx, 'You are lifted up by the rising river! You try to swim, but the currents are too strong. You come closer, closer to the awesome structure of Flood Control Dam #3. The dam beckons to you. The roar of the water nearly deafens you, but you remain conscious as you tumble over the dam toward your certain doom among the rocks at its base.', { panel: 'events/falls-death' });
      return;
    }
    if (['RESERVOIR-SOUTH', 'RESERVOIR-NORTH'].includes(s.here))
      out.tell('You notice that the water level has risen to the point that it is impossible to cross.');
  },
  'I-REMPTY': (ctx) => {
    const { s, out } = ctx;
    s.gflags['LOW-TIDE'] = true;
    fclear(s, 'TRUNK', 'INVISIBLE');
    if (['RESERVOIR-SOUTH', 'RESERVOIR-NORTH'].includes(s.here))
      out.tell('The water level is now quite low here and you could easily cross over to the other side.');
    else if (s.here === 'DEEP-CANYON') out.tell('A sudden rush of water runs by you.');
    else if (s.here === 'LOUD-ROOM') out.tell('The rush of water is subsiding as the water level behind the dam lowers.');
  },
  'I-MAINT-ROOM': (ctx) => {
    const { s, out } = ctx;
    const level = (s.counters.floodLevel = (s.counters.floodLevel ?? 0) + 1);
    if (s.here === 'MAINTENANCE-ROOM') {
      out.tell(`The water level here is now up to your ${['ankles', 'shin', 'knees', 'hips', 'waist', 'chest', 'neck', 'chin', 'nose'][Math.min(8, Math.floor(level / 1.5))]}.`);
      out.emit({ type: 'sfx', name: 'flood-rising' });
    }
    if (level >= 13) {
      ctx.disable('I-MAINT-ROOM');
      s.gflags['MAINT-FLOODED'] = true;
      if (s.here === 'MAINTENANCE-ROOM')
        jigsUp(ctx, 'I\'m afraid you have done drowned yourself.', { panel: 'events/flood-death' });
    }
  },
  'I-CYCLOPS': (ctx) => {
    const { s } = ctx;
    if (s.here !== 'CYCLOPS-ROOM' || s.gflags['CYCLOPS-FLAG'] || s.gflags['MAGIC-FLAG']) return;
    const c = (s.counters.cyclowrath = (s.counters.cyclowrath ?? 0) + 1);
    if (c > 6) {
      jigsUp(ctx, 'The cyclops, tired of all of your games and trickery, grabs you firmly. As he licks his chops, he says "Mmm. Just like Mom used to make \'em." It\'s nice to be appreciated.', { panel: 'characters/cyclops' });
    } else if (c > 4) {
      ctx.out.tell('The cyclops is moving about the room, looking for something.');
    }
  },
  'I-SWORD': (ctx) => {
    const { s, out } = ctx;
    if (!inPlayer(s, 'SWORD')) return;
    const villainsNear = (dist: number): boolean => {
      const vs = ['TROLL', 'THIEF', 'CYCLOPS'].filter(
        (vl) => s.locs[vl] && !fset$(s, vl, 'INVISIBLE') && !s.gflags[`${vl}-DEAD`]
      );
      if (dist === 0) return vs.some((vl) => roomOf(s, vl) === s.here || (vl === 'THIEF' && s.thiefRoom === s.here && s.gflags['THIEF-HERE']));
      const adj = Object.values(roomDef(s.here).exits).map((e) => e.to).filter(Boolean) as string[];
      return vs.some((vl) => adj.includes(roomOf(s, vl) ?? '') || (vl === 'THIEF' && adj.includes(s.thiefRoom)));
    };
    const glow = villainsNear(0) ? 2 : villainsNear(1) ? 1 : 0;
    const prev = s.counters.swordGlow ?? 0;
    if (glow !== prev) {
      s.counters.swordGlow = glow;
      if (glow === 2) { out.tell('Your sword has begun to glow very brightly.'); out.emit({ type: 'sfx', name: 'sword-glow' }); }
      else if (glow === 1) out.tell('Your sword is glowing with a faint blue glow.');
      else out.tell('Your sword is no longer glowing.');
    }
  },
  'I-THIEF': thiefDaemon,
  'I-FIGHT': fightDaemon,
  'I-CURE': (ctx) => {
    const { s } = ctx;
    if (s.counters.wounds > 0) {
      s.counters.wounds -= 1;
      if (s.counters.wounds > 0) ctx.queue('I-CURE', 30);
    }
  },
  'I-RIVER': (ctx) => {
    const { s, out } = ctx;
    if (!s.gflags['IN-BOAT']) { ctx.disable('I-RIVER'); return; }
    const NEXT: Record<string, string> = {
      'RIVER-1': 'RIVER-2', 'RIVER-2': 'RIVER-3', 'RIVER-3': 'RIVER-4', 'RIVER-4': 'RIVER-5',
    };
    const nxt = NEXT[s.here];
    if (nxt) {
      out.tell('The flow of the river carries you downstream.');
      moveObj(s, 'INFLATED-BOAT', nxt);
      ctx.moveTo(nxt, true);
      ctx.queue('I-RIVER', s.here === 'RIVER-5' ? 4 : 3);
    } else if (s.here === 'RIVER-5') {
      jigsUp(ctx, 'Unfortunately, the magic boat doesn\'t provide protection from the rocks and boulders one meets at the bottom of waterfalls. Including this one.', { panel: 'events/falls-death' });
    }
  },
  'I-XB': (ctx) => {           // bell cools
    ctx.s.gflags['XB'] = false;
    if (ctx.s.here === 'ENTRANCE-TO-HADES') ctx.out.tell('The bell appears to have cooled down.');
    resetExorcism(ctx);
  },
  'I-XBH': (ctx) => {          // hot bell cools (long timer)
    fclear(ctx.s, 'HOT-BELL', 'INVISIBLE');
  },
  'I-XC': (ctx) => {           // candle window expires
    if (ctx.s.gflags['XC']) { resetExorcism(ctx); if (ctx.s.here === 'ENTRANCE-TO-HADES') ctx.out.tell('The tension of this ceremony is broken, and the wraiths, amused but shaken at your clumsy attempt, resume their hideous jeering.'); }
  },
};

function resetExorcism(ctx: Ctx): void {
  ctx.s.gflags['XB'] = false;
  ctx.s.gflags['XC'] = false;
}

export function checkNowDark(ctx: Ctx): void {
  if (!roomLit(ctx.s)) ctx.out.tell('It is now pitch black.');
}

// ---------------- combat (I-FIGHT / villain melee) ----------------
const VILLAIN_MISS = [
  'The troll swings his axe, but it misses.',
  'The troll\'s axe barely misses your ear.',
];
const THIEF_MISS = [
  'The thief stabs nonchalantly with his stiletto and misses.',
  'You dodge as the thief comes in low.',
];

function fightDaemon(ctx: Ctx): void {
  const { s, out } = ctx;
  if (s.justArrived) return; // let the player see the room before a villain gets a free swing
  // troll
  if (s.here === 'TROLL-ROOM' && !s.gflags['TROLL-DEAD'] && !fset$(s, 'TROLL', 'INVISIBLE') && !s.gflags['TROLL-UNCONSCIOUS']) {
    if (prob(ctx, 65)) villainStrike(ctx, 'TROLL');
  }
  // thief in treasure room is aggressive
  if (s.here === 'TREASURE-ROOM' && !s.gflags['THIEF-DEAD'] && !s.thiefEngrossed) {
    if (prob(ctx, 60)) villainStrike(ctx, 'THIEF');
  }
}

function villainStrike(ctx: Ctx, villain: string): void {
  const { s, out } = ctx;
  const roll = ctx.rng() * 100;
  const name = villain === 'TROLL' ? 'troll' : 'thief';
  out.emit({ type: 'sfx', name: villain === 'TROLL' ? 'troll-grunt' : 'thief-snicker' });
  out.emit({ type: 'panel', key: villain === 'TROLL' ? 'events/troll-fight' : 'events/thief-encounter' });
  const armed = villain === 'TROLL' ? 'axe' : 'stiletto';
  if (roll < 35) {
    out.tell(pickOne(ctx, villain === 'TROLL' ? VILLAIN_MISS : THIEF_MISS));
  } else if (roll < 65) {
    s.counters.wounds += 1;
    out.tell(villain === 'TROLL'
      ? 'The axe gets you right in the side. Ouch!'
      : 'The thief strikes like a snake! The resulting wound is serious.');
    ctx.queue('I-CURE', 30);
  } else if (roll < 80) {
    out.tell(villain === 'TROLL'
      ? 'The troll hits you with a glancing blow, and you are momentarily stunned.'
      : 'The thief rams the haft of his blade into your stomach, leaving you out of breath.');
  } else {
    s.counters.wounds += 2;
    out.tell(villain === 'TROLL'
      ? `The troll's ${armed} stroke lands squarely. It hurts a lot.`
      : 'The stiletto severs your jugular. It looks like the end.');
    ctx.queue('I-CURE', 30);
  }
  const strength = 4 + Math.floor(s.counters.score / 100) - s.counters.wounds;
  if (strength <= 0) {
    jigsUp(ctx, villain === 'TROLL'
      ? 'The troll\'s axe removes your head, which was, after all, in the way. Your adventuring days appear to be over.'
      : 'The thief, forgetting his essentially genteel upbringing, cuts your throat.',
      { panel: villain === 'TROLL' ? 'characters/troll' : 'characters/thief' });
  }
}

/** Player attacks a villain. Returns true if handled. */
export function playerAttack(ctx: Ctx, villain: string, weapon?: string): void {
  const { s, out } = ctx;
  if (!weapon) {
    const carried = contents(s, PLAYER);
    weapon = carried.find((o) => fset$(s, o, 'WEAPONBIT')) ?? undefined;
    if (!weapon) { out.tell(`Attacking ${theName(villain)} with your bare hands is suicidal.`); return; }
  }
  const wname = DATA.objects[weapon]?.desc ?? 'weapon';
  const best = villain === 'TROLL' ? 'SWORD' : villain === 'THIEF' ? 'KNIFE' : 'SWORD';
  const bonus = weapon === best ? 15 : 0;
  const roll = ctx.rng() * 100 + bonus + Math.floor(s.counters.score / 35);
  out.emit({ type: 'sfx', name: pickOne(ctx, ['sword-clash-1', 'sword-clash-2']) });

  if (villain === 'TROLL') {
    out.emit({ type: 'panel', key: 'events/troll-fight' });
    const hits = (s.counters.trollHits = (s.counters.trollHits ?? 0) + (roll > 55 ? 1 : 0));
    if (roll <= 30) out.tell(`You charge, but the troll jumps nimbly aside.`);
    else if (roll <= 55) out.tell(`Clang! Crash! The troll parries.`);
    else if (hits < 2) out.tell(`The flat of the troll's axe hits you delicately on the head, knocking you out — no wait — the ${wname} connects! The troll is staggered, and drops to his knees.`);
    else {
      out.tell('The fatal blow strikes the troll square in the heart: He dies.');
      out.tell('Almost as soon as the troll breathes his last breath, a cloud of sinister black fog envelops him, and when the fog lifts, the carcass has disappeared.');
      s.gflags['TROLL-DEAD'] = true;
      s.gflags['TROLL-FLAG'] = true;
      removeObj(s, 'TROLL');
      moveObj(s, 'AXE', 'TROLL-ROOM');
      fset(s, 'AXE', 'WEAPONBIT');
      fset(s, 'AXE', 'TAKEBIT');
      out.emit({ type: 'panel', key: 'rooms/troll-room-empty' });
    }
    return;
  }
  if (villain === 'THIEF') {
    out.emit({ type: 'panel', key: 'events/thief-encounter' });
    const hits = (s.counters.thiefHits = (s.counters.thiefHits ?? 0) + (roll > 60 ? 1 : 0));
    if (roll <= 35) out.tell('You miss. The thief makes no attempt to take advantage of your imbalance.');
    else if (roll <= 60) out.tell(`The thief deflects your blow with the large bag he is carrying.`);
    else if (hits < 2) out.tell(`The ${wname} pinks the thief on the wrist, but it's not serious.`);
    else {
      killThief(ctx);
    }
    return;
  }
  if (villain === 'CYCLOPS') {
    out.tell('The cyclops shrugs but otherwise ignores your pitiful attempt.');
    return;
  }
}

export function killThief(ctx: Ctx): void {
  const { s, out } = ctx;
  out.tell('The fatal blow strikes the thief square in the heart: He dies.');
  out.tell(
    'As the thief dies, the power of his magic decreases, and his treasures reappear:',
  );
  s.gflags['THIEF-DEAD'] = true;
  const loot = contents(s, 'LARGE-BAG');
  const lines: string[] = [];
  for (const o of loot) {
    moveObj(s, o, s.here);
    lines.push(`  A ${DATA.objects[o]?.desc ?? o.toLowerCase()}`);
  }
  // the egg: opened by the thief's delicate touch while it was in his bag
  if (s.gflags['THIEF-HAS-EGG']) {
    if (roomOf(s, 'EGG') === null) moveObj(s, 'EGG', s.here);
    fset(s, 'EGG', 'OPENBIT');
    if (!s.locs['CANARY']) moveObj(s, 'CANARY', 'EGG');
    lines.push('  A jewel-encrusted egg, now open, with a golden clockwork canary inside');
  }
  if (lines.length) out.tell(lines.join('\n'));
  out.tell('The chalice is now safe to take.');
  removeObj(s, 'THIEF');
  s.gflags['THIEF-HERE'] = false;
  ctx.disable('I-THIEF');
  out.emit({ type: 'sfx', name: 'treasure-chime' });
}

// ---------------- thief wanderings (I-THIEF) ----------------
function thiefDaemon(ctx: Ctx): void {
  const { s, out } = ctx;
  if (s.gflags['THIEF-DEAD']) return;
  const here = roomDef(s.here);
  const underground = !here.flags.includes('RLANDBIT') || !here.flags.includes('ONBIT');
  const sacred = here.flags.includes('SACREDBIT');
  if (s.here === 'TREASURE-ROOM') return; // handled by fight daemon
  if (!underground || sacred || s.dead) { s.gflags['THIEF-HERE'] = false; return; }

  if (s.gflags['THIEF-HERE']) {
    // thief leaves this turn; he robs the room first, then the player, then nothing
    const roomLoot = contents(s, s.here).filter(
      (o) => (DATA.objects[o]?.tvalue ?? 0) > 0 && !fset$(s, o, 'NDESCBIT') && !fset$(s, o, 'SACREDBIT')
    );
    const invLoot = contents(s, PLAYER).filter((o) => (DATA.objects[o]?.tvalue ?? 0) > 0);
    let robbed: 'room' | 'player' | null = null;
    if (roomLoot.length) {
      const item = pickOne(ctx, roomLoot);
      moveObj(s, item, 'LARGE-BAG');
      if (item === 'EGG') s.gflags['THIEF-HAS-EGG'] = true;
      robbed = 'room';
    } else if (invLoot.length) {
      const item = pickOne(ctx, invLoot);
      moveObj(s, item, 'LARGE-BAG');
      if (item === 'EGG') s.gflags['THIEF-HAS-EGG'] = true;
      robbed = 'player';
    }
    if (robbed === 'player') {
      out.tell('The thief just left, still carrying his large bag. You may not have noticed that he robbed you blind first.');
      out.emit({ type: 'panel', key: 'events/thief-steals' });
    } else if (robbed === 'room') {
      out.tell('The thief just left, still carrying his large bag. You may not have noticed that he appropriated the valuables in the room.');
    } else {
      out.tell('The thief, finding nothing of value, left disgusted.');
    }
    s.gflags['THIEF-HERE'] = false;
    fset(s, 'THIEF', 'INVISIBLE');
    return;
  }

  if (prob(ctx, 9)) {
    // thief appears
    if (prob(ctx, 50)) {
      out.tell('Someone carrying a large bag is casually leaning against one of the walls here. He does not speak, but it is clear from his aspect that the bag will be taken only over his dead body.');
      out.emit({ type: 'panel', key: 'characters/thief' });
      out.emit({ type: 'sfx', name: 'thief-snicker' });
      s.gflags['THIEF-HERE'] = true;
      moveObj(s, 'THIEF', s.here);
      fclear(s, 'THIEF', 'INVISIBLE');
    } else {
      // silent robbery of the room
      const roomLoot = contents(s, s.here).filter(
        (o) => (DATA.objects[o]?.tvalue ?? 0) > 0 && !fset$(s, o, 'NDESCBIT') && !fset$(s, o, 'SACREDBIT')
      );
      if (roomLoot.length && prob(ctx, 60)) {
        const item = pickOne(ctx, roomLoot);
        moveObj(s, item, 'LARGE-BAG');
        if (item === 'EGG') s.gflags['THIEF-HAS-EGG'] = true;
        if (roomLit(s)) out.tell('You hear, off in the distance, someone saying "My, I wonder what this fine jewel is doing here."');
      }
    }
  }
}


// ---------------- the clock ----------------
export function clocker(ctx: Ctx): void {
  const { s } = ctx;
  s.counters.moves += 1;
  for (const [name, d] of Object.entries(s.daemons)) {
    if (!d.enabled) continue;
    if (d.tick > 0) {
      d.tick -= 1;
      if (d.tick === 0) DAEMONS[name]?.(ctx);
    } else if (d.tick === -1) {
      DAEMONS[name]?.(ctx);
    }
  }
}
