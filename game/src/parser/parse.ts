// The parser: tokenizing, vocabulary, noun resolution, disambiguation, ALL/AND.
// Ports the player-visible behavior of gparser.zil for Zork I's grammar.
import { DATA } from '../engine/world';
import type { WorldState } from '../engine/types';
import { visibleObjects, allScopeObjects, fset$, reachable } from '../engine/world';

export interface NounPhrase { noun: string; adjectives: string[]; raw: string }

export interface Command {
  verb: string;                 // canonical verb id, e.g. 'take'
  dir?: string;                 // for 'walk'
  dobjs?: string[];             // resolved object ids (multiple for ALL/AND)
  iobj?: string;
  prep?: string;
  raw: string;
  allBut?: boolean;             // dobjs came from ALL
}

export interface ParseResult {
  cmd?: Command;
  error?: string;
  // disambiguation / orphaning
  ask?: { question: string; options: string[]; pending: PendingParse };
}

export interface PendingParse {
  raw: string;                  // original input with a hole
  slot: 'dobj' | 'iobj';
  candidates?: string[];        // object ids to choose among
}

// ---------------- vocabulary ----------------
const DIR_WORDS: Record<string, string> = {
  north: 'NORTH', n: 'NORTH', south: 'SOUTH', s: 'SOUTH', east: 'EAST', e: 'EAST',
  west: 'WEST', w: 'WEST', northeast: 'NE', ne: 'NE', northwest: 'NW', nw: 'NW',
  southeast: 'SE', se: 'SE', southwest: 'SW', sw: 'SW', up: 'UP', u: 'UP',
  down: 'DOWN', d: 'DOWN', in: 'IN', out: 'OUT', land: 'LAND', cross: 'CROSS',
};

// verb aliases -> canonical verb
const VERBS: Record<string, string> = {};
function v(canon: string, ...aliases: string[]) { for (const a of [canon, ...aliases]) VERBS[a] = canon; }
v('walk', 'go', 'run', 'proceed', 'step');
v('take', 'get', 'grab', 'carry', 'hold', 'catch');
v('pick');                       // pick up
v('drop', 'release');
v('put', 'place', 'insert', 'stuff');
v('open');
v('close', 'shut');
v('read', 'peruse');
v('examine', 'describe', 'what', 'whats');
v('look', 'l', 'stare', 'gaze');
v('inventory', 'i', 'inv');
v('turn', 'set', 'flip', 'switch');
v('light');
v('extinguish', 'douse');
v('move', 'roll');
v('push', 'press');
v('pull', 'tug', 'yank');
v('attack', 'kill', 'fight', 'hit', 'strike', 'slay', 'stab', 'murder', 'dispatch');
v('give', 'donate', 'offer', 'feed', 'hand');
v('throw', 'hurl', 'chuck', 'toss');
v('tie', 'fasten', 'attach');
v('untie', 'unfasten');
v('climb', 'scale');
v('enter', 'board');
v('exit', 'disembark', 'leave');
v('launch');
v('wave', 'brandish');
v('dig', 'excavate');
v('ring', 'peal');
v('pray');
v('wind');
v('touch', 'rub', 'feel', 'pat', 'pet');
v('drink', 'sip', 'quaff', 'imbibe');
v('eat', 'consume', 'taste', 'devour', 'gobble', 'munch');
v('fill');
v('pour', 'spill', 'empty');
v('lock');
v('unlock');
v('inflate', 'pump');
v('deflate');
v('lower');
v('raise', 'lift');
v('smell', 'sniff');
v('listen');
v('jump', 'leap');
v('swim', 'bathe', 'wade');
v('knock', 'rap');
v('count');
v('search');
v('kiss');
v('burn', 'incinerate', 'ignite');
v('cut', 'slice');
v('break', 'smash', 'destroy', 'damage');
v('shake');
v('squeeze');
v('wear');
v('say', 'speak', 'utter');
v('shout', 'yell', 'scream');
v('hello', 'hi');
v('diagnose');
v('score');
v('save');
v('restore');
v('restart');
v('quit', 'q');
v('verbose');
v('brief');
v('superbrief');
v('wait', 'z');
v('again', 'g');
v('version');
v('help', 'about', 'info');
v('xyzzy');
v('plugh');
v('zork');
v('echo');
v('odysseus', 'ulysses');
v('swing');
v('sleep');
v('curse', 'damn', 'shit', 'fuck');
v('smash');
v('follow');
v('cross', 'ford');
v('yes', 'y');
v('no');

const PREPS = new Set(['with', 'using', 'in', 'into', 'inside', 'on', 'onto', 'to', 'at', 'under', 'underneath',
  'beneath', 'behind', 'from', 'through', 'over', 'off', 'around', 'across', 'for', 'about', 'against', 'beside']);

