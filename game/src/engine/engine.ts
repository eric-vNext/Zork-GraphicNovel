// The main loop (ports gmain.zil MAIN-LOOP): parse -> perform -> clock,
// plus system verbs, pending questions, AGAIN, and save/restore.
import type { WorldState, GameEvent } from './types';
import { newState, Out, fset, fclear, fset$, moveObj, roomLit, DATA, roomDef, PLAYER, inventory, objDef } from './world';
import type { Ctx } from './ctx';
import { parse, completePending, type PendingParse, type Command } from '../parser/parse';
import { perform, goTo, enterRoom } from './verbs';
import { clocker, DAEMONS } from './daemons';
import { jigsUp } from './death';
import { describeRoom } from './describe';

const SAVE_KEY = 'zork-gn-save';
const RANKS: Array<[number, string]> = [
  [350, 'Master Adventurer'], [330, 'Wizard'], [300, 'Master'], [200, 'Adventurer'],
  [100, 'Junior Adventurer'], [50, 'Novice Adventurer'], [25, 'Amateur Adventurer'], [0, 'Beginner'],
];

export class Game {
  s: WorldState;
  private pending: PendingParse | null = null;
  private lastCmd: string | null = null;
  private rngState = 12345;

  constructor() {
    this.s = newState();
    this.initWorld();
  }

  private rng = (): number => {
    // deterministic-ish xorshift, reseeded by moves for variety
    this.rngState ^= this.rngState << 13; this.rngState ^= this.rngState >>> 17; this.rngState ^= this.rngState << 5;
    this.rngState >>>= 0;
    return (this.rngState % 100000) / 100000;
  };

  private initWorld(): void {
    const s = this.s;
    // daemons that run from the start
    s.daemons['I-THIEF'] = { tick: -1, enabled: true };
    s.daemons['I-FIGHT'] = { tick: -1, enabled: true };
    s.daemons['I-SWORD'] = { tick: -1, enabled: true };
    s.daemons['I-CYCLOPS'] = { tick: -1, enabled: true };
    s.daemons['I-FOREST-ROOM'] = { tick: -1, enabled: true };
  }

  private makeCtx(out: Out, cmd?: Partial<Command>): Ctx {
    const self = this;
    const ctx: Ctx = {
      s: this.s, out,
      verb: cmd?.verb ?? '',
      dobj: cmd?.dobjs?.[0],
      iobj: cmd?.iobj,
      prep: cmd?.prep,
      rng: this.rng,
      queue: (name, ticks) => { self.s.daemons[name] = { tick: ticks, enabled: true }; },
      disable: (name) => { if (self.s.daemons[name]) self.s.daemons[name].enabled = false; },
      enabled: (name) => !!self.s.daemons[name]?.enabled,
      die: (text, opts) => jigsUp(ctx, text, opts),
      winGame: () => this.win(out),
      moveTo: (room, describe) => {
        if (describe) enterRoom(ctx, room);
        else { self.s.here = room; out.emit({ type: 'room', room }); }
      },
      perform: (verb, dobj, iobj) => {
        const sub = this.makeCtx(out, { verb, dobjs: dobj ? [dobj] : undefined, iobj });
        if (verb === 'look') describeRoom(this.s, out, true);
        else perform(sub);
      },
    };
    return ctx;
  }

  start(): GameEvent[] {
    const out = new Out();
    out.tell('ZORK I: The Great Underground Empire', 'system');
    out.tell('Zork is a registered trademark of Infocom, Inc.\nRevision 88 / Serial number 840726\nGraphic Novel Edition — an open-source port of the historical source release.', 'system');
    out.emit({ type: 'room', room: this.s.here });
    describeRoom(this.s, out, true);
    this.s.touched[this.s.here] = true;
    return out.events;
  }

