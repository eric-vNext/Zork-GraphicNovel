You are Fable 5 working as an agentic game developer, researcher, creative director, and project builder.

We have already shipped a browser-based graphic-novel edition of **Zork I**, ported from the open-source historical source release at https://github.com/historicalsource/zork1. It lives in this repository: a native TypeScript reimplementation of the Zork I engine (parser, room graph, objects, daemons, scoring, deaths) wrapped in a motion-comic presentation — 161 original illustrated panels, 10 synthesized music beds, 48 SFX, save/restore, and a CI-verified 350/350 playthrough. Read `README.md` and `docs/final-build-report.md` before doing anything else.

We are now expanding that port into the **full trilogy**: adding **Zork II: The Wizard of Frobozz** (https://github.com/historicalsource/zork2) and **Zork III: The Dungeon Master** (https://github.com/historicalsource/zork3), both released under the same historical/educational licence as Zork I.

A scoping brief already exists at `docs/trilogy-expansion-brief.md`. It was measured against the actual ZIL sources, not estimated. **Read it first and treat its findings as established fact** — do not re-derive them. Its headline conclusions:

- All three games share **one library**. Each `zorkN.zil` inserts the same seven modules (`gmacros`, `gsyntax`, `gglobals`, `gclock`, `gmain`, `gparser`, `gverbs`) plus exactly two game-specific files. Those seven are byte-identical between II and III and differ from Zork I's copies only in commented-out dead code. Variation is resolved at compile time by `,ZORK-NUMBER` — 63 branch sites in `gverbs.zil` (~40 routines), 6 in `gglobals`, 5 in `gsyntax`, 1 each in `gparser`/`gmain`. Our current `verbs.ts` / `parse.ts` / `daemons.ts` / `describe.ts` are effectively the `ZORK-NUMBER == 1` arm with the branches collapsed away; the other arms are already written in the vendored source.
- Per-game volume is even: 6,837 / 6,772 / 6,358 lines of game-specific ZIL; 110 / 86 / 89 rooms; 190 / 189 / 219 action routines.
- **Zork III scores nothing** — one valued object, `SCORE-MAX 7`, no trophy case. The whole trophy-case presentation layer is Zork-I-shaped and needs a per-game equivalent, not a reskin.
- The ZIL→JSON world extractor credited in `final-build-report.md` (`extract_world.py`) is **not in the repo**. It has to be rewritten and committed this time.
- **The engine is not the hard part. The art is.** ~305 new panels versus 161 for all of Zork I.

This remains a personal, non-commercial project. The ZIL source is open and we are porting it, so reuse original room names, object names, and game text faithfully and verbatim. Do not use any Infocom/Activision trademarked logos, box art, or manual illustrations as source imagery; all artwork and audio stay original to this project.

==================================================
THE ONE REQUIREMENT THAT OUTRANKS EVERYTHING ELSE
==================================================

**Room state variants must be pixel-consistent with their base panel.**

On the Zork I build this was the single largest source of wasted work. The Living Room exists in eight illustrated states (rug down, rug aside, trap door open, trophy case empty / some / crowded / full, × trap door open/closed). They were first generated independently from fresh text prompts, and the elvish sword's angle above the mantel and the nailed-shut west door's carving drifted between them — visible to any player walking in and out of the same room. It took three separate regeneration passes to fix, and the fix was always the same thing: **derive every variant from the locked base image as a chained image-to-image edit.**

This time that discipline is mandatory from the first generation, not a repair pass. It is specified in full in Phase 4 and Phase 5 below. Do not treat it as a style note. If you are about to generate a second image of a room you have already illustrated, you are doing a chained edit, not a new generation.

The mechanism, concretely — this is a real trap in the tooling:

- `media-gen`'s default image model `nano-banana-pro` is **text-to-image only and silently ignores `--input-image`**. Passing references to it does nothing and produces exactly the independent-generation drift described above.
- Reference-driven generation requires `--model nano-banana-pro-edit` (`fal-ai/nano-banana-pro/edit`), which honors `image_urls`. `--input-image` is repeatable; more than ~3 references muddies the result, so pass the strongest one or two.
- The edit model has its own failure mode: it echoes any baked border in the reference as a white "page margin" band. On the Zork I run this hit 5 of the first 7 images. Every edit prompt needs an explicit full-bleed instruction, and the batch driver needs automated white-band detection with retries.

Zork II and Zork III have far more state variance than Zork I did. Non-exhaustive, from the sources:

- **Zork II** — `ICE-MELTED` (glacier intact → melted, passage revealed), `SAFE-FLAG` (the Tomb safe before/after the blast), `MUNGED-ROOM`, `CAROUSEL-ZOOM-FLAG`/`CAROUSEL-FLIP-FLAG` (carousel spinning vs. stopped), `MENHIR-POSITION`, `CERBERUS-LEASHED`/`GUARDIAN-FED`, `TOPIARY-MOVED`, `UNICORN-FRIGHTENED`, `PRINCESS-AWAKE`, `CRYPT-LIT?`, `DIM-DOOR-FLAG`, `WIZ-DOOR-FLAG`, `SECRET-DOOR`, `GNOME-DOOR-FLAG`, `PUNLOCK-FLAG`/`PLOOK-FLAG`, `BUCKET-TOP-FLAG`/`EVAPORATED`, `AQ-FLAG`, `CAGE-SOLVE-FLAG`, `BANK-SOLVE-FLAG`, the dragon's lair with and without the dragon, and the balloon at three altitudes (`BALLOON-UPS` / `BALLOON-FLOATS` / `BALLOON-DOWNS`) plus inflated / deflated / burning.
- **Zork III** — `CLEFT-FLAG` (the earthquake reshapes the map: several rooms have a hard before/after), `YEAR`/`TM-YEAR` (the same room in two eras — literally one place, two states), `ACTIVE-VIEW`/`VIEW-ROOMS` (the Scenic Vista onto four other times and places), `SHADOW-GONE`, `CHEST-TIED`/`CHEST-LIFTED`/`CHEST-OPENED`, `SHIP-GONE`/`BOAT-SEEN`, `SWORD-IN-STONE?`, `OLD-MAN-AWAKE`/`OLD-MAN-GONE`, `BRONZE-DOOR-LOCKED`, `COVER-MOVED`, `MACHINE-DAMAGED`, and the mirror box's orientation axes (`MDIR`, `MIRROR-OPEN-FLAG`, `WOOD-OPEN-FLAG`, `POLEUP-FLAG`) which produce many views of one contraption.

==================================================
PHASE 0 — FOUNDATION (do this before any planning)
==================================================

This phase is engineering only. No art, no research write-ups.

1. **Vendor the sources.** Clone `historicalsource/zork2` and `historicalsource/zork3` into `reference/zork2-source/` and `reference/zork3-source/`, matching how `reference/zork1-source/` is laid out. Commit them.

   Caution: the `zork3` repo also carries pre-"renovation" duplicates — `actions.zil`, `dungeon.zil`, `shadow.zil`, `tm.zil`, `parser.zil`, `verbs.zil`, `syntax.zil`, `macros.zil`, `main.zil`, `clock.zil`, `demons.zil` — which are **not** in the build. Port only what `zork3.zil` inserts; that content was folded into `3actions.zil`.

2. **Rebuild the ZIL→JSON world extractor.** Write it properly this time, commit it to `utils/extract-world.py`, and make it a repeatable build step rather than a one-off script. It must handle all five conditional-exit forms, `SYNONYM`/`ADJECTIVE`/`FLAGS`/`SIZE`/`CAPACITY`/`VALUE`/`TVALUE`, and preserve room and object text verbatim. Run it against all three `Ndungeon.zil` files. Verify it reproduces the existing `world.gen.json` for Zork I before trusting its Zork II/III output.

3. **Multi-game refactor of the shipped Zork I build.** This is the highest-risk step in the project, so do it while Zork I is the only game and its tests can prove the abstraction:
   - A `GameNumber` in the world state, threaded to every branching site. Not a build flag — save files must record it.
   - Per-game data modules under `src/data/zork1|zork2|zork3/`; the `Game` class takes a game descriptor instead of importing Zork I directly.
   - Generalize the Zork-I-specific state: `WorldState.thiefRoom` / `thiefEngrossed`, the eight-value `Region` union in `presentation.ts`, the 350-point `RANKS` ladder in `engine.ts`, and `scoredCase`. All become per-game data.
   - Scoring becomes a strategy: treasure-and-case (I), a different ladder plus `CASE-WORTH` (II), seven-task "potential" (III).
   - Save format versioning and per-game slot namespacing. There are shipped saves in IndexedDB; they must survive or migrate.
   - **`npm test` must stay green throughout, including the full 350/350 run.** A Zork I regression is the main risk of this whole project.

4. **Fill the `ZORK-NUMBER` branches.** Work the checklist in `docs/trilogy-expansion-brief.md` §2 — `ITAKE`, `GOTO`, `DESCRIBE-ROOM`, `V-SWIM`, `V-WALK`, `V-TREASURE`, `V-SAY`, `V-PUMP`, `V-POUR-ON`, `V-ENCHANT`, `V-DISENCHANT`, `V-INCANT`, `PRE-TURN`, `PRE-TAKE`, `PRE-PUT`, `PRE-BOARD`, `V-DIG`, `V-BURN`, `V-ATTACK`, `SCORE-UPD` and the rest. Also the per-game vocabulary: the twelve Wizard spell words for Zork II only, `FROTZ`/`OZMOO` for II and III, and Zork II's weaponless `ATTACK OBJECT` / `KILL OBJECT` grammars.

5. **Build the differential test harness.** Both new repos ship a compiled `COMPILED/zork2.z3` and `COMPILED/zork3.z3`. Drive a Z-machine interpreter over the same command scripts as our engine and diff the output. This gives us text-fidelity checking Zork I never had — retrofit it to Zork I too. It would have caught the ~30 verbatim drifts found in the July audit automatically.

Report when Phase 0 is done, then continue to Phase 1 without stopping.

==================================================
PHASE 1 — RESEARCH
==================================================

Most of the architectural research is already done and lives in `docs/trilogy-expansion-brief.md`. Do not repeat it. What this phase adds is the game-design and presentation research the brief deliberately left out.

1. Map the full Zork II and Zork III room graphs and region groupings from `2dungeon.zil` / `2actions.zil` and `3dungeon.zil` / `3actions.zil`.
2. Catalog objects, treasures, NPCs, and every death state — Zork II has 44 distinct `JIGS-UP` calls and 14 `ACTORBIT` characters, Zork III has 19 and 9.
3. Study the five subsystems with no Zork I analogue, in the depth needed to implement them. Per the brief, hardest first:
   - **Royal Puzzle** (III, `3actions.zil` 170–600). A 4×8 grid of pushable sandstone and marble blocks the player walks inside. `CPWHERE` redraws a fixed-font 3×3 neighbourhood map every turn. Unillustratable — needs a bespoke UI component.
   - **Mirror Box** (III, `3actions.zil` 600–1500). A rideable, rotatable contraption on its own twenty-room sub-graph, with room identity, facing, and beam state as three independent axes.
   - **Wizard of Frobozz** (II, `2actions.zil` ~3455–3708). Twelve spells, several of which rewrite core verb behaviour for a duration — a cross-cutting effect layer, not a room puzzle.
   - **Bank of Zork** (II, `2actions.zil` 1310–2172). Curtain-of-light teleport keyed to the wall you last entered from.
   - **Vehicles and followers**: the balloon (II), the Oddly-Angled Room's movement remapping (II), the Dungeon Master who follows and obeys typed orders (III), the Scenic Vista (III), the shadow fight you must lose correctly (III).
4. **Enumerate every room-state variant in both games** — the flag that gates it, the rooms it affects, and what visibly changes. This list is the input to the variant-family plan in Phase 4 and is the single most important research output of this phase. Be exhaustive; a variant discovered during the build is a variant generated out of chain.
5. Research how the trilogy should be presented as one product: title/game selection, cross-game narrative hand-off (Zork II's ending explicitly announces that the adventure concludes in Zork III), per-game save slots, and per-game asset loading given that total delivery weight lands near 90 MB and the service worker currently precaches everything.

Save to:

docs/trilogy-research.md

==================================================
PHASE 2 — PRESENTATION CONCEPT (DELTA ONLY)
==================================================

`docs/presentation-concept.md` already defines the presentation language and it is not being reinvented. Write only what changes.

Define:
1. **Per-game visual identity within one style.** The locked "Storm-Lantern Ink" direction (`docs/asset-plan.md` §0) must carry across all three or the trilogy reads as three projects. But Zork II's tone is whimsical, wizardly and brighter, and Zork III's is austere, grey and elegiac — both pull against a palette tuned for Zork I's New England gloom. Specify a **per-game palette shift within the single shared style block**, decided at anchor time and written down, not left to drift panel by panel.
2. **The trilogy shell**: title screen, game selection, and the hand-off moment between games.
3. **Zork II's spell-state UI.** Twelve Wizard spells, several persistent. The player must be able to tell at a glance that they are Feeble, Floating or Frozen. Design this as a status treatment, not a panel.
4. **Zork III's two bespoke components** — the Royal Puzzle grid and the mirror-box schematic. These are the only places in the trilogy where the graphic-novel treatment must invent rather than illustrate. They must still read as belonging to the same illustrated world, not as debug overlays.
5. **A scoring display that is not the trophy case.** Zork III reports "potential" out of 7 with no treasures at all.

Save to:

docs/trilogy-presentation-concept.md

==================================================
PHASE 3 — REGION & ROOM DESIGN PLAN
==================================================

Break both maps into their natural regions, matching the sources. Do not invent geography.

**Zork II** — Barrow entry & carousel hub · the Volcano (and balloon flight) · the Bank of Zork · Wonderland (Alice/cakes/chomper) · the Garden, unicorn and princess · the Dragon and Glacier · the Tomb of the Flatheads and Cerberus · the Aquarium and menhir · the Riddle Room and Oddly-Angled Room · the Wizard's Workshop, guardians and endgame.

**Zork III** — the Endless Stair and shadow lands · the Great Door · the Lake and Scenic Vista · the Cliff and chest · the Museum and time travel · the Royal Puzzle · the Mirror Box · the Dungeon Master's endgame and cells.

For each region define: name from source, theme/mood, region-specific lighting and palette shift within the shared style, key rooms and which get bespoke vs. shared panels, key puzzles (for asset planning), NPCs and hazards, music mood and instrumentation, required visual assets, and entry/exit transition notes.

Include a text node-map of connectivity per region, detailed enough to build against.

Save to:

docs/trilogy-region-design.md

==================================================
PHASE 4 — ASSET PLAN
==================================================

Save to:

docs/trilogy-asset-plan.md

Projected volume, from the brief — treat as the budget to plan against, not a target to hit exactly:

| | Zork II | Zork III |
|---|---|---|
| Room panels incl. variants | ~75 | ~65 |
| Event panels | ~50 | ~40 |
| Item panels | ~30 | ~20 |
| Character panels | ~14 | ~9 |
| **Total images** | **~170** | **~135** |
| Music beds / SFX | 8 / 35 | 7 / 30 |

Asset categories, conventions, naming, formats and sizes all follow `docs/asset-plan.md` — reuse that document's structure and its shared `[STYLE]` block verbatim, with the per-game palette shift from Phase 2 appended. For every asset define: name, purpose, refined prompt, format, size, transparency yes/no, and save path.

**The new, mandatory section of this plan: VARIANT FAMILIES.**

Before any generation, enumerate every room that has more than one illustrated state as a **variant family**. For each family, the plan must specify all of the following:

1. **Family name and base panel** — the single canonical state everything derives from. Choose the state the player sees first and most often.
2. **The invariant manifest.** A written list of what must be identical across every member: camera position and framing, focal length / perspective, time of day, primary light source and its direction, and every fixed prop with its position and angle. Write it concretely — "elvish sword mounted above the mantel, hilt to the left, blade angled up 15°" — because this list is what the review step in Phase 5 checks against. Anything not on this list is free to change; anything on it drifting is a rejection.
3. **The state axes.** Name each independent thing that can change (Living Room: rug/trapdoor is one axis, trophy case fill is another). For each axis, list its values in the order the player encounters them.
4. **The derivation chain.** An explicit ordered graph from base panel to every variant, where each edge is one image-to-image edit changing one axis by one step. Chain along an axis; do not fan out from the base for states two steps away. Where axes are orthogonal, fix the chaining order (Living Room: trapdoor state first, then case fill) and state it.
5. **Combinatorial states.** Where a variant needs two axes at non-default values, note it as a **two-reference edit**: pass both parent panels via repeated `--input-image` and describe the combination. This is how `living-room-case-full-open` was built and it works; it is the sanctioned exception to single-parent chaining.
6. **The edit prompt for each edge**, phrased as a change instruction against the reference, not a fresh scene description. "The same room from the identical camera in the reference image. The woven rug has been dragged aside to the east wall, revealing a closed wooden trap door set flush in the floorboards. Everything else — the mantel, the sword, the nailed west door, the trophy case, the lighting — is unchanged. Full-bleed, no border, no white margin."

Do not write scene descriptions for variants. A variant prompt that could stand alone as a text-to-image prompt is wrong by construction.

Also plan for:
- **Zork II's balloon** as a family in its own right — the craft at three altitudes plus inflated/deflated/burning, all sharing one craft design.
- **Zork III's Scenic Vista** — one vista frame, four eras seen through it. A family whose invariant is the frame and whose axis is the era.
- **Zork III's time-travelled museum rooms** — the same room in two eras is the purest variant family in the trilogy.
- **The mirror box** — decide in this plan whether its many orientations are illustrated panels, the schematic component from Phase 2, or both. If both, the panel set is a family.

Audio plan follows the existing method: `game/scripts/synth-audio.py`, pure numpy DSP with a fixed seed, no copyrighted or third-party commercial music/SFX.

==================================================
APPROVAL STOP
==================================================

Stop. Do not generate assets.

Show me:
1. Phase 0 completion status — extractor, refactor, branch fills, differential harness, and confirmation that Zork I's tests still pass
2. Research summary
3. Presentation delta summary
4. Region plan summary
5. Asset list, **with the variant-family table broken out separately**

Then use this exact message:

"The trilogy research, region plan, and variant-family asset plan are ready. Please review and confirm if I should continue to generate assets for Zork II and Zork III."

Do not continue until I explicitly approve.

==================================================
PHASE 5 — GENERATE VISUAL ASSETS
==================================================

Generation order:

1. **Per-game anchors first.** Generate one establishing panel per region plus the game's title screen, using `nano-banana-pro` text-to-image. Stop and eyeball them against the Zork I set for style continuity and against the Phase 2 palette shift. Regenerate until locked. Do not proceed to volume until the anchors are approved.
2. **Base panels** for every room, using text-to-image, with the anchors passed as style references.
3. **Variant families**, using the chained-edit protocol below. This is the step that went wrong last time.
4. Event panels, character panels, item close-ups, UI assets.

**The chained-edit protocol — follow exactly:**

```bash
python ~/.claude/skills/media-gen/scripts/generate.py image \
  --prompt "<change instruction against the reference>" \
  --title "<family>-<state>" \
  --model nano-banana-pro-edit \
  --input-image "<path to the immediately preceding state>"
```

- `--model nano-banana-pro-edit` is **required**. The default `nano-banana-pro` silently ignores `--input-image` and will hand you an independently generated panel that looks plausible in isolation and wrong in sequence. That is precisely the Zork I failure.
- The reference is the **immediately preceding state in the chain**, not always the base. Chaining along the axis is what keeps step-to-step drift from accumulating into a visible jump.
- Two-reference edits for combinatorial states only, with `--input-image` repeated. Never more than two here.
- Every edit prompt ends with an explicit full-bleed instruction. The edit model echoes baked borders from the reference as white page-margin bands — it hit 5 of the first 7 anchor images on the Zork I run.
- Generate one family completely, review it, and only then start the next. Do not batch families in parallel; a bad base propagates.

**Per-family review, before moving on — this is a gate, not a formality:**

- Assemble the family's panels side by side at delivery size and check each variant against the base for every item on its invariant manifest. Reject on any drift, and regenerate that edge from its parent — never from a fresh prompt.
- Then step through the family in the order a *player* encounters the states and check that nothing pops. A player toggling one flag should see exactly one thing change.
- Run the automated defect scans the Zork I build learned to need: white page-margin band detection with up to 2 retries in the batch driver, interior white-patch scan, and flat dark-bar edge detection with programmatic trimming.

**Standing visual rules, carried forward from Zork I:**
- **Player-as-camera.** The adventurer appears only as gloved hands, a lamp-bearing forearm, or a cloaked back-of-shoulder at frame edge — never a face. This caught a `river-upper` regeneration last time.
- No text, lettering, or speech bubbles. Any diegetic lettering the model paints is stylized gibberish and must never carry information.
- Compose with quiet negative space along one edge for captions; art never competes with the parser text.
- Transparency assets are generated on flat white and cut via luminance keying with edge feathering, verified over a dark background.
- Save masters to `assets/{rooms,events,characters,items,ui}/` with per-game subfolders or a game prefix — decide in Phase 4 and be consistent. Convert to delivery WebP with the existing `game/scripts/convert-assets.py`.

Then write:

docs/trilogy-generated-asset-review.md

Include: generated assets and paths, **a variant-family section stating for each family its base, its chain, and confirmation that the invariant review passed**, assets needing regeneration, consistency issues, background-removal needs, missing assets, and audio status.

==================================================
APPROVAL STOP
==================================================

Stop. Do not build.

Show me:
1. Asset list and file paths
2. **Every variant family presented as a side-by-side set**, so I can see the states in player order
3. Any issues or missing assets

Then use this exact message:

"The trilogy assets are ready. Please review and confirm if I should continue to build Zork II and Zork III."

Do not continue until I explicitly approve.

==================================================
PHASE 6 — BUILD, ZORK II FIRST
==================================================

Build Zork II to completion and ship it before starting Zork III. It is the closer sibling to what already works — same scoring model, same treasure-and-trophy-case loop, same kind of set-piece encounters. Zork III's zero-treasure structure and two bespoke UIs make it the right thing to build once the multi-game abstraction has been proven twice.

**Zork II:**
- Port `2dungeon.zil` and `2actions.zil`: 86 rooms, 147 objects, 189 action routines, 23 daemons.
- **Design the Wizard's spell effects as an effect layer in `verbs.ts` before writing any specials.** Twelve spells; several rewrite core verb behaviour for a duration — Feeble overrides carry capacity, Float suspends gravity and kills you if it expires over water, Fumble injects random drops into `ITAKE`, Fierce overrides the sword glow, Freeze blocks movement. This is why `SPELL-USED` appears 26 times in the shared `gverbs.zil`. It does not bolt on afterwards.
- The Bank of Zork gets its own test suite. A walkthrough will not cover its failure modes.
- The balloon: altitude, fuel, receptacle, wire and cloth-bag failure states.
- 400-point scoring with its own rank ladder and `CASE-WORTH`.
- Full-run test: 400/400. The Wizard's random spells can block progress, so seed the RNG and add retry tolerance or a spell-suppression test hook.

**Zork III:**
- Port `3dungeon.zil` and `3actions.zil`: 89 rooms, 121 objects, 219 action routines, 24 daemons.
- Build the two bespoke components from Phase 2 — the Royal Puzzle grid and the mirror-box schematic.
- The Dungeon Master follows and obeys typed orders (`DM, GO NORTH`). The shared parser supports actor commands via `ACTORBIT`, but our `parse.ts` exercises that path for the first time — test it deliberately.
- Seven-task "potential" scoring, no trophy case.
- Full-run test: 7/7. Fewer points but a strictly ordered sequence with timed windows — the earthquake, the puzzle's one-way traps, the endgame ritual.

**Both:**
- All room, object and parser text verbatim from source. Verify against the compiled `.z3` with the Phase 0 differential harness.
- Region music crossfades, event panels, SFX wired as in Zork I.
- Per-game save slots; existing Zork I saves keep working.
- Per-game lazy asset loading and service-worker cache buckets — the trilogy will not fit in one precache.
- Trilogy shell with the cross-game hand-off.

Test and fix: console errors, broken asset paths, parser and disambiguation bugs, panel transition glitches, audio crossfade errors, save/restore state loss, mobile input issues, and any deviation from source puzzle logic or text.

Write:

docs/trilogy-final-build-report.md

Covering what was built, how to run it, file structure, implemented features, known limitations, and suggested improvements.

==================================================
FINAL DELIVERY
==================================================

1. Local run instructions
2. Final file structure
3. Summary of implemented features across all three games
4. Known issues or limitations
5. Suggestions for the next iteration

Do not skip steps. Do not generate assets before approval. Do not build before approval.

Reuse the open-source Zork II and Zork III source material faithfully; keep all illustrations and audio original. And generate every room-state variant as a chained edit off its locked base — that requirement is the reason this prompt exists.
