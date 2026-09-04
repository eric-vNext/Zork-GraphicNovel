# Expanding to the Trilogy: Zork II & Zork III

**Status: brief / not started.** Scoping document for extending this port from Zork I to all
three games. Every claim below was measured against the actual ZIL sources
([historicalsource/zork1](https://github.com/historicalsource/zork1),
[zork2](https://github.com/historicalsource/zork2), [zork3](https://github.com/historicalsource/zork3))
and against this repo's current code, not estimated from memory.

---

## 1. Bottom line

**The hard part is not the engine — it's the art.** The three games share one
library, and this port already implements it. What Zork II and Zork III each add
is roughly the same volume of game-specific logic as Zork I (~6,400–6,800 lines
of ZIL each), plus five genuinely new subsystems that have no Zork I analogue,
plus ~300 new illustrated panels — nearly twice the entire existing art set.

Rough shape of the work, using the Zork I build (53 commits, four days,
2026‑07‑10→13) as the unit:

| Lane | Zork II | Zork III |
|---|---|---|
| Shared-library branches | ~40 routines to un-hardcode (shared with III) | (same work, done once) |
| World data extraction | mechanical, once the extractor is rebuilt | mechanical |
| Game logic (specials/daemons) | ~189 routines, 12-spell Wizard cross-cut | ~219 routines, 2 bespoke spatial engines |
| New UI components | none | 2 (puzzle grid, mirror box) |
| Art | ~160–175 panels | ~130–145 panels |
| Audio | ~8 beds, ~35 SFX | ~7 beds, ~30 SFX |

Zork II is the larger content job; **Zork III is the harder engineering job.**

---

## 2. The key finding: the three games are one codebase

`zork1.zil`, `zork2.zil`, and `zork3.zil` each `INSERT-FILE` the same seven
shared modules — `gmacros`, `gsyntax`, `gglobals`, `gclock`, `gmain`, `gparser`,
`gverbs` — and then exactly two game-specific files (`Ndungeon.zil`,
`Nactions.zil`).

Those seven shared files are **byte-identical between Zork II and Zork III**, and
differ from Zork I's copies only in commented-out (`;<...>`) dead code — 140 diff
lines, zero of them live. Functionally, all three games ship the *same* parser,
clock, main loop, and verb library.

Variation is handled at compile time by `,ZORK-NUMBER`:

```
gverbs.zil : 63 branch sites (~40 distinct routines)
gglobals.zil:  6
gsyntax.zil :  5
gparser.zil :  1
gmain.zil   :  1
```

**Why this matters:** the current `parser/parse.ts`, `engine/verbs.ts`,
`engine/daemons.ts`, and `engine/describe.ts` are, in effect, the
`ZORK-NUMBER == 1` arm of that library, with the branches collapsed away. The
Zork II and Zork III arms are already written, in the source this repo vendors.
Filling them in is bounded, mechanical work with an exact checklist — not
open-ended design.

The ~40 shared verb routines needing per-game arms:
`ITAKE`, `GOTO`, `DESCRIBE-ROOM`, `V-VERSION`, `V-SWIM`, `V-WALK`, `V-TREASURE`,
`V-SAY`, `V-PUMP`, `V-POUR-ON`, `V-ENCHANT`, `V-DISENCHANT`, `V-INCANT`,
`SHAKE-LOOP`, `PRE-TURN`, `PRE-TAKE`, `PRE-PUT`, `PRE-MUNG`, `PRE-BOARD`,
`V-WISH`, `V-THROUGH`, `V-SHAKE`, `V-PRAY`, `V-OVERBOARD`, `V-ODYSSEUS`,
`V-LOOK-INSIDE`, `V-LEAP`, `V-ECHO`, `V-DIG`, `V-CLIMB-UP`, `V-CLIMB-ON`,
`V-CLIMB-FOO`, `V-BURN`, `V-ATTACK`, `V-ALARM`, `THIS-IS-IT`, `SCORE-UPD`,
`PRINT-CONT`, `MUNG-ROOM`, `FIRSTER`.

Vocabulary also branches: `gsyntax.zil` adds the twelve Wizard spell words as
`BUZZ` words for Zork II only, `FROTZ`/`OZMOO` for II and III, and gives Zork II
alone the weaponless `ATTACK OBJECT` / `KILL OBJECT` syntaxes.

---

## 3. Measured inventory

| | Zork I | Zork II | Zork III |
|---|---|---|---|
| Rooms | 110 | 86 | 89 |
| Objects | 120 | 147 | 121 |
| Action routines | 190 | 189 | 219 |
| Game-specific ZIL LOC | 6,837 | 6,772 | 6,358 |
| Named daemons/interrupts | 16 | 23 | 24 |
| Objects with `VALUE` (treasures) | 23 | 22 | 1 |
| `ACTORBIT` characters | 7 | 14 | 9 |
| Distinct `JIGS-UP` deaths | 22 | 44 | 19 |
| Max score | 350 | 400 | 7 ("potential") |

Notes on the shape of each:

- **Zork II** has the most *characters* and *deaths* — it is a set-piece game.
  Its rooms are fewer but far less repetitive than Zork I's (no 19-room maze to
  cover with four reused panels), so its true panel count is close to Zork I's.
- **Zork III**'s `3actions.zil` (5,398 lines) absorbed the older standalone
  `shadow.zil` and `tm.zil`. Its 89 rooms split 35 in `3dungeon.zil` (mirror box,
  Royal Puzzle, endgame cells) and 54 in `3actions.zil` (the overworld). The
  repo also carries pre-"renovation" duplicates — `actions.zil`, `dungeon.zil`,
  `shadow.zil`, `tm.zil`, `parser.zil`, `verbs.zil`, `syntax.zil`, `macros.zil`,
  `main.zil`, `clock.zil`, `demons.zil` — which are **not** in the build. Port
  only what `zork3.zil` inserts.
- **Zork III scores nothing.** No trophy case, one valued object. `SCORE-MAX` is
  7 and `V-SCORE` reports "potential," awarded for completing seven tasks. The
  entire trophy-case presentation layer — `CaseView.tsx`, the `case-view` event,
  `scoredCase`, the four-tier Living Room panel ladder — is Zork-I-only and needs
  a per-game equivalent, not a reskin.

---

## 4. What carries over from the current port

**Unchanged (~60% of the engine):**
`world.ts` (object tree, flags, containment, lighting), `ctx.ts`, `types.ts`
(with additions), `death.ts` (`JIGS-UP` shape), `melee.ts` (the melee tables are
per-villain data, the resolution logic is shared), `idbSaves.ts`,
`audioManager.ts`, `parse.ts` (grammar and disambiguation core; vocabulary
becomes per-game), the React shell, motion system, and CI harness.

**Needs per-game branching (mechanical, checklist-driven):**
`verbs.ts` at the ~40 sites above; `daemons.ts` (the clock is identical, the
daemon *table* is per-game); `describe.ts` (`DESCRIBE-ROOM` has three arms).

**Fully per-game (new files):**
`specials.ts` equivalents — Zork I's is 1,038 lines for 186 routines, so budget
~1,000–1,200 lines each for II and III; `specialDescs.ts`; `combatText.ts`
tables; `presentation.ts` maps.

**Must be rebuilt before anything else:** the ZIL→JSON world extractor. The
final build report credits `extract_world.py`, but it lived in a session
scratchpad and is **not in the repo** — `find` turns up nothing, and it appears
in no commit. It has to be rewritten regardless, and this time committed to
`utils/` and run against all three `Ndungeon.zil` files. Doing this first is
what makes the rest of the world data mechanical rather than hand-typed.

---

## 5. New engine subsystems with no Zork I analogue

These are the parts that are not "more of the same," listed hardest first.

### 5.1 The Royal Puzzle — Zork III (`3actions.zil` 170–600, ~430 lines)

A 4×8 grid of sandstone and marble blocks the player pushes around, inside which
they walk. `CPWHERE` redraws a **fixed-font 3×3 ASCII neighbourhood map every
turn** (`FIXED-FONT-ON`, `MM`/`SS`/`??` glyphs) and the player can trap
themselves permanently. There is no way to render this as an illustrated panel.

*Requires:* a new React component — a live isometric or top-down grid inset
showing the pushable blocks, the ladder walls, the slot and the steel door. This
is the single largest piece of *new* UI in the whole expansion, and the one place
where the graphic-novel presentation must invent rather than illustrate.

### 5.2 The Mirror Box — Zork III (`3actions.zil` 600–1500, ~900 lines)

A room-sized rotatable, rideable mirror contraption occupying its own 20-room
sub-graph (`MRD/MRG/MRC/MRB/MRA` × `E/W`, `IN-MIRROR`, `MREYE`, …). The player
rides it north/south along a corridor, rotates it with a short pole, and sights a
beam through channels (`BEAM-FUNCTION`, `LOOK-TO`, `MIRROR-DIR?`, `MIRMOVE`,
`MPANELS`). Room identity, facing, and beam state are three independent axes.

*Requires:* a small state machine plus, realistically, a schematic inset showing
the box's orientation — the prose alone defeats most players, and panel art
cannot convey rotation.

### 5.3 The Wizard of Frobozz — Zork II (`2actions.zil` ~3455–3708, ~250 lines)

`I-WIZARD` fires every 4 turns and may cast one of **12 spells** (Feeble, Float,
Fumble, Fear, Filch, Fierce, Freeze, Fireproof, Fluoresce, Ferment, Fantasize,
Fudge). Several rewrite core verb behaviour for a duration:

- `S-FEEBLE` → overrides `LOAD-ALLOWED` (carry capacity)
- `S-FLOAT` → suspends gravity; expiry over a non-land room is fatal
- `S-FUMBLE` → injects random drops into `ITAKE`
- `S-FIERCE` → overrides `SWORD-GLOW`
- `S-FREEZE` → blocks movement

This is a **cross-cutting concern**, not a room puzzle: it is why `SPELL-USED`
appears 26 times in the shared `gverbs.zil`. It has to be designed into
`verbs.ts` as an effect layer, with a matching status-UI treatment, before the
Zork II specials are written. Do not bolt it on afterwards.

### 5.4 The Bank of Zork — Zork II (`2actions.zil` 1310–2172, ~860 lines)

The curtain-of-light teleport vault. Entering a wall relocates you based on which
wall you last entered from (`SCOL-*`, `I-CURTAIN`, `BKLEAVEE`/`BKLEAVEW`,
`DEPOSITORY`). Ships with its own object set (`BANK OBJECTS` in `2dungeon.zil`)
and is the most notoriously stateful puzzle in the trilogy. Needs its own test
suite; a walkthrough alone will not cover the failure modes.

### 5.5 Vehicles, followers, and time travel

- **Balloon (Zork II, `BALLOON-FCN`/`I-BALLOON`/`RISE-AND-SHINE`/`DECLINE-AND-FALL`,
  ~230 lines):** a burner-fuelled vertical vehicle across the volcano shaft.
  Zork I's boat is the closest analogue and is much simpler — the balloon has
  altitude, fuel, a receptacle, wire and cloth-bag failure states.
- **Oddly-Angled Room / diamond maze (Zork II, `DIAMOND-MOTION`, 2172–2294):**
  baseball-diamond movement remapping.
- **Dungeon Master (Zork III, `DUNGEON-MASTER-F`/`MASTER-F`/`DMISH`):** a
  following NPC who obeys typed orders (`DM, GO NORTH`). The shared parser
  already supports actor commands via `ACTORBIT`; the current `parse.ts` needs
  that path exercised for the first time.
- **Scenic Vista (Zork III, `I-VIEW-CHANGE`/`I-VIEW-SNAP`):** a window onto four
  other times/places. Presentationally lovely — four panels per vista.
- **Shadow / hooded figure (Zork III):** a combat encounter you must *lose*
  correctly, plus `I-SHADOW-REPLY`.

---

## 6. Presentation and asset work

This is the long pole. Current Zork I inventory: **161 delivered panels**
(90 rooms, 36 events, 25 items, 6 UI, 4 characters), 31 MB of WebP; 10 music
beds and 48 SFX, 7.8 MB. Masters run ~1 GB and are uncommitted.

Projected, using the Zork I ratios against the measured room/actor/death counts:

| | Zork II | Zork III |
|---|---|---|
| Room panels (incl. state variants) | ~75 | ~65 |
| Event panels | ~50 (44 deaths + spells) | ~40 (deaths, time travel, shadow) |
| Item panels | ~30 | ~20 |
| Character panels | ~14 | ~9 |
| **Total images** | **~170** | **~135** |
| Music beds | ~8 | ~7 |
| SFX | ~35 | ~30 |

**~305 new panels, versus 161 for the whole of Zork I.** At the existing
`docs/asset-plan.md` cadence (nano-banana-pro via media-gen, anchors first to
lock direction) this is the dominant cost in both time and money.

New regions needing their own music beds and art direction — Zork II: volcano,
Bank of Zork, Wonderland/Alice, garden & unicorn, dragon & glacier, Wizard's
workshop, carousel & riddle room, aquarium & menhir. Zork III: shadow lands and
the Great Door, the lake and Scenic Vista, the cliff, the museum, the Royal
Puzzle, the mirror box, the endgame cells.

**Style continuity is a real risk.** The locked "Storm-Lantern Ink" style block
in `docs/asset-plan.md` §0 must carry across all three games or the trilogy reads
as three projects. Zork II's tone (whimsical, wizardly, brighter) and Zork III's
(austere, grey, elegiac) pull against a palette tuned for Zork I's New England
gloom. Plan for **per-game palette shifts within one style block**, decided at
anchor time, not per-panel drift.

**Delivery size.** ~90 MB of art total. The current service worker precaches
everything for offline play (see `offline-play-and-save-slots-2026-07-12`); at
trilogy scale that must become per-game cache buckets with the other two games
fetched on demand.

---

## 7. Architecture changes required

The current build assumes one game. Concretely:

1. **`GameNumber` in the world state**, threaded to every branching site. Not a
   build flag — save files must record it, and a trilogy shell may hold three
   live saves.
2. **Per-game data modules**: `data/zork1/world.gen.json`, `presentation.ts`,
   `specials.ts`, `specialDescs.ts`, `combatText.ts`; same under `zork2/`,
   `zork3/`. The `Game` class takes a game descriptor rather than importing
   Zork I directly.
3. **Zork-I-specific state must be generalized.** `WorldState` currently carries
   `thiefRoom` / `thiefEngrossed` / `scoredCase` at top level; the `Region` union
   in `presentation.ts` is eight Zork I region names; `RANKS` in `engine.ts` is
   the 350-point ladder. All three become per-game data.
4. **Scoring becomes a strategy**: treasure+case (I), treasure+case with a
   different ladder and `CASE-WORTH` (II), seven-task potential (III).
5. **Save format versioning** — existing saves must survive the refactor, or
   migrate. There are shipped save slots in IndexedDB.
6. **Save-slot namespacing** per game.
7. **Routing / a trilogy shell**: title screen selecting a game, cross-game
   narrative hand-off. Note the source already chains: Zork II's `ZORK3-FCN`
   ends the game by explicitly announcing *"The ultimate adventure concludes in
   Zork III: The Dungeon Master."* Carrying the player's ending straight into the
   next title is a presentation opportunity the original text asks for.
8. **Per-game lazy asset loading** and service-worker cache buckets.

Recommended order: do (1)–(3) as a refactor of the *shipped* Zork I build,
proving the abstraction against a passing 350/350 test run, **before** writing a
line of Zork II. A regression in Zork I is the main risk of this whole project.

---

## 8. Testing

Zork I is verified by `tests/fullrun.test.ts`, a BFS-navigated 350/350
playthrough. The equivalents:

- **Zork II:** a 400/400 run. Harder than Zork I's because the Wizard's random
  spells can block progress — the run needs seeded RNG plus retry tolerance, or
  a spell-suppression test hook.
- **Zork III:** a 7/7 run. Fewer points but a strictly ordered sequence with
  timed windows (the earthquake, the Royal Puzzle's one-way traps, the endgame
  ritual), so it is less forgiving to automate.
- The Royal Puzzle and Bank of Zork each want dedicated unit tests independent of
  the full run.

**Free oracle:** both `historicalsource` repos ship a compiled
`COMPILED/zork2.z3` and `COMPILED/zork3.z3` (92 KB / 88 KB). A Z-machine
interpreter can be driven over the same command scripts and diffed against this
port's output — a text-fidelity harness the Zork I build never had. Worth
building once and retrofitting to Zork I; it would have caught the ~30 verbatim
text drifts found in the 2026‑07‑12 audit automatically.

---

## 9. Phasing and estimate

| Phase | Work | Rough size |
|---|---|---|
| 0 | Rebuild + commit the ZIL→JSON extractor; run on all three dungeons | small |
| 1 | Multi-game refactor of the shipped Zork I build; Zork I tests stay green | medium |
| 2 | Fill the ~40 `ZORK-NUMBER` branches + per-game vocabulary/syntax | medium |
| 3 | Z-machine differential test harness against `COMPILED/*.z3` | small–medium |
| 4 | Zork II logic: specials, 23 daemons, Wizard effect layer, Bank, balloon | large |
| 5 | Zork II assets: ~170 panels, 8 beds, 35 SFX, region design | largest |
| 6 | Zork III logic: specials, 24 daemons, mirror box, Royal Puzzle, endgame | large |
| 7 | Zork III bespoke UI: puzzle grid + mirror-box schematic | medium |
| 8 | Zork III assets: ~135 panels, 7 beds, 30 SFX | large |
| 9 | Trilogy shell, cross-game hand-off, per-game caching, full-run tests | medium |

Anchoring on the Zork I build (four days, 53 commits, end to end including all
assets): **Zork II is comparable but somewhat larger; Zork III is comparable in
content but adds two bespoke UI subsystems.** Phases 0–3 are shared overhead
worth roughly a third of a game. A reasonable expectation is **2.5–3× the Zork I
effort** for the pair — with the caveat that asset generation, not coding,
determines the calendar.

**Ship Zork II first.** It is the closer sibling to what already works: same
scoring model, same treasure-and-trophy-case loop, same kind of set-piece
encounters. Zork III's zero-treasure structure, two bespoke UIs, and austere tone
make it the right thing to build once the multi-game abstraction has been proven
twice.

---

## 10. Licensing

Same footing as the current port. Both `historicalsource/zork2` and
`historicalsource/zork3` carry the same `LICENSE` as `zork1` — released for
historical and educational study. Zork remains a trademark of Activision. This
stays a personal, non-commercial project; all new artwork and audio original, as
now. The README's existing statement extends verbatim to the trilogy.
