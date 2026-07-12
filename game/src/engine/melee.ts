// The real melee engine, ported from 1actions.zil: FIGHT-STRENGTH,
// VILLAIN-STRENGTH, the DEF1/DEF2/DEF3 outcome tables (windowed per the
// DEF*-RES setup in 1dungeon.zil's GO routine), VILLAIN-BLOW, HERO-BLOW,
// WINNER-RESULT, VILLAIN-RESULT, DO-FIGHT, and the I-FIGHT daemon.
// Message text lives in combatText.ts; both text and probabilities come
// verbatim from the source.
import type { Ctx } from './ctx';
import type { WorldState } from './types';
import { prob, pickOne } from './ctx';
import { jigsUp } from './death';
import { HERO_MELEE, TROLL_MELEE, THIEF_MELEE, meleeLine, type Outcome, type MeleeTable } from './combatText';
import {
  fset, fclear, fset$, moveObj, removeObj, contents, inPlayer, locOf, roomOf,
  PLAYER, DATA, objDef, aName,
} from './world';

const STRENGTH_MIN = 2; // <CONSTANT STRENGTH-MIN 2>
const STRENGTH_MAX = 7; // <CONSTANT STRENGTH-MAX 7>
const SCORE_MAX = 350;
const CURE_WAIT = 30;

// ---- blow-result tables (1actions.zil DEF1/DEF2A/DEF2B/DEF3A/DEF3B/DEF3C) ----
const M: Outcome = 'MISSED', ST: Outcome = 'STAGGER', U: Outcome = 'UNCONSCIOUS',
  K: Outcome = 'KILLED', LW: Outcome = 'LIGHT_WOUND', SW: Outcome = 'SERIOUS_WOUND';

const DEF1: Outcome[] = [M, M, M, M, ST, ST, U, U, K, K, K, K, K];
const DEF2A: Outcome[] = [M, M, M, M, M, ST, ST, LW, LW, U];
const DEF2B: Outcome[] = [M, M, M, ST, ST, LW, LW, LW, U, K, K, K];
const DEF3A: Outcome[] = [M, M, M, M, M, ST, ST, LW, LW, SW, SW];
const DEF3B: Outcome[] = [M, M, M, ST, ST, LW, LW, LW, SW, SW, SW];
const DEF3C: Outcome[] = [M, ST, ST, LW, LW, LW, LW, SW, SW, SW];

// DEF1-RES / DEF2-RES / DEF3-RES: each entry is a 9-element window [table, offset]
// (the GO routine builds these with <REST tbl n> pointers).
const DEF1_RES: Array<[Outcome[], number]> = [[DEF1, 0], [DEF1, 1], [DEF1, 2]];
const DEF2_RES: Array<[Outcome[], number]> = [[DEF2A, 0], [DEF2B, 0], [DEF2B, 1], [DEF2B, 2]];
const DEF3_RES: Array<[Outcome[], number]> = [[DEF3A, 0], [DEF3A, 1], [DEF3B, 0], [DEF3B, 1], [DEF3C, 0]];

/** The shared table lookup in VILLAIN-BLOW / HERO-BLOW: <GET .TBL <- <RANDOM 9> 1>>. */
function blowResult(rng: () => number, att: number, def: number): Outcome {
  let tbl: [Outcome[], number];
  if (def === 1) {
    if (att > 2) att = 3;
    tbl = DEF1_RES[att - 1];
  } else if (def === 2) {
    if (att > 3) att = 4;
    tbl = DEF2_RES[att - 1];
  } else {
    att -= def;
    if (att < -1) att = -2;
    else if (att > 1) att = 2;
    tbl = DEF3_RES[att + 2];
  }
  const [table, offset] = tbl;
  return table[offset + Math.floor(rng() * 9)];
}

// ---- strengths ---------------------------------------------------------------

/** FIGHT-STRENGTH: 2..7 scaled by score, minus current wounds when adjusted. */
export function fightStrength(s: WorldState, adjust = true): number {
  const base = STRENGTH_MIN +
    Math.floor(s.counters.score / Math.floor(SCORE_MAX / (STRENGTH_MAX - STRENGTH_MIN)));
  return adjust ? base - (s.counters.wounds ?? 0) : base;
}