  private win(out: Out): void {
    const s = this.s;
    s.won = true;
    out.tell('Inside the Barrow', 'room-name');
    out.tell('As you enter the barrow, the door closes inexorably behind you. Around you it is dark, but ahead is an enormous cavern, brightly lit. Through its center runs a wide stream. Spanning the stream is a small wooden footbridge, and beyond a path leads into a dark tunnel. Above the bridge, floating in the air, is a large sign. It reads:  All ye who stand before this bridge have completed a great and perilous adventure which has won you the right to explore the Great Underground Empire. Those who pass over this bridge must be prepared to undertake an even greater adventure that will severely test your skill and bravery!');
    out.tell(`Your score is ${s.counters.score} (total of 350 points), in ${s.counters.moves} moves. This gives you the rank of Master Adventurer.`, 'system');
    out.emit({ type: 'victory' });
  }

  execute(input: string): GameEvent[] {
    const out = new Out();
    const s = this.s;
    if (s.dead || s.won) {
      out.tell(s.won ? 'The game is over. Start a new game to play again.' : 'You are dead. RESTART or RESTORE a saved game.', 'system');
      return out.events;
    }

    let raw = input.trim();
    if (!raw) { out.tell('I beg your pardon?'); return out.events; }

    // echo command back in log styling is handled by UI; here: AGAIN
    if (/^(g|again)$/i.test(raw)) {
      if (!this.lastCmd) { out.tell('again what?'); return out.events; }
      raw = this.lastCmd;
    }

    // pending question (disambiguation / orphan)
    let result;
    if (this.pending) {
      const p = this.pending;
      this.pending = null;
      result = completePending(s, p, raw);
    } else {
      result = parse(s, raw);
    }

    if (result.error) { out.tell(result.error); return out.events; }
    if (result.ask) {
      this.pending = result.ask.pending;
      out.tell(result.ask.question);
      if (result.ask.options.length) out.emit({ type: 'ask', question: result.ask.question, options: result.ask.options });
      return out.events;
    }

    const cmd = result.cmd!;
    this.lastCmd = raw.toLowerCase() === 'again' ? this.lastCmd : raw;

    // Loud Room echo effect: most commands just echo back
    if (s.here === 'LOUD-ROOM' && !s.gflags['ECHO-FLAG'] && !s.gflags['LOW-TIDE']) {
      const allowed = new Set(['walk', 'echo', 'look', 'save', 'restore', 'quit', 'restart', 'verbose', 'brief', 'superbrief', 'score']);
      if (!allowed.has(cmd.verb)) {
        const w = raw.split(/\s+/).pop();
        out.tell(`${w} ${w} ...`);
        this.tick(out);
        return out.events;
      }
    }

    // system verbs (no game time passes)
    switch (cmd.verb) {
      case 'score': this.reportScore(out); return out.events;
      case 'diagnose': {
        const w = s.counters.wounds;
        out.tell(w === 0 ? 'You are in perfect health.' :
          w === 1 ? 'You have a light wound, which will be cured after some rest.' :
          'You have serious wounds, which will be cured only after a long rest.');
        if (s.counters.deaths > 0) out.tell(`You have been killed ${s.counters.deaths === 1 ? 'once' : 'twice'}.`);
        return out.events;
      }
      case 'verbose': s.verbosity = 'verbose'; out.tell('Maximum verbosity.', 'system'); return out.events;
      case 'brief': s.verbosity = 'brief'; out.tell('Brief descriptions.', 'system'); return out.events;
      case 'superbrief': s.verbosity = 'superbrief'; out.tell('Superbrief descriptions.', 'system'); return out.events;
      case 'save': this.save(out); return out.events;
      case 'restore': this.restore(out); return out.events;
      case 'restart': out.tell('Use the menu (or reload) to restart.', 'system'); return out.events;
      case 'quit': this.reportScore(out); out.tell('Use the menu to leave the game.', 'system'); return out.events;
      case 'version': out.tell('Zork I: The Great Underground Empire — Graphic Novel Edition v1.0. Ported from the historicalsource/zork1 ZIL release.', 'system'); return out.events;
      case 'help':
        out.tell('Type commands like: OPEN MAILBOX, GO NORTH (or just N), TAKE LAMP, ATTACK TROLL WITH SWORD, PUT COFFIN IN CASE.\nUseful commands: LOOK (L), EXAMINE (X), INVENTORY (I), WAIT (Z), AGAIN (G), SCORE, DIAGNOSE, SAVE, RESTORE, VERBOSE/BRIEF.\nLight your lamp before going below. Beware of grues.', 'system');
        return out.events;
    }

    const ctx = this.makeCtx(out, cmd);

    if (cmd.verb === 'walk' && cmd.dir) {
      goTo(ctx, cmd.dir);
    } else if ((cmd.dobjs?.length ?? 0) > 1) {
      // multi-object: perform per object with name prefix
      for (const o of cmd.dobjs!) {
        if (s.dead) break;
        const od = DATA.objects[o];
        if (!od) continue;
        // ALL filtering: only take/drop sensible objects
        if (cmd.allBut) {
          if (cmd.verb === 'take' && (!fset$(s, o, 'TAKEBIT') || s.locs[o] === PLAYER)) continue;
          if (cmd.verb === 'drop' && s.locs[o] !== PLAYER) continue;
          if (cmd.verb === 'put' && (s.locs[o] !== PLAYER || o === cmd.iobj)) continue;
        }
        out.tell(`${od.desc}: `, 'system');
        const sub = this.makeCtx(out, { ...cmd, dobjs: [o] });
        perform(sub);
      }
      if (cmd.allBut && !cmd.dobjs!.length) out.tell('There is nothing here to take.');
    } else {
      perform(ctx);
    }

    if (!s.dead && !s.won) this.tick(out);
    out.emit({ type: 'score', score: s.counters.score, moves: s.counters.moves });
    return out.events;
  }

