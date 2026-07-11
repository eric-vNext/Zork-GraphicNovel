# Zork I: Graphic Novel Edition — Research Report

**Phase 1 deliverable.** Source studied: [historicalsource/zork1](https://github.com/historicalsource/zork1), cloned locally to `reference/zork1-source/` (includes the compiled `COMPILED/zork1.z3`, which we use as a behavioral test oracle).

---

## 1. Source Repository Architecture

The repository is the Infocom development snapshot of Zork I, written in **ZIL** (Zork Implementation Language, a LISP/MDL dialect). It splits into two layers — a reusable "substrate" shared across the Zork trilogy (files prefixed `g`) and the game-specific content (files prefixed `1`):

| File | Lines | Role |
|---|---|---|
| `zork1.zil` | 33 | Master file; `INSERT-FILE`s everything below in order |
| `gmacros.zil` | 154 | Compile-time macros (`TELL`, `ENABLE`, `PROB`, verb dispatch) |
| `gsyntax.zil` | 561 | Grammar: every accepted sentence form (`SYNTAX TAKE OBJECT = V-TAKE`, prepositions, `FIND`/`HAVE` constraints used for implicit-object resolution) |
| `1dungeon.zil` | 2,660 | **The world.** All 110 `ROOM` and ~220 `OBJECT` definitions: descriptions, exits, synonyms/adjectives, flags, capacities, values, action-routine pointers |
| `gglobals.zil` | 308 | Global objects (hands, lungs, "it"), global variables |
| `1actions.zil` | 4,177 | **The behavior.** Per-object and per-room action routines, all daemons/timers, combat tables, thief AI, death handler (`JIGS-UP`), endgame |
| `gclock.zil` | 60 | The event scheduler: `C-TABLE` of interrupt entries, `QUEUE`/`ENABLE`, `CLOCKER` runs each turn |
| `gmain.zil` | 313 | Main loop (`MAIN-LOOP`): read → parse → perform → clock tick; `GOTO`, room description logic (`M-ENTER`/`M-LOOK`), lit/dark handling |
| `gparser.zil` | 1,407 | The parser: tokenization, syntax matching, `GET-OBJECT` noun resolution, disambiguation ("Which nail do you mean…?"), orphaning (answering a clarifying question), pronoun `IT`, `AGAIN`, `OOPS` |
| `gverbs.zil` | 2,216 | Default verb handlers (`V-TAKE`, `V-OPEN`, `V-ATTACK`…), `GOTO`/movement via exit tables, scoring, save/restore/verbose/score/diagnose |

### How the engine actually works (the systems we must mirror)

1. **World model.** Rooms and objects live in one object tree (objects are *in* rooms, containers, or the player). Everything is driven by **flags** (`ONBIT` lit, `OPENBIT`, `TAKEBIT`, `DOORBIT`, `SACREDBIT` thief-won't-enter, `TOUCHBIT` visited, `INVISIBLE`, …) and **properties** (`LDESC`, `FDESC` first-time description, `VALUE`/`TVALUE` scoring, `CAPACITY`, `SIZE`, `STRENGTH`).

2. **Exits** are per-direction properties with five forms we must all support: unconditional (`NORTH TO KITCHEN`), conditional on a flag (`WEST TO CYCLOPS-ROOM IF MAGIC-FLAG`), door-mediated (`IN TO KITCHEN IF KITCHEN-WINDOW IS OPEN`), failure-message (`NORTH "The forest becomes impenetrable to the north."`), and routine-computed (`EAST PER UP-CHIMNEY-FUNCTION`).

3. **Action dispatch order** — the heart of ZIL's extensibility. For each parsed command the engine offers the action to, in order: the winner's location (`M-BEG`), the verb's pre-action, the indirect object's action routine, the direct object's action routine, then the default verb handler. First taker wins. Room action routines also receive `M-ENTER`, `M-LOOK`, `M-END` phases (e.g., `LIVING-ROOM-F` re-renders the trophy-case description; forest rooms enable the songbird daemon on `M-ENTER`).

4. **Daemons & timers (`gclock.zil`).** A 30-slot interrupt table ticked once per player turn. Zork I's active set (verified in source): `I-LANTERN` (lamp fuel stages: 100/70/15/(dim)/burnout via `LAMP-TABLE`), `I-CANDLES`, `I-MATCH` (2 turns), `I-THIEF` (the thief's full wander/steal/deposit AI), `I-FIGHT` (villain combat each turn), `I-SWORD` (glow when villains near), `I-CURE` (wound recovery), `I-CYCLOPS` (rage countdown), `I-RFILL`/`I-REMPTY` (reservoir drain/fill after dam turns, 8 ticks), `I-MAINT-ROOM` (rising water after pressing the wrong button, drowning at stage 13), `I-RIVER` (boat drifting downstream at per-room speeds), `I-FOREST-ROOM` (songbird chirps), `I-XB`/`I-XBH`/`I-XC` (exorcism sequence timing in Hades). These *are* Zork's liveliness; all must be ported.

5. **Combat** (`1actions.zil` tables + `I-FIGHT`): melee tables per villain (`TROLL-MELEE`, `THIEF-MELEE`, `CYCLOPS-MELEE`) with randomized outcome tiers (miss / stagger / wound / knockout / kill), player `STRENGTH` modified by wounds and score-based rank, weapon bonuses (`BEST-WEAPONS`), villain-specific reactions. Death routes through `JIGS-UP` (30 call sites): score penalty, item scattering (lamp at death site, items strewn Above Ground), resurrection in the Forest (up to twice), then permanent death offering RESTART/RESTORE/QUIT.

6. **Scoring.** `SCORE-MAX 350` = treasure `VALUE` on take + `TVALUE` on trophy-case deposit (19 treasures), plus room-entry values (Kitchen 10, Cellar 25, East-West Passage 5, …). Rank names from `V-SCORE`. Depositing all 19 treasures triggers the map appearing → Stone Barrow → endgame ("West of House" secret path).

7. **Parser niceties users will notice if missing:** multi-noun commands (`TAKE ALL`, `TAKE LAMP AND SWORD`, `PUT ALL BUT SWORD IN CASE`), adjective disambiguation with clarifying questions, orphaned-command completion, `IT`/`AGAIN`/`OOPS`, `WAIT`/`G`, abbreviations (`N`, `X`, `Z`, `I`), vehicle scoping (in the boat), darkness scoping (can't see → can't reference).

---

## 2. Recommendation: Native TypeScript Port vs. Z-Machine Interpreter + Hooks

### Option B (rejected): run `zork1.z3` in a browser Z-machine (Parchment / ifvms.js ZVM)

[ifvms.js](https://github.com/curiousdannii/ifvms.js) runs the compiled z3 perfectly in browser JS, guaranteeing 100% logic fidelity for free. Hooks would come from two techniques: scraping the text stream (fragile — many events share phrasing), and **state-diffing Z-machine memory** each turn (read the `HERE` global and object-tree moves; projects like [visiterp](https://github.com/erkyrath/visiterp) prove memory instrumentation of this exact game file is practical). Save/restore is standard Quetzal.

**Why rejected for this project:** hook granularity is the whole product. Room-entry triggers are easy (diff `HERE`), but our art/audio layer needs *semantic events* — "lamp is now dimming," "thief just stole the egg," "troll died," "you are being carried by the bat," "match burned out" — which in memory-diff terms means reverse-engineering dozens of global-variable addresses and flag words of a compiled binary, then maintaining that mapping. Disambiguation-aware mobile chips, JSON saves, an inventory quick-view, a health indicator, and future modding all fight the black box. We'd spend the project's effort instrumenting a VM instead of building the experience.

### Option A (chosen): **native TypeScript reimplementation, ported file-by-file from the ZIL source**

- **Hook granularity:** every room transition, flag change, daemon firing, and death is *our* code — art/audio triggers become one-line event emissions (`bus.emit('treasure-deposited', obj)`).
- **Moddability & UI:** parser can expose structured results (disambiguation candidates → tappable chips on mobile), world state is a plain object → trivial JSON save/restore + export/import, score/health/inventory render reactively.
- **Build simplicity:** one Vite bundle, fully static, no VM/wasm layer.
- **The real cost — fidelity risk** in hand-porting ~12k lines of ZIL. Mitigations:
  1. The ZIL is unusually portable: `1dungeon.zil` is *data* (mechanical to transcribe into typed TS objects), `gverbs.zil`/`1actions.zil` are small pure-ish routines against that data. We port the **dispatch order, flag semantics, and clock model exactly** rather than "re-designing" anything.
  2. **Test oracle:** the repo ships `COMPILED/zork1.z3`. We run canonical walkthrough + death + edge-case transcripts through Frotz/dfrotz and assert our engine produces matching text, score, and state at each step.
  3. Parser scope is "Zork grammar," not "general ZIL": we implement exactly the `gsyntax.zil` grammar table plus the parser behaviors listed in §1.7 — a well-bounded target.

**Decision: Option A — native TypeScript port, with `zork1.z3` under dfrotz as a transcript-equivalence test oracle.** This is also what the build phase's requirements (event-triggered panels, region music, mobile chips, JSON saves) implicitly assume.

---

## 3. Systems That Must Be Ported Faithfully (checklist)

- [ ] Room graph: all 110 rooms, all five exit forms, dark-room logic + grue death sequence (warning turn → death)
- [ ] Object model: flags, properties, containment tree, `FDESC`/first-take, capacities/sizes/weights (load limit)
- [ ] Grammar table from `gsyntax.zil` + parser behaviors: disambiguation, orphaning, `ALL`/`AND`/`BUT`, `IT`, `AGAIN`, `OOPS`, abbreviations
- [ ] Action dispatch order (room M-BEG → pre-action → indirect obj → direct obj → verb default)
- [ ] Clock/daemon system with the 17 daemons enumerated in §1.4, exact tick counts (lamp table 100/70/15, match 2, reservoir 8, maintenance-room flood 13, exorcism timing)
- [ ] Combat tables + `JIGS-UP` death/resurrection/item-scattering rules
- [ ] Thief AI in full (wandering, valuables stealing, egg-opening, treasure-room deposit, knife fight, "engrossed" distraction window)
- [ ] Scoring: VALUE/TVALUE per treasure, room values, rank names, 350 max, endgame unlock at all-treasures-deposited
- [ ] Verbs incl. system verbs: SAVE, RESTORE, RESTART, SCORE, DIAGNOSE, VERBOSE/BRIEF/SUPERBRIEF, QUIT, plus XYZZY/PLUGH responses, PRAY, ODYSSEUS/ULYSSES, ECHO, magic-boat, dam buttons/bolt, coal-machine, mirror, bell-book-candle exorcism, rainbow/sceptre, etc.
- [ ] All original text verbatim (room LDESCs, object descriptions, parser messages, death texts)

---

## 4. Recommended Technical Approach

### Stack

| Layer | Choice | Why |
|---|---|---|
| Build | **Vite + TypeScript + React 18** | Static deploy anywhere; fast dev loop; JSX for UI chrome |
| Panel transitions | **Framer Motion** | Declarative `AnimatePresence` cross-fades + fly-in with spring easing; interruptible (rapid commands won't stack panels) |
| Audio | **Howler.js** | Reliable mobile unlock handling, per-track volume → clean crossfades of region beds; sprite support for SFX |
| State | **Zustand** | World state lives in the pure engine; Zustand mirrors *presentation* state (current panel, log, region, volumes) without React re-render storms |
| Engine | Hand-written TS modules (`game/src/engine`, `/parser`, `/data`) | Per §2; zero runtime deps so it's testable headless with Vitest |
| Tests | Vitest + dfrotz oracle transcripts | Transcript-equivalence per §2 |

**Architecture rule:** the engine is a pure, synchronous, UI-agnostic library: `execute(command: string) → { textEvents, worldEvents }`. The presentation layer (React) subscribes to `worldEvents` (room-entered, region-changed, treasure-taken, death, …) to drive panels and audio. This keeps design pillar 2 (art never blocks text) structurally guaranteed — text renders immediately; the panel animates in parallel.

### Mobile / keyboard UX (researched constraints → design)

The soft keyboard is the #1 threat to mobile parser IF. Mitigations we will implement:

1. **Never blur the input on submit** — keep focus after Enter so the keyboard doesn't bounce closed/open between commands.
2. Quick-command **chips and the compass fire on `pointerdown` + `preventDefault()`** so tapping them doesn't steal focus/dismiss the keyboard; a full chip set (look, inventory, take, open, N/S/E/W/U/D) allows *many turns with the keyboard fully closed*.
3. Viewport meta `interactive-widget=resizes-content` + **`visualViewport` API** listener: when the keyboard opens in portrait, the layout compresses — panel shrinks to a letterboxed strip, log keeps the last responses + input pinned above the keyboard.
4. Input attributes: `autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="send"`, `inputmode="text"`.
5. Disambiguation questions render their candidates **as tappable chips**, the single biggest friction-remover for touch parser play.
6. PWA-ready later: static build + manifest + service worker is a small increment on this stack.

### Rendering layout note

Portrait: panel on top (≈40% height, shrinking when keyboard opens), log + input below. Landscape/desktop: panel left (~55–60%), log + input right column. Detailed in `presentation-concept.md`.

---

## 5. Recommended Asset List for Nano Banana Pro (v1 scope summary)

Full per-asset prompts in `docs/asset-plan.md`. Scope strategy: **bespoke panels for every distinct-identity room; shared panels for corridor/maze/forest families** (110 rooms → ~58 room images), plus events, characters, items, UI.

| Category | Count | Notes |
|---|---|---|
| Room panels | ~58 | incl. state variants: trophy case empty/full, living-room rug moved/trap door, dam high/low water, drafty room, mirror rooms shared |
| Event panels | ~22 | lamp lit, grue warning + grue death, troll fight, thief encounters, egg opened, dam button, flood, exorcism, bat, rainbow solid, map appears, resurrection, generic death, victory… |
| Character panels | 4 | troll, thief, cyclops, vampire bat (grue is deliberately *never shown* — darkness panels only) |
| Item close-ups | 14 | lamp, sword, egg+canary, coffin, torch, trident, skull, chalice, coins, painting, garlic/lunch, book/bell/candles, map, sceptre |
| UI | 7 | title illustration, logotype, panel frame (transparent), input frame (transparent), death screen, victory screen, compass rose (transparent) |
| **Total images** | **~105** | 3:2 rooms/events/characters, 1:1 items, 16:9 title/screens |

## 6. Audio Approach (music + SFX)

**Recommendation: hybrid — generated ambient beds + hand-authored WebAudio-rendered SFX. No copyrighted material.**

- **Music (8 regional beds + title + death + victory stingers):** long-form loopable ambient beds (60–90 s seamless loops, OGG+M4A ≈96 kbps) produced with a generative music tool during Phase 5 if available in media-gen's registry; fallback is composing them ourselves offline with a scriptable synth (Tone.js offline render or SuperCollider-style Node script) — dark pads, sparse motifs. Beds must be *quiet and textural* (they sit under reading). One bed per region, crossfaded 2–3 s on region change via Howler volume ramps.
- **SFX (~20 one-shots):** hand-authored via a small offline WebAudio/Node synthesis script (noise bursts, filtered impacts, chimes) rendered to files — this guarantees originality, tiny file sizes, and a coherent palette: door creak, window, mailbox, take/drop, treasure chime, case deposit fanfare, sword clash ×2, lamp on/off, match, magic shimmer, water, dam machinery, bat screech, thief snicker, grue growl (low sub rumble), death hit, XYZZY "hollow voice", victory flourish.
- Rationale: fully original (hard requirement), lightweight (<4 MB audio total), and stylistically unified. Licensed libraries rejected (provenance risk); pure runtime-synthesized SFX rejected (inconsistent across devices, harder to art-direct).

---

## 7. Key References

- Source: [historicalsource/zork1](https://github.com/historicalsource/zork1) (local: `reference/zork1-source/`)
- [ifvms.js](https://github.com/curiousdannii/ifvms.js) / [Parchment](https://www.ifwiki.org/Parchment) — evaluated interpreter path
- [GlkOte docs](https://eblong.com/zarf/glk/glkote/docs.html) — IF display-layer conventions (scrollback, input line, status)
- [visiterp](https://github.com/erkyrath/visiterp) — proof that memory-instrumented hooks are possible (informed the tradeoff analysis)
- ZILF/ZIL documentation for language semantics; dfrotz as the transcript oracle runner