// The VILLAINS table: best weapon, its advantage, and the villain's melee remarks.
const VILLAIN_DEFS: Record<string, { best: string; bestAdv: number; msgs: MeleeTable }> = {
  TROLL: { best: 'SWORD', bestAdv: 1, msgs: TROLL_MELEE },
  THIEF: { best: 'KNIFE', bestAdv: 1, msgs: THIEF_MELEE },
};
const FIGHT_VILLAINS = ['TROLL', 'THIEF'];
const FIGHT_PANEL: Record<string, string> = { TROLL: 'events/troll-fight', THIEF: 'events/thief-encounter' };
const FIGHT_SFX: Record<string, string> = { TROLL: 'troll-grunt', THIEF: 'thief-snicker' };
const DEATH_PANEL: Record<string, string> = { TROLL: 'characters/troll', THIEF: 'characters/thief' };

/** Current villain strength; negative = unconscious, 0 = dead. */
function vstr(s: WorldState, villain: string): number {
  return s.counters[`VSTR-${villain}`] ?? objDef(villain)?.strength ?? 0;
}
function setVstr(s: WorldState, villain: string, n: number): void {
  s.counters[`VSTR-${villain}`] = n;
}

/** VILLAIN-STRENGTH: engrossed thief is capped, the best weapon confers advantage. */
function villainStrength(s: WorldState, villain: string, weapon?: string): number {
  let od = vstr(s, villain);
  if (od >= 0) {
    if (villain === 'THIEF' && s.thiefEngrossed) {
      if (od > 2) od = 2;
      s.thiefEngrossed = false;
    }
    const vd = VILLAIN_DEFS[villain];
    if (vd && weapon && fset$(s, weapon, 'WEAPONBIT') && weapon === vd.best) {
      od = Math.max(1, od - vd.bestAdv);
    }
  }
  return od;
}

// FIND-WEAPON's fixed list, in its order.
const WEAPONS = ['STILETTO', 'AXE', 'SWORD', 'KNIFE', 'RUSTY-KNIFE'];
function findWeapon(s: WorldState, holder: string): string | undefined {
  return contents(s, holder).find((o) => WEAPONS.includes(o));
}
function weaponDesc(w: string | undefined): string {
  return w ? (DATA.objects[w]?.desc ?? 'weapon') : 'weapon';
}
function villainDesc(villain: string): string {
  return objDef(villain)?.desc ?? villain.toLowerCase();
}

// ---- villain attacks the player (VILLAIN-BLOW + WINNER-RESULT) ----------------

type BlowResult = Outcome | 'SKIP' | 'PLAYER-DEAD';

function villainBlow(ctx: Ctx, villain: string, playerOut: boolean): BlowResult {
  const { s, out } = ctx;
  fclear(s, PLAYER, 'STAGGERED');
  if (fset$(s, villain, 'STAGGERED')) {
    out.tell(`The ${villainDesc(villain)} slowly regains his feet.`);
    fclear(s, villain, 'STAGGERED');
    return 'SKIP';
  }
  const att = villainStrength(s, villain, ctx.iobj);
  let def = fightStrength(s);
  if (def <= 0) return 'SKIP';
  const od = fightStrength(s, false);
  const dweapon = findWeapon(s, PLAYER);

  let res = blowResult(ctx.rng, att, def);
  if (playerOut) res = res === 'STAGGER' ? 'HESITATE' : 'SITTING_DUCK';
  if (res === 'STAGGER' && dweapon && prob(ctx, 25)) res = 'LOSE_WEAPON';

  out.emit({ type: 'sfx', name: FIGHT_SFX[villain] });
  out.emit({ type: 'panel', key: FIGHT_PANEL[villain] });
  out.tell(meleeLine(ctx.rng, VILLAIN_DEFS[villain].msgs, res, weaponDesc(dweapon), villainDesc(villain)));

  switch (res) {
    case 'MISSED': case 'HESITATE': case 'UNCONSCIOUS':
      break;
    case 'KILLED': case 'SITTING_DUCK':
      def = 0;
      out.emit({ type: 'shake' });
      break;
    case 'LIGHT_WOUND':
      def = Math.max(0, def - 1);
      if (s.counters.loadAllowed > 50) s.counters.loadAllowed -= 10;
      break;
    case 'SERIOUS_WOUND':
      def = Math.max(0, def - 2);
      if (s.counters.loadAllowed > 50) s.counters.loadAllowed -= 20;
      out.emit({ type: 'shake' });
      break;
    case 'STAGGER':
      fset(s, PLAYER, 'STAGGERED');
      break;
    case 'LOSE_WEAPON': {
      moveObj(s, dweapon!, s.here);
      const nweapon = findWeapon(s, PLAYER);
      if (nweapon) out.tell(`Fortunately, you still have a ${weaponDesc(nweapon)}.`);
      break;
    }
  }
  return winnerResult(ctx, villain, def, res, od);
}