  private tick(out: Out): void {
    const ctx = this.makeCtx(out, { verb: 'wait' });
    clocker(ctx);
    this.s.justArrived = false; // only the tick immediately after entry gets the reprieve
    // darkness grue pressure while standing still
    const s = this.s;
    if (!roomLit(s)) {
      s.grueTurns += 1;
      if (s.grueTurns >= 3 && this.rng() < 0.4) {
        out.emit({ type: 'panel', key: 'events/grue-death' });
        jigsUp(ctx, 'Oh, no! You have walked into the slavering fangs of a lurking grue!', {});
      }
    } else s.grueTurns = 0;
  }

  private reportScore(out: Out): void {
    const s = this.s;
    const rank = RANKS.find(([min]) => s.counters.score >= min)?.[1] ?? 'Beginner';
    out.tell(`Your score is ${s.counters.score} (total of 350 points), in ${s.counters.moves} moves.\nThis gives you the rank of ${rank}.`, 'system');
  }

  save(out: Out): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.s));
      out.tell('Ok.', 'system');
    } catch {
      out.tell('Save failed.', 'system');
    }
  }

  restore(out: Out): void {
    const data = localStorage.getItem(SAVE_KEY);
    if (!data) { out.tell('There is no saved game.', 'system'); return; }
    try {
      this.s = JSON.parse(data);
      out.tell('Ok.', 'system');
      out.emit({ type: 'room', room: this.s.here });
      describeRoom(this.s, out, true);
      out.emit({ type: 'score', score: this.s.counters.score, moves: this.s.counters.moves });
    } catch {
      out.tell('Restore failed.', 'system');
    }
  }

  exportSave(): string { return JSON.stringify(this.s); }
  importSave(json: string, out: Out): boolean {
    try {
      this.s = JSON.parse(json);
      out.tell('Ok.', 'system');
      out.emit({ type: 'room', room: this.s.here });
      describeRoom(this.s, out, true);
      return true;
    } catch { out.tell('That save file is invalid.', 'system'); return false; }
  }
}
