// Every `,ZORK-NUMBER` branch site in the shared ZIL library, and what this
// port does about it.
//
// The three games compile from one library (gmacros, gsyntax, gglobals, gclock,
// gmain, gparser, gverbs) plus two game-specific files each, and the library
// resolves the differences at compile time through `,ZORK-NUMBER`. Our engine
// resolves the same differences at run time through `gameNumber()`. This
// manifest is the checklist that keeps the two in step:
// `tests/branches.test.ts` re-derives the sites from the vendored
// `reference/zork1-source/gverbs.zil` and fails if any site is missing here.
//
// A site is `done` when the port implements every arm, and `deferred` when the
// non-Zork-I arm calls a routine that lives in a game's own actions file and so
// waits on that game's content (phases 6-8 of docs/Prompt-Trilogy.md). Deferred
// sites reach the engine through `runGameHook`, not through dead code.

export type BranchStatus = 'done' | 'deferred';

export interface BranchSite {
  /** Routine name in gverbs.zil. */
  routine: string;
  /** 1-based line of the `<COND ... ,ZORK-NUMBER ...>` in gverbs.zil. */
  line: number;
  /** Which games the site names an arm for. */
  arms: number[];
  status: BranchStatus;
  /** Where the port implements it, or what it is waiting on. */
  note: string;
}