/** WINNER-RESULT: record the player's remaining strength; die if it hit zero. */
function winnerResult(ctx: Ctx, villain: string, def: number, res: Outcome, od: number): BlowResult {
  const { s } = ctx;
  s.counters.wounds = def === 0 ? 10000 : od - def;
  if (def - od < 0) ctx.queue('I-CURE', CURE_WAIT);
  if (fightStrength(s) <= 0) {
    s.counters.wounds = od - 1; // original leaves you at strength 1 for the resurrection
    jigsUp(ctx, "It appears that that last blow was too much for you. I'm afraid you are dead.",
      { panel: DEATH_PANEL[villain] });
    return 'PLAYER-DEAD';
  }
  return res;
}

// ---- the player attacks a villain (V-ATTACK + HERO-BLOW + VILLAIN-RESULT) -----

export function playerAttack(ctx: Ctx, villain: string, weapon?: string): void {
  const { s, out } = ctx;
  if (villain === 'CYCLOPS') {
    out.tell('The cyclops shrugs but otherwise ignores your pitiful attempt.');
    return;
  }
  if (weapon) {
    if (!inPlayer(s, weapon)) { out.tell(`You aren't even holding the ${weaponDesc(weapon)}.`); return; }
    if (!fset$(s, weapon, 'WEAPONBIT')) {
      out.tell(`Trying to attack the ${villainDesc(villain)} with a ${weaponDesc(weapon)} is suicidal.`);
      return;
    }
  } else {
    // convenience over the original: an unstated weapon defaults to a carried one
    weapon = contents(s, PLAYER).find((o) => fset$(s, o, 'WEAPONBIT'));
    if (!weapon) { out.tell(`Trying to attack ${aName(villain)} with your bare hands is suicidal.`); return; }
  }
  heroBlow(ctx, villain, weapon);
}

function heroBlow(ctx: Ctx, villain: string, weapon: string): void {
  const { s, out } = ctx;
  fset(s, villain, 'FIGHTBIT');
  if (fset$(s, PLAYER, 'STAGGERED')) {
    out.tell('You are still recovering from that last blow, so your attack is ineffective.');
    fclear(s, PLAYER, 'STAGGERED');
    return;
  }
  const att = Math.max(1, fightStrength(s));
  let def = villainStrength(s, villain, weapon);
  const vdesc = villainDesc(villain);
  if (def === 0) { out.tell(`Attacking the ${vdesc} is pointless.`); return; }
  const dweapon = findWeapon(s, villain);

  out.emit({ type: 'sfx', name: pickOne(ctx, ['sword-clash-1', 'sword-clash-2']) });
  out.emit({ type: 'panel', key: FIGHT_PANEL[villain] });

  let res: Outcome;
  if (!dweapon || def < 0) {
    out.tell(`The ${def < 0 ? 'unconscious' : 'unarmed'} ${vdesc} cannot defend himself: He dies.`);
    res = 'KILLED';
  } else {
    res = blowResult(ctx.rng, att, def);
    if (res === 'STAGGER' && prob(ctx, 25)) res = 'LOSE_WEAPON';
    out.tell(meleeLine(ctx.rng, HERO_MELEE, res, weaponDesc(weapon), vdesc));
  }

  switch (res) {
    case 'MISSED': case 'HESITATE':
      break;
    case 'UNCONSCIOUS':
      def = -def;
      break;
    case 'KILLED': case 'SITTING_DUCK':
      def = 0;
      break;
    case 'LIGHT_WOUND':
      def = Math.max(0, def - 1);
      break;
    case 'SERIOUS_WOUND':
      def = Math.max(0, def - 2);
      break;
    case 'STAGGER':
      fset(s, villain, 'STAGGERED');
      break;
    case 'LOSE_WEAPON':
      if (dweapon) {
        fclear(s, dweapon, 'NDESCBIT');
        fset(s, dweapon, 'WEAPONBIT');
        moveObj(s, dweapon, s.here);
        s.itRef = dweapon;
      }
      break;
  }
  villainResult(ctx, villain, def, res);
}

/** VILLAIN-RESULT: record the villain's strength; handle death and unconsciousness. */
function villainResult(ctx: Ctx, villain: string, def: number, res: Outcome): void {
  const { s, out } = ctx;
  setVstr(s, villain, def);
  if (def === 0) {
    fclear(s, villain, 'FIGHTBIT');
    out.tell(`Almost as soon as the ${villainDesc(villain)} breathes his last breath, a cloud of sinister black fog envelops him, and when the fog lifts, the carcass has disappeared.`);
    removeObj(s, villain);
    if (villain === 'TROLL') trollDead(ctx);
    else thiefDead(ctx);
  } else if (res === 'UNCONSCIOUS') {
    if (villain === 'TROLL') trollUnconscious(ctx);
    else thiefUnconscious(ctx);
  }
}

