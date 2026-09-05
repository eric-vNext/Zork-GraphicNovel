// The main loop (ports gmain.zil MAIN-LOOP): parse -> perform -> clock,
// plus system verbs, pending questions, AGAIN, and save/restore.
import type { WorldState, GameEvent, GameNumber } from './types';
import { SAVE_VERSION } from './types';
import { activeGame, selectGame, rankFor } from '../data/games';
import { newState, Out, fset, fclear, fset$, moveObj, roomLit, DATA, roomDef, PLAYER, inventory, objDef } from './world';
import type { Ctx } from './ctx';
import { parse, completePending, type PendingParse, type Command } from '../parser/parse';
import { perform, goTo, enterRoom, roomEndAction } from './verbs';
import { clocker, DAEMONS, candleTicksRemaining } from './daemons';
import { fightStrength } from './melee';
import { jigsUp } from './death';
import { describeRoom } from './describe';

const UNKNOWN_WORD_RE = /^I don't know the word "(.+)"\.$/;

export class Game {
  s: WorldState;
  private pending: PendingParse | null = null;
  private lastCmd: string | null = null;
  private lastFailedRaw: string | null = null;
  private lastFailedWord: string | null = null;
  private rngState = 12345;
  private scripting = false;
  private transcript: string[] = [];
  private pendingRestart = false; // RESTART asked "Y is affirmative", awaiting the answer

  constructor(game: GameNumber = 1) {
    selectGame(game);
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
    const def = activeGame();
    // Daemons that run from the start, per game (ZIL's initial QUEUE/ENABLE).
    for (const d of def.initialDaemons) {
      this.s.daemons[d] = { tick: -1, enabled: true };
    }
    // The object moves each game's GO routine makes before the first LOOK.
    for (const [obj, dest] of def.startingMoves ?? []) this.s.locs[obj] = dest;
  }

