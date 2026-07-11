// The clock (gclock.zil) and all daemons/timers from 1actions.zil,
// including combat (I-FIGHT), the thief (I-THIEF), lamp/candle fuel, and the river.
import type { Ctx } from './ctx';
import { prob, pickOne } from './ctx';
import { jigsUp } from './death';
import { fightDaemon } from './melee';
import {
  fset, fclear, fset$, moveObj, removeObj, contents, inPlayer, roomOf,
  roomLit, PLAYER, roomDef, DATA,
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
    // ports I-CURE: one wound heals per interval, carrying capacity recovers with it
    const { s } = ctx;
    if (s.counters.wounds > 0) s.counters.wounds -= 1;
    if (s.counters.wounds > 0) {
      if (s.counters.loadAllowed < 100) s.counters.loadAllowed = Math.min(100, s.counters.loadAllowed + 10);
      ctx.queue('I-CURE', 30);
    } else {
      s.counters.loadAllowed = 100;
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

// ---------------- thief wanderings (I-THIEF) ----------------
// Combat itself (I-FIGHT and the melee blows) lives in melee.ts.
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