// ---- villain-specific melee modes (TROLL-FCN / ROBBER-FUNCTION) ---------------

function trollDropsAxe(ctx: Ctx): void {
  const { s } = ctx;
  if (locOf(s, 'AXE') === 'TROLL') {
    moveObj(s, 'AXE', s.here);
    fclear(s, 'AXE', 'NDESCBIT');
    fset(s, 'AXE', 'WEAPONBIT');
    fset(s, 'AXE', 'TAKEBIT');
  }
}

function trollDead(ctx: Ctx): void {
  const { s, out } = ctx;
  trollDropsAxe(ctx);
  s.gflags['TROLL-DEAD'] = true;
  s.gflags['TROLL-FLAG'] = true;
  s.gflags['TROLL-UNCONSCIOUS'] = false;
  out.emit({ type: 'panel', key: 'rooms/troll-room-empty' });
}

function trollUnconscious(ctx: Ctx): void {
  const { s } = ctx;
  fclear(s, 'TROLL', 'FIGHTBIT');
  trollDropsAxe(ctx);
  s.gflags['TROLL-UNCONSCIOUS'] = true;
  s.gflags['TROLL-FLAG'] = true; // all passages out of the room are open
}

function trollConscious(ctx: Ctx): void {
  const { s, out } = ctx;
  if (roomOf(s, 'TROLL') === s.here) {
    fset(s, 'TROLL', 'FIGHTBIT');
    out.tell('The troll stirs, quickly resuming a fighting stance.');
  }
  if (locOf(s, 'AXE') === 'TROLL-ROOM') {
    fset(s, 'AXE', 'NDESCBIT');
    fclear(s, 'AXE', 'WEAPONBIT');
    moveObj(s, 'AXE', 'TROLL');
  }
  s.gflags['TROLL-UNCONSCIOUS'] = false;
  s.gflags['TROLL-FLAG'] = false;
}

function thiefDead(ctx: Ctx): void {
  const { s, out } = ctx;
  moveObj(s, 'STILETTO', s.here);
  fclear(s, 'STILETTO', 'NDESCBIT');
  s.gflags['THIEF-DEAD'] = true;
  s.gflags['THIEF-HERE'] = false;
  s.gflags['THIEF-UNCONSCIOUS'] = false;
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
  if (s.here === 'TREASURE-ROOM') {
    if (lines.length) {
      out.tell('As the thief dies, the power of his magic decreases, and his treasures reappear:');
      out.tell(lines.join('\n'));
    }
    out.tell('The chalice is now safe to take.');
  } else if (lines.length) {
    out.tell('His booty remains.');
  }
  ctx.disable('I-THIEF');
  out.emit({ type: 'sfx', name: 'treasure-chime' });
}

function thiefUnconscious(ctx: Ctx): void {
  const { s } = ctx;
  ctx.disable('I-THIEF');
  fclear(s, 'THIEF', 'FIGHTBIT');
  moveObj(s, 'STILETTO', s.here);
  fclear(s, 'STILETTO', 'NDESCBIT');
  s.gflags['THIEF-UNCONSCIOUS'] = true;
}

function thiefConscious(ctx: Ctx): void {
  const { s, out } = ctx;
  if (roomOf(s, 'THIEF') === s.here) {
    fset(s, 'THIEF', 'FIGHTBIT');
    out.tell('The robber revives, briefly feigning continued unconsciousness, and, when he sees his moment, scrambles away from you.');
  }
  ctx.queue('I-THIEF', -1);
  recoverStiletto(ctx);
  s.gflags['THIEF-UNCONSCIOUS'] = false;
}

function recoverStiletto(ctx: Ctx): void {
  const { s } = ctx;
  if (locOf(s, 'STILETTO') === locOf(s, 'THIEF')) {
    moveObj(s, 'STILETTO', 'THIEF');
    fset(s, 'STILETTO', 'NDESCBIT');
  }
}

/** AWAKEN: an unconscious villain regains consciousness. */
function awaken(ctx: Ctx, villain: string): void {
  const { s } = ctx;
  const str = vstr(s, villain);
  if (str < 0) {
    setVstr(s, villain, -str);
    if (villain === 'TROLL') trollConscious(ctx);
    else thiefConscious(ctx);
  }
}