export const BRANCH_SITES: BranchSite[] = [
  { routine: 'V-VERSION', line: 99, arms: [1, 2, 3], status: 'done',
    note: 'GameDef.version; engine.ts printVersion' },
  { routine: 'V-ALARM', line: 158, arms: [1], status: 'done',
    note: "verbs.ts case 'alarm'" },
  { routine: 'V-ATTACK', line: 190, arms: [1], status: 'done',
    note: "verbs.ts case 'attack' — bare-handed blows land only in Zork I" },
  { routine: 'PRE-BOARD', line: 203, arms: [3], status: 'deferred',
    note: 'Zork III water channel / time-machine seat / lake — needs those objects (phase 6)' },
  { routine: 'V-BURN', line: 252, arms: [2], status: 'deferred',
    note: "verbs.ts case 'burn' routes to the 'balloon-burn' game hook" },
  { routine: 'V-CLIMB-FOO', line: 282, arms: [3], status: 'done',
    note: "verbs.ts case 'climb' — CLIMB ROPE goes down in Zork III" },
  { routine: 'V-CLIMB-ON', line: 292, arms: [3], status: 'done',
    note: "verbs.ts case 'climb'" },
  { routine: 'V-CLIMB-UP', line: 324, arms: [1], status: 'done',
    note: "verbs.ts case 'climb' — the tree test is Zork I's" },
  { routine: 'V-DIG', line: 408, arms: [1], status: 'done',
    note: "verbs.ts case 'dig'" },
  { routine: 'V-DISENCHANT', line: 435, arms: [2], status: 'deferred',
    note: 'spells.ts holds the layer; the wand and its messages land with Zork II content' },
  { routine: 'V-ECHO', line: 528, arms: [1], status: 'done',
    note: "verbs.ts case 'echo' — the Loud Room gag is Zork I's" },
  { routine: 'V-ENCHANT', line: 551, arms: [2], status: 'deferred',
    note: 'spells.ts holds the state; aiming the wand needs the Zork II wand object' },
  { routine: 'V-ENCHANT', line: 555, arms: [2], status: 'deferred',
    note: 'spells.ts — per-spell effects need Zork II objects' },
  { routine: 'V-INCANT', line: 737, arms: [2], status: 'done',
    note: "verbs.ts case 'incant' + spells.ts" },
  { routine: 'V-LEAP', line: 831, arms: [1], status: 'done',
    note: "verbs.ts case 'jump'" },
  { routine: 'V-LOOK-INSIDE', line: 880, arms: [3], status: 'done',
    note: "verbs.ts case 'look-in'" },
  { routine: 'PRE-MUNG', line: 924, arms: [3], status: 'done',
    note: "verbs.ts case 'break' — Zork III lets the beam through to its own action" },
  { routine: 'V-ODYSSEUS', line: 946, arms: [1], status: 'done',
    note: "verbs.ts case 'odysseus'" },
  { routine: 'V-OVERBOARD', line: 997, arms: [1], status: 'deferred',
    note: 'Zork I TEETH clause; the generic vehicle throw is unported (phase 6)' },
  { routine: 'V-POUR-ON', line: 1029, arms: [2], status: 'deferred',
    note: 'Zork II BINF-FLAG (the balloon cloth) needs Zork II content' },
  { routine: 'V-POUR-ON', line: 1038, arms: [1], status: 'done',
    note: "verbs.ts case 'pour' — the Zork I gunk" },
  { routine: 'V-PRAY', line: 1047, arms: [1], status: 'done',
    note: "verbs.ts case 'pray'" },
  { routine: 'V-PUMP', line: 1057, arms: [1], status: 'deferred',
    note: 'Zork I hand pump; INFLATE is handled by the boat specials instead' },
  { routine: 'V-PUMP', line: 1062, arms: [1], status: 'deferred',
    note: 'the second half of the same Zork I hand-pump clause' },
  { routine: 'PRE-PUT', line: 1076, arms: [3], status: 'deferred',
    note: 'Zork III short pole (the mirror box) — phase 6' },
  { routine: 'V-SAY', line: 1168, arms: [2, 3], status: 'done',
    note: "verbs.ts case 'say' — Zork II routes to INCANT; Zork III's FROTZ OZMOO is phase 6" },
  { routine: 'V-SHAKE', line: 1223, arms: [3], status: 'done',
    note: "verbs.ts case 'shake' — NONLANDBIT in Zork III, not-RLANDBIT elsewhere" },
  { routine: 'SHAKE-LOOP', line: 1247, arms: [1, 2], status: 'done',
    note: 'verbs.ts shakeDest()' },
  { routine: 'V-SWIM', line: 1337, arms: [3], status: 'done',
    note: "verbs.ts case 'swim'" },
  { routine: 'PRE-TAKE', line: 1368, arms: [2], status: 'deferred',
    note: 'Zork II door keeper — phase 6' },
  { routine: 'V-THROUGH', line: 1414, arms: [2], status: 'deferred',
    note: 'the Bank of Zork curtain (SCOL-GO) — phase 6' },
  { routine: 'V-TREASURE', line: 1475, arms: [1], status: 'done',
    note: "verbs.ts case 'treasure'" },
  { routine: 'V-TREASURE', line: 1480, arms: [1], status: 'done',
    note: "verbs.ts case 'treasure'" },
  { routine: 'PRE-TURN', line: 1489, arms: [3], status: 'done',
    note: "verbs.ts case 'turn'" },
  { routine: 'PRE-TURN', line: 1496, arms: [1], status: 'done',
    note: "verbs.ts case 'turn' — the black book is Zork I's exception" },
  { routine: 'V-WALK', line: 1534, arms: [3], status: 'deferred',
    note: 'Royal Puzzle movement (CP-MOVED) — phase 6' },
  { routine: 'V-WALK', line: 1569, arms: [3], status: 'deferred',
    note: "Zork III's grue den at DARK-1/DARK-2 — phase 6" },
  { routine: 'V-WISH', line: 1611, arms: [2], status: 'done',
    note: "verbs.ts case 'wish'" },
  { routine: 'DESCRIBE-ROOM', line: 1642, arms: [1, 2, 3], status: 'done',
    note: 'describe.ts — Zork I clears MAZEBIT rooms; Zork III DARK-2 and Zork II SUPER-BRIEF are phase 6' },
  { routine: 'DESCRIBE-ROOM', line: 1653, arms: [1], status: 'done',
    note: 'describe.ts MAZEBIT' },
  { routine: 'DESCRIBE-ROOM', line: 1664, arms: [2], status: 'deferred',
    note: "Zork II always describes the Zork III stair even in SUPER-BRIEF — phase 6" },
  { routine: 'DESCRIBE-OBJECT', line: 1716, arms: [2], status: 'done',
    note: 'describe.ts + spells.describeSuffix' },
  { routine: 'PRINT-CONT', line: 1762, arms: [2], status: 'deferred',
    note: 'the Fantasize spell hallucinates objects into room listings — phase 6' },
  { routine: 'FIRSTER', line: 1819, arms: [1], status: 'done',
    note: 'describe.ts containerListing — the trophy-case header' },
  { routine: 'SCORE-UPD', line: 1854, arms: [1], status: 'done',
    note: 'verbs.ts checkEndgame — the map appears at a full score, not a full case' },
  { routine: 'ITAKE', line: 1902, arms: [1, 2], status: 'done',
    note: 'verbs.ts doTake — dead hands, spell blocks, and no SCORE-OBJ in Zork III' },
  { routine: 'ITAKE', line: 1915, arms: [2], status: 'done',
    note: 'spells.takeBlockedBy' },
  { routine: 'ITAKE', line: 1951, arms: [2], status: 'deferred',
    note: 'the Filch spell steals into the wizard case (RIPOFF) — phase 6' },
  { routine: 'GOTO', line: 2075, arms: [1, 2, 3], status: 'done',
    note: 'verbs.ts vehicleStopMessage' },
  { routine: 'GOTO', line: 2101, arms: [3], status: 'deferred',
    note: "Zork III's grue lair death — phase 6" },
  { routine: 'GOTO', line: 2127, arms: [1], status: 'deferred',
    note: 'Zork I suppresses a double description at the Entrance to Hades' },
  { routine: 'MUNG-ROOM', line: 2184, arms: [2], status: 'deferred',
    note: 'Zork II never mungs Inside the Barrow — phase 6' },
  { routine: 'THIS-IS-IT', line: 2194, arms: [3], status: 'done',
    note: "verbs.ts case 'swim' — SWIMYUKS exists only for games 1 and 2" },
];

export const doneCount = (): number => BRANCH_SITES.filter((b) => b.status === 'done').length;
export const deferredCount = (): number => BRANCH_SITES.filter((b) => b.status === 'deferred').length;