  private makeCtx(out: Out, cmd?: Partial<Command>): Ctx {
    const self = this;
    const ctx: Ctx = {
      s: this.s, out,
      verb: cmd?.verb ?? '',
      word: cmd?.word,
      dobj: cmd?.dobjs?.[0],
      iobj: cmd?.iobj,
      prep: cmd?.prep,
      rng: this.rng,
      queue: (name, ticks) => { self.s.daemons[name] = { tick: ticks, enabled: true }; },
      enable: (name, ticksIfNew) => {
        const d = self.s.daemons[name];
        if (d) d.enabled = true;
        else self.s.daemons[name] = { tick: ticksIfNew, enabled: true };
      },
      disable: (name) => { if (self.s.daemons[name]) self.s.daemons[name].enabled = false; },
      enabled: (name) => !!self.s.daemons[name]?.enabled,
      die: (text, opts) => jigsUp(ctx, text, opts),
      winGame: () => this.win(out),
      moveTo: (room, describe) => {
        if (describe) enterRoom(ctx, room);
        else { self.s.here = room; out.emit({ type: 'room', room }); }
      },
      walk: (dir) => { goTo(self.makeCtx(out, { verb: 'walk', dir }), dir); },
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
    // GO (each game's dungeon file) opens with V-VERSION's banner, after any
    // prologue the game prints first.
    const def = activeGame();
    if (def.prologue) out.tell(def.prologue);
    out.tell(def.version, 'system');
    out.tell('Graphic Novel Edition — an open-source port of the historical source release.', 'system');
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
    out.tell(this.scoreLine().replace(/\n/g, ' '), 'system');
    out.emit({ type: 'victory' });
  }

  execute(input: string): GameEvent[] {
    const wasScripting = this.scripting;
    const events = this.executeInner(input);
    if (wasScripting || this.scripting) {
      const lines = events.filter((e) => e.type === 'text').map((e: any) => e.text);
      this.transcript.push(`> ${input}`, ...lines, '');
    }
    return events;
  }

  /** SCRIPT toggles a running transcript; UNSCRIPT closes it. Ports V-SCRIPT/V-UNSCRIPT. */
  isScripting(): boolean { return this.scripting; }
  getTranscript(): string { return this.transcript.join('\n'); }

  private executeInner(input: string): GameEvent[] {
    const out = new Out();
    const s = this.s;
    let raw = input.trim();

    // answer to "Do you wish to restart? (Y is affirmative):" — must be checked
    // before the dead/won gate, since RESTART is offered in both states
    if (this.pendingRestart) {
      this.pendingRestart = false;
      if (/^y(es)?$/i.test(raw)) {
        out.tell('Restarting.', 'system');
        out.emit({ type: 'restart' });
      } else {
        out.tell('Ok.', 'system');
      }
      return out.events;
    }

    if (s.dead || s.won) {
      // the death message promises RESTART and RESTORE work — honor that
      if (/^restart$/i.test(raw)) { this.askRestart(out); return out.events; }
      if (s.dead && /^restore$/i.test(raw)) { out.emit({ type: 'restore-request' }); return out.events; }
      out.tell(s.won ? 'The game is over. Start a new game to play again.' : 'You are dead. RESTART or RESTORE a saved game.', 'system');
      return out.events;
    }

    if (!raw) { out.tell('I beg your pardon?'); return out.events; }

    // TEMP DEBUG (added to investigate a user-reported candle-burnout bug;
    // delete this block once that's resolved): reports the candles' total
    // remaining turns of light without costing a turn or touching state.
    if (/^candlelife$/i.test(raw)) {
      const remaining = candleTicksRemaining(s);
      const lit = fset$(s, 'CANDLES', 'ONBIT');
      const burnedOut = fset$(s, 'CANDLES', 'RMUNGBIT');
      out.tell(
        `[debug] candleIdx=${s.counters.candleIdx} lit=${lit} burnedOut=${burnedOut} ` +
        `daemonTick=${s.daemons['I-CANDLES']?.tick ?? 'n/a'} daemonEnabled=${!!s.daemons['I-CANDLES']?.enabled} ` +
        `totalTurnsOfLightLeft=${remaining}`,
        'system',
      );
      return out.events;
    }

    // TEMP DEBUG (added alongside candlelife to let the user finish a test
    // playthrough past the candle-fuse gotcha; delete this block together
    // with candlelife once testing wraps up): resets the candles to a full
    // fresh 35-turn budget. Does not change whether they're currently lit —
    // if they were burned out (RMUNGBIT), light them again to resume use.
    if (/^rechargecandles$/i.test(raw)) {
      s.counters.candleIdx = 0;
      fclear(s, 'CANDLES', 'RMUNGBIT');
      if (s.daemons['I-CANDLES']) s.daemons['I-CANDLES'].enabled = false;
      out.tell('[debug] Candles recharged to a full 35 turns of light.', 'system');
      return out.events;
    }

    // echo command back in log styling is handled by UI; here: AGAIN
    if (/^(g|again)$/i.test(raw)) {
      if (!this.lastCmd) { out.tell('again what?'); return out.events; }
      raw = this.lastCmd;
    }

    // OOPS <word>: splice a corrected word into the command that just failed
    // to parse and re-run it, ports gparser.zil's OOPS-TABLE mechanism.
    const oopsMatch = /^oops\s+(\S+)$/i.exec(raw);
    if (oopsMatch) {
      if (!this.lastFailedRaw || !this.lastFailedWord) {
        out.tell("I beg your pardon?");
        return out.events;
      }
      const idx = this.lastFailedRaw.toLowerCase().lastIndexOf(this.lastFailedWord.toLowerCase());
      raw = idx < 0 ? this.lastFailedRaw
        : this.lastFailedRaw.slice(0, idx) + oopsMatch[1] + this.lastFailedRaw.slice(idx + this.lastFailedWord.length);
      this.lastFailedRaw = null;
      this.lastFailedWord = null;
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

    if (result.error) {
      const m = UNKNOWN_WORD_RE.exec(result.error);
      if (m) { this.lastFailedRaw = raw; this.lastFailedWord = m[1]; }
      out.tell(result.error);
      return out.events;
    }
    if (result.ask) {
      this.pending = result.ask.pending;
      out.tell(result.ask.question);
      if (result.ask.options.length) out.emit({ type: 'ask', question: result.ask.question, options: result.ask.options });
      return out.events;
    }

    const cmd = result.cmd!;
    this.lastCmd = raw.toLowerCase() === 'again' ? this.lastCmd : raw;

    // Loud Room: while it's roaring, only SAVE/RESTORE/QUIT/WEST/EAST/UP/BUG/ECHO
    // get through — literally everything else (including other directions,
    // LOOK, SCORE, etc.) falls through to V-ECHO's word-then-ellipsis gag.
    // Ports LOUD-ROOM-FCN's M-ENTER read-loop word dispatch verbatim.
    if (s.here === 'LOUD-ROOM' && !s.gflags['ECHO-FLAG'] && !s.gflags['LOW-TIDE']) {
      const loudOk =
        cmd.verb === 'echo' || cmd.verb === 'bug' ||
        cmd.verb === 'save' || cmd.verb === 'restore' || cmd.verb === 'quit' ||
        (cmd.verb === 'walk' && (cmd.dir === 'WEST' || cmd.dir === 'EAST' || cmd.dir === 'UP'));
      if (!loudOk) {
        const w = raw.split(/\s+/).pop();
        out.tell(`${w} ${w} ...`);
        this.tick(out);
        return out.events;
      }
    }

    if (cmd.verb === 'wait') return this.doWait(out, cmd);

    // system verbs (no game time passes)
    switch (cmd.verb) {
      case 'score': this.reportScore(out); return out.events;
      case 'diagnose': {
        // ports V-DIAGNOSE
        const cure = s.daemons['I-CURE'];
        const wd = cure?.enabled ? s.counters.wounds : 0;
        const rs = fightStrength(s, false) - wd;
        if (wd === 0) out.tell('You are in perfect health.');
        else {
          const sev = wd === 1 ? 'a light wound' : wd === 2 ? 'a serious wound' : wd === 3 ? 'several wounds' : 'serious wounds';
          out.tell(`You have ${sev}, which will be cured after ${30 * (wd - 1) + Math.max(0, cure?.tick ?? 30)} moves.`);
        }
        out.tell(`You can ${rs <= 0 ? 'expect death soon' :
          rs === 1 ? 'be killed by one more light wound' :
          rs === 2 ? 'be killed by a serious wound' :
          rs === 3 ? 'survive one serious wound' : 'survive several wounds'}.`);
        if (s.counters.deaths > 0) out.tell(`You have been killed ${s.counters.deaths === 1 ? 'once' : 'twice'}.`);
        return out.events;
      }
      case 'verbose': s.verbosity = 'verbose'; out.tell('Maximum verbosity.', 'system'); return out.events;
      case 'brief': s.verbosity = 'brief'; out.tell('Brief descriptions.', 'system'); return out.events;
      case 'superbrief': s.verbosity = 'superbrief'; out.tell('Superbrief descriptions.', 'system'); return out.events;
      case 'save': out.emit({ type: 'save-request' }); return out.events;
      case 'restore': out.emit({ type: 'restore-request' }); return out.events;
      case 'restart': this.askRestart(out); return out.events;
      case 'quit': this.reportScore(out); out.tell('Use the menu to leave the game.', 'system'); return out.events;
      case 'version': this.printVersion(out); return out.events;
      case 'bug': out.tell('Bug? Not in a flawless program like this! (Cough, cough).', 'system'); return out.events;
      case 'script':
        this.scripting = true;
        out.tell('Here begins a transcript of interaction with', 'system');
        this.printVersion(out);
        return out.events;
      case 'unscript':
        out.tell('Here ends a transcript of interaction with', 'system');
        this.printVersion(out);
        this.scripting = false;
        return out.events;
      case 'help':
        out.tell('Type commands like: OPEN MAILBOX, GO NORTH (or just N), TAKE LAMP, ATTACK TROLL WITH SWORD, PUT COFFIN IN CASE.\nUseful commands: LOOK (L), EXAMINE (X), INVENTORY (I), WAIT (Z) or WAIT N, AGAIN (G), OOPS <word>, SCORE, DIAGNOSE, SAVE, RESTORE, VERBOSE/BRIEF, SCRIPT/UNSCRIPT.\nLight your lamp before going below. Beware of grues.', 'system');
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

    // The room's M-END arm runs after the action and before the clock
    // (gmain.zil:154). The Crypt uses it to notice that the light just went out.
    if (!s.dead && !s.won) roomEndAction(this.makeCtx(out, cmd), s.here);
    if (!s.dead && !s.won) this.tick(out, cmd);
    out.emit({ type: 'score', score: s.counters.score, moves: s.counters.moves });
    return out.events;
  }

  /** WAIT <n>: ports V-WAIT — loops the clock up to n times (default 3), stopping
   *  early the moment a daemon has something to say (CLOCKER returning truthy). */
  private doWait(out: Out, cmd: Command): GameEvent[] {
    const s = this.s;
    out.tell('Time passes...');
    const n = Math.max(0, cmd.num ?? 3);
    for (let i = 0; i < n && !s.dead && !s.won; i++) {
      const before = out.events.length;
      this.tick(out, cmd);
      if (out.events.length > before) break;
    }
    out.emit({ type: 'score', score: s.counters.score, moves: s.counters.moves });
    return out.events;
  }

  /** V-VERSION (gverbs.zil:99) — the banner differs per game. */
  private printVersion(out: Out): void {
    out.tell(activeGame().version, 'system');
  }

  private tick(out: Out, cmd?: Partial<Command>): void {
    // daemons see the turn's command — I-FIGHT reads its weapon like ZIL reads PRSI
    const ctx = this.makeCtx(out, cmd ?? { verb: 'wait' });
    clocker(ctx);
    this.s.justArrived = false; // only the tick immediately after entry gets the reprieve
    // darkness grue pressure while standing still
    const s = this.s;
    if (!roomLit(s)) {
      s.grueTurns += 1;
      if (s.grueTurns >= 3 && this.rng() < 0.4) {
        out.emit({ type: 'panel', key: 'events/grue-death' });
        out.emit({ type: 'shake' });
        jigsUp(ctx, 'Oh, no! You have walked into the slavering fangs of a lurking grue!', {});
      }
    } else s.grueTurns = 0;
  }

  /** Ports each game's V-SCORE text; the wording differs per game. */
  private scoreLine(): string {
    const { score, moves } = this.s.counters;
    return activeGame().scoring.line(score, moves, rankFor(score));
  }

  private reportScore(out: Out): void {
    out.tell(this.scoreLine(), 'system');
  }

  // Ports V-RESTART (gverbs.zil): report score, then ask for confirmation.
  private askRestart(out: Out): void {
    this.reportScore(out);
    this.pendingRestart = true;
    out.tell('Do you wish to restart? (Y is affirmative):', 'system');
    out.emit({ type: 'ask', question: 'Do you wish to restart?', options: ['yes', 'no'] });
  }

  exportSave(): string { return JSON.stringify(this.s); }

  /**
   * Bring a save written before the trilogy refactor up to the current shape.
   * Pre-v1 saves have no `game` (they can only be Zork I) and carry the thief's
   * position in the two Zork-I-only fields that `actorRooms`/`actorFlags`
   * replaced.
   */
  private static migrate(raw: any): WorldState {
    if (!raw || typeof raw !== 'object') throw new Error('not a save');
    if ((raw.saveVersion ?? 0) < 1) {
      raw.game = 1;
      raw.actorRooms = { THIEF: raw.thiefRoom ?? 'ROUND-ROOM' };
      raw.actorFlags = { THIEF_ENGROSSED: !!raw.thiefEngrossed };
      delete raw.thiefRoom;
      delete raw.thiefEngrossed;
      raw.saveVersion = SAVE_VERSION;
    }
    // Fields added after v1; a save written before them simply has none.
    raw.gvars ??= {};
    raw.mungedRooms ??= {};
    return raw as WorldState;
  }

  importSave(json: string, out: Out): boolean {
    try {
      const state = Game.migrate(JSON.parse(json));
      selectGame(state.game);
      this.s = state;
      out.tell('Ok.', 'system');
      out.emit({ type: 'room', room: this.s.here });
      describeRoom(this.s, out, true);
      out.emit({ type: 'score', score: this.s.counters.score, moves: this.s.counters.moves });
      return true;
    } catch { out.tell('That save file is invalid.', 'system'); return false; }
  }
}