/** ROBBER-FUNCTION's give-while-unconscious wake-up, used by the THIEF special. */
export function wakeThiefForGift(ctx: Ctx): void {
  const { s, out } = ctx;
  if (vstr(s, 'THIEF') < 0) {
    setVstr(s, 'THIEF', -vstr(s, 'THIEF'));
    ctx.queue('I-THIEF', -1);
    recoverStiletto(ctx);
    s.gflags['THIEF-UNCONSCIOUS'] = false;
    out.tell('Your proposed victim suddenly recovers consciousness.');
  }
}

/** F-BUSY?: the villain spends the turn recovering his weapon (or cowering). */
function villainBusy(ctx: Ctx, villain: string): boolean {
  const { s, out } = ctx;
  if (villain === 'TROLL') {
    if (locOf(s, 'AXE') === 'TROLL') return false;
    if (locOf(s, 'AXE') === s.here && prob(ctx, 75)) {
      fset(s, 'AXE', 'NDESCBIT');
      fclear(s, 'AXE', 'WEAPONBIT');
      moveObj(s, 'AXE', 'TROLL');
      if (roomOf(s, 'TROLL') === s.here)
        out.tell('The troll, angered and humiliated, recovers his weapon. He appears to have an axe to grind with you.');
      return true;
    }
    if (roomOf(s, 'TROLL') === s.here) {
      out.tell('The troll, disarmed, cowers in terror, pleading for his life in the guttural tongue of the trolls.');
      return true;
    }
    return false;
  }
  // THIEF
  if (locOf(s, 'STILETTO') === 'THIEF') return false;
  if (locOf(s, 'STILETTO') === locOf(s, 'THIEF')) {
    moveObj(s, 'STILETTO', 'THIEF');
    fset(s, 'STILETTO', 'NDESCBIT');
    if (roomOf(s, 'THIEF') === s.here)
      out.tell('The robber, somewhat surprised at this turn of events, nimbly retrieves his stiletto.');
    return true;
  }
  return false;
}

/** F-FIRST?: does the villain start the fight unprovoked? */
function firstStrike(ctx: Ctx, villain: string): boolean {
  const { s } = ctx;
  if (villain === 'TROLL') {
    if (prob(ctx, 33)) { fset(s, 'TROLL', 'FIGHTBIT'); return true; }
    return false;
  }
  if (s.gflags['THIEF-HERE'] && !fset$(s, 'THIEF', 'INVISIBLE') && prob(ctx, 20)) {
    fset(s, 'THIEF', 'FIGHTBIT');
    return true;
  }
  return false;
}

// ---- the per-turn fight daemon (I-FIGHT + DO-FIGHT) ---------------------------

export function fightDaemon(ctx: Ctx): void {
  const { s } = ctx;
  if (s.dead) return;
  if (s.justArrived) return; // let the player see the room before a villain gets a free swing
  let fight = false;
  for (const villain of FIGHT_VILLAINS) {
    const present = roomOf(s, villain) === s.here && !fset$(s, villain, 'INVISIBLE');
    if (present) {
      if (villain === 'THIEF' && s.thiefEngrossed) { s.thiefEngrossed = false; continue; }
      if (vstr(s, villain) < 0) {
        // unconscious: growing chance of waking each turn
        const p = s.counters[`WAKE-${villain}`] ?? 0;
        if (p !== 0 && prob(ctx, p)) {
          s.counters[`WAKE-${villain}`] = 0;
          awaken(ctx, villain);
        } else {
          s.counters[`WAKE-${villain}`] = p + 25;
        }
      } else if (fset$(s, villain, 'FIGHTBIT') || firstStrike(ctx, villain)) {
        fight = true;
      }
    } else {
      if (fset$(s, villain, 'FIGHTBIT')) villainBusy(ctx, villain);
      if (villain === 'THIEF') s.thiefEngrossed = false;
      fclear(s, PLAYER, 'STAGGERED');
      fclear(s, villain, 'STAGGERED');
      fclear(s, villain, 'FIGHTBIT');
      awaken(ctx, villain);
    }
  }
  if (fight) doFight(ctx);
}

/** DO-FIGHT: one round of villain blows — more if the player is knocked out. */
function doFight(ctx: Ctx): void {
  const { s } = ctx;
  let knockedOut = 0;
  for (;;) {
    for (const villain of FIGHT_VILLAINS) {
      if (!fset$(s, villain, 'FIGHTBIT')) continue;
      if (villainBusy(ctx, villain)) continue;
      const res = villainBlow(ctx, villain, knockedOut > 0);
      if (res === 'PLAYER-DEAD' || s.dead) return;
      if (res === 'UNCONSCIOUS') knockedOut = 2 + Math.floor(ctx.rng() * 3);
    }
    if (knockedOut === 0) return;
    knockedOut -= 1;
    if (knockedOut === 0) return;
  }
}