const NOISE = new Set(['the', 'a', 'an', 'some', 'this', 'that', 'my', 'of', 'please', 'then']);

// noun/adjective tables built from world data
const NOUNS = new Map<string, string[]>();     // word -> object ids
const ADJS = new Map<string, string[]>();
for (const [id, o] of Object.entries(DATA.objects)) {
  for (const syn of o.synonyms) {
    const w = syn.toLowerCase();
    if (!NOUNS.has(w)) NOUNS.set(w, []);
    NOUNS.get(w)!.push(id);
  }
  for (const adj of o.adjectives) {
    const w = adj.toLowerCase();
    if (!ADJS.has(w)) ADJS.set(w, []);
    ADJS.get(w)!.push(id);
  }
}

export function isNounWord(w: string): boolean { return NOUNS.has(w) || ADJS.has(w); }

// ---------------- resolution ----------------
function matchScope(np: NounPhrase, scope: string[]): string[] {
  let ids = scope.filter((id) => NOUNS.get(np.noun)?.includes(id));
  if (np.adjectives.length) {
    ids = ids.filter((id) => {
      const adjs = (DATA.objects[id]?.adjectives ?? []).map((a) => a.toLowerCase());
      return np.adjectives.every((a) => adjs.some((x) => x.startsWith(a)));
    });
  }
  return ids;
}

export function resolveNoun(
  s: WorldState, np: NounPhrase, opts?: { forTake?: boolean }
): { id?: string; error?: string; candidates?: string[] } {
  if (np.noun === 'it') {
    if (s.itRef) return { id: s.itRef };
    return { error: "I don't know what you're referring to." };
  }
  if (!NOUNS.has(np.noun) && !ADJS.has(np.noun)) {
    return { error: `I don't know the word "${np.noun}".` };
  }
  // adjective used as a noun ("take brass")
  let phrase = np;
  if (!NOUNS.has(np.noun) && ADJS.has(np.noun)) {
    phrase = { noun: np.noun, adjectives: [], raw: np.raw };
    const scope = visibleObjects(s);
    const ids = scope.filter((id) => ADJS.get(np.noun)!.includes(id));
    if (ids.length === 1) return { id: ids[0] };
    if (ids.length > 1) return { candidates: ids };
    return { error: `You can't see any ${np.raw} here!` };
  }
  const scope = visibleObjects(s);
  const ids = matchScope(phrase, scope);
  if (ids.length === 1) return { id: ids[0] };
  if (ids.length > 1) {
    // prefer local objects over global scenery (GROUND, WALLS, ...)
    const local = ids.filter((id) => s.locs[id] !== 'GLOBAL-OBJECTS' && s.locs[id] !== 'LOCAL-GLOBALS');
    if (local.length === 1) return { id: local[0] };
    // then prefer reachable, non-scenery objects
    const pool = local.length ? local : ids;
    const good = pool.filter((id) => reachable(s, id) && !fset$(s, id, 'NDESCBIT'));
    if (good.length === 1) return { id: good[0] };
    return { candidates: pool };
  }
  return { error: `You can't see any ${np.raw} here!` };
}

function splitNounPhrase(tokens: string[]): NounPhrase | null {
  const words = tokens.filter((w) => !NOISE.has(w));
  if (!words.length) return null;
  const noun = words[words.length - 1];
  return { noun, adjectives: words.slice(0, -1), raw: words.join(' ') };
}

// ---------------- main parse ----------------
export function tokenize(input: string): string[] {
  return input.toLowerCase().replace(/[.,!?;"]/g, ' ').split(/\s+/).filter(Boolean);
}

/** Parse resolved against world state. Returns command, error, or a question. */
export function parse(s: WorldState, input: string): ParseResult {
  const raw = input.trim();
  let toks = tokenize(raw);
  if (!toks.length) return { error: 'I beg your pardon?' };

  // bare direction
  if (toks.length === 1 && DIR_WORDS[toks[0]]) {
    return { cmd: { verb: 'walk', dir: DIR_WORDS[toks[0]], raw } };
  }

  // "say xyzzy" / quoted magic words
  if ((toks[0] === 'say' || toks[0] === 'speak') && toks.length > 1) toks = toks.slice(1);

  let verbWord = toks[0];
  let verb = VERBS[verbWord];
  if (!verb) {
    if (isNounWord(verbWord)) return { error: 'There was no verb in that sentence!' };
    return { error: `I don't know the word "${verbWord}".` };
  }
  let rest = toks.slice(1);

  // particles: pick up / turn on / turn off / put down / look at|in|under|behind
  if (verb === 'pick' && rest[0] === 'up') { verb = 'take'; rest = rest.slice(1); }
  if (verb === 'put' && rest[0] === 'down') { verb = 'drop'; rest = rest.slice(1); }
  if (verb === 'put' && rest[0] === 'out') { verb = 'extinguish'; rest = rest.slice(1); }
  if (verb === 'put' && rest[0] === 'on') { verb = 'wear'; rest = rest.slice(1); }
  if (verb === 'turn') {
    if (rest[0] === 'on') { verb = 'lamp-on'; rest = rest.slice(1); }
    else if (rest[0] === 'off') { verb = 'lamp-off'; rest = rest.slice(1); }
    else if (rest.includes('on')) { verb = 'lamp-on'; rest = rest.filter((w) => w !== 'on'); }
    else if (rest.includes('off')) { verb = 'lamp-off'; rest = rest.filter((w) => w !== 'off'); }
  }
  if (verb === 'switch') verb = 'turn';
  if (verb === 'blow' && rest[0] === 'out') { verb = 'extinguish'; rest = rest.slice(1); }
  if (verb === 'look') {
    if (!rest.length) return { cmd: { verb: 'look', raw } };
    if (rest[0] === 'at') { verb = 'examine'; rest = rest.slice(1); }
    else if (rest[0] === 'in' || rest[0] === 'inside' || rest[0] === 'into') { verb = 'look-in'; rest = rest.slice(1); }
    else if (rest[0] === 'under' || rest[0] === 'beneath') { verb = 'look-under'; rest = rest.slice(1); }
    else if (rest[0] === 'behind') { verb = 'look-behind'; rest = rest.slice(1); }
    else if (rest[0] === 'up') { return { cmd: { verb: 'walk', dir: 'UP', raw } }; }
    else if (rest[0] === 'down') { return { cmd: { verb: 'walk', dir: 'DOWN', raw } }; }
    else verb = 'examine';
  }
  if (verb === 'climb') {
    if (rest[0] === 'up' || rest[0] === 'in') { rest = rest.slice(1); if (!rest.length) return { cmd: { verb: 'walk', dir: 'UP', raw } }; verb = 'climb'; }
    else if (rest[0] === 'down') { rest = rest.slice(1); if (!rest.length) return { cmd: { verb: 'walk', dir: 'DOWN', raw } }; verb = 'climb-down'; }
    else if (!rest.length) return { cmd: { verb: 'walk', dir: 'UP', raw } };
  }
  if (verb === 'walk' || verb === 'enter') {
    if (rest.length === 1 && DIR_WORDS[rest[0]]) return { cmd: { verb: 'walk', dir: DIR_WORDS[rest[0]], raw } };
    if (verb === 'walk' && !rest.length) return { error: 'Which way?' };
    if (verb === 'enter' && !rest.length) return { cmd: { verb: 'walk', dir: 'IN', raw } };
  }
  if (verb === 'exit' && !rest.length) return { cmd: { verb: 'walk', dir: 'OUT', raw } };
  if (verb === 'get' && rest[0] === 'out') return { cmd: { verb: 'walk', dir: 'OUT', raw } };
  if (verb === 'swing') verb = 'attack';
  if (verb === 'smash') verb = 'break';

  // no-object verbs pass through
  const NO_OBJ = new Set(['inventory', 'look', 'wait', 'again', 'score', 'diagnose', 'save', 'restore',
    'restart', 'quit', 'verbose', 'brief', 'superbrief', 'version', 'help', 'xyzzy', 'plugh', 'zork',
    'echo', 'odysseus', 'pray', 'jump', 'sleep', 'curse', 'shout', 'hello', 'listen', 'swim', 'yes', 'no', 'launch', 'land']);
  if (!rest.length) {
    if (NO_OBJ.has(verb)) return { cmd: { verb, raw } };
    // orphan: ask for the object
    return {
      ask: {
        question: `What do you want to ${verbWord}?`,
        options: [],
        pending: { raw, slot: 'dobj' },
      },
    };
  }

  // split on preposition
  let prep: string | undefined;
  let dTokens: string[] = [];
  let iTokens: string[] = [];
  let seenPrep = false;
  for (const w of rest) {
    if (!seenPrep && PREPS.has(w) && dTokens.length) { prep = w; seenPrep = true; continue; }
    if (!seenPrep && PREPS.has(w) && !dTokens.length && (verb === 'look-in' || verb === 'look-under')) continue;
    (seenPrep ? iTokens : dTokens).push(w);
  }
  // leading prep with no dobj yet: "look under rug" handled above; "dig in sand" =>
  if (!dTokens.length && iTokens.length) { dTokens = iTokens; iTokens = []; prep = undefined; }

  // ALL / AND multi-object handling (dobj only)
  const dWords = dTokens.filter((w) => !NOISE.has(w));
  const state = s;
  const multi: string[] = [];
  let allBut = false;

  const resolveOne = (tokens: string[]): ParseResult | string => {
    const np = splitNounPhrase(tokens);
    if (!np) return 'There seems to be a noun missing in that sentence!';
    const r = resolveNoun(state, np);
    if (r.error) return r.error;
    if (r.candidates) {
      const names = r.candidates.map((c) => DATA.objects[c]?.desc ?? c);
      return {
        ask: {
          question: `Which ${np.noun} do you mean, ${names.map((n) => `the ${n}`).join(' or ')}?`,
          options: names,
          pending: { raw, slot: 'dobj', candidates: r.candidates },
        },
      };
    }
    return { cmd: { verb: '', raw: '', dobjs: [r.id!] } } as ParseResult;
  };

  if (dWords[0] === 'all' || dWords[0] === 'everything') {
    allBut = true;
    const except: string[] = [];
    const butIdx = dWords.findIndex((w) => w === 'but' || w === 'except');
    if (butIdx >= 0) {
      const np = splitNounPhrase(dWords.slice(butIdx + 1));
      if (np) {
        const r = resolveNoun(state, np);
        if (r.id) except.push(r.id);
      }
    }
    const scope = allScopeObjects(state).filter(
      (id) => !fset$(state, id, 'NDESCBIT') && !fset$(state, id, 'INVISIBLE') && !except.includes(id)
    );
    return { cmd: { verb, dobjs: scope, prep, raw, allBut, iobj: undefined, ...resolveIobj(state, iTokens, raw) } as Command };
  }

  // "x and y and z"
  const groups: string[][] = [[]];
  for (const w of dWords) {
    if (w === 'and') groups.push([]);
    else groups[groups.length - 1].push(w);
  }
  for (const g of groups) {
    if (!g.length) continue;
    const r = resolveOne(g);
    if (typeof r === 'string') return { error: r };
    if (r.ask) return r;
    multi.push(...(r.cmd!.dobjs ?? []));
  }
  if (!multi.length) return { error: 'There seems to be a noun missing in that sentence!' };

  const ir = resolveIobj(state, iTokens, raw);
  if ('ask' in ir && ir.ask) return ir as ParseResult;
  if ('error' in ir && ir.error) return ir as ParseResult;

  return { cmd: { verb, dobjs: multi, prep, raw, iobj: (ir as { iobj?: string }).iobj } };
}

function resolveIobj(s: WorldState, iTokens: string[], raw: string):
  { iobj?: string } | ParseResult {
  if (!iTokens.length) return {};
  const np = splitNounPhrase(iTokens);
  if (!np) return {};
  const r = resolveNoun(s, np);
  if (r.error) return { error: r.error };
  if (r.candidates) {
    const names = r.candidates.map((c) => DATA.objects[c]?.desc ?? c);
    return {
      ask: {
        question: `Which ${np.noun} do you mean, ${names.map((n) => `the ${n}`).join(' or ')}?`,
        options: names,
        pending: { raw, slot: 'iobj', candidates: r.candidates },
      },
    };
  }
  return { iobj: r.id };
}

/** Complete a pending question with the player's answer. */
export function completePending(s: WorldState, pending: PendingParse, answer: string): ParseResult {
  const toks = tokenize(answer);
  if (!toks.length) return { error: 'I beg your pardon?' };
  if (pending.candidates?.length) {
    const np = splitNounPhrase(toks);
    if (np) {
      const filtered = pending.candidates.filter((id) => {
        const o = DATA.objects[id];
        const words = [...o.synonyms, ...o.adjectives].map((w) => w.toLowerCase());
        return toks.some((t) => words.some((w) => w.startsWith(t)));
      });
      if (filtered.length === 1) {
        // splice the specific object into the original command
        const spec = np.raw;
        return parse(s, disambiguatedRaw(pending.raw, spec, filtered[0]));
      }
    }
  }
  // orphan completion: "open" -> "mailbox"
  return parse(s, `${pending.raw} ${answer}`);
}

function disambiguatedRaw(raw: string, spec: string, id: string): string {
  // Replace the ambiguous noun phrase with the full adjective+noun of the chosen object.
  const o = DATA.objects[id];
  const full = [...(o.adjectives.slice(0, 1)), o.synonyms[0]].join(' ').toLowerCase();
  const toks = tokenize(raw);
  // find noun word to replace: last token that is a noun of this object
  const nounWords = o.synonyms.map((w) => w.toLowerCase());
  for (let i = toks.length - 1; i >= 0; i--) {
    if (nounWords.includes(toks[i]) || NOUNS.has(toks[i])) {
      toks.splice(i, 1, ...full.split(' '));
      return toks.join(' ');
    }
  }
  return `${raw} ${full}`;
}
