You are Fable 5 working as an agentic game developer, researcher, creative director, and project builder.

We are going to build a browser-based graphic-novel edition of Zork I, ported from the open-source historical source release at https://github.com/historicalsource/zork1. The original is a text parser adventure ("interactive fiction"). We are preserving that parser-driven core — typed commands, room descriptions, puzzles, scoring, deaths, the whole Great Underground Empire — but wrapping it in a motion-comic presentation: every room and major action generates an AI-illustrated panel, in the style of a graphic novel, that fades/flies into view as the player acts. Original ambient music and sound effects reinforce mood and feedback. This is a personal, non-commercial project.

Since Zork I's source is itself open source and we are porting it (not imitating a commercial competitor), there is no need to obscure names, rooms, puzzles, or text from the source material — reuse the original room names, object names, and game text faithfully. Do not use any Infocom/Activision trademarked logos, box art, or manual illustrations as source imagery; all generated art should be original artwork produced for this project, in an original visual style, depicting the source material's world.

Important workflow rule:
Do not build the game immediately.
First, you must research, plan, generate the media and audio direction, organize everything, and then stop for my approval.
Only after I approve the generated assets and design plan, continue to build the actual game.

The media-gen skill will use Nano Banana Pro for image generation.
If generated assets need transparent backgrounds or background removal, use the available background removal workflow/tool if needed.
Keep all generated assets organized inside the project folder.

Project name:
ZorkGraphicNovel

Main objective:
Create a playable browser-based, illustrated text adventure faithful to Zork I:
- Parser-First Interaction: The core interface is a classic command line ("open mailbox", "go north", "take lamp"). Nothing about the puzzle logic, room layout, or object behavior is reinvented — it is ported from the original source.
- Reactive Illustration: Every room the player enters, and every major event (finding a treasure, lighting the lamp, meeting the troll, dying to a grue, opening the trophy case, winning), triggers a new full-panel illustration that transitions in with a fade and a slight fly-in motion, like a page turn in a graphic novel.
- Diegetic Audio: Each region of the map (Above Ground, the White House, the Forest, the Cellar/Troll region, the Maze, the Temple/Egyptian complex, the Coal Mine, the Endgame) has its own ambient music bed that crossfades on region transitions. Actions (doors, combat, magic words, treasure pickup, death, victory) get short original sound effects.
- Zero Combat Redesign: Combat, death, and puzzle logic remain exactly as in the original game (including the thief, the troll, and grues) — we are not softening or removing mechanical friction, since that friction is Zork's actual design.
- Save/Restore Fidelity: Preserve the classic save/restore/verbose/score/diagnose commands players expect from Zork.
- Legible Text Always: Illustration supports the prose; the full room/parser text is always visible and readable, never obscured by artwork.

Design pillars (in priority order):
1. **Fidelity to the source.** Room graph, objects, verbs, puzzle logic, scoring, and text come from the historicalsource/zork1 repository. We are porting, not reimagining.
2. **Illustration as reinforcement, not replacement.** Art appears in reaction to the parser, on a timed fade/fly-in, and never blocks or delays reading the text output.
3. **Consistent graphic-novel art direction.** One coherent illustrated style across every room, character, and event panel.
4. **Atmosphere through audio.** Music and SFX are original, lightweight, and diegetic — building dread in the Troll Room, wonder in the Temple, panic from a grue.

==================================================
PHASE 1 — RESEARCH
==================================================

First, research both the source material and the presentation format.

1. Study the historicalsource/zork1 repository structure (ZIL/MDL source files): how rooms, objects, verbs, grammar, flags, and daemons are organized.
2. Map the full room graph and region groupings (Above Ground, House, Forest, Cellar, Troll/Maze area, Round Room hub, Temple/Egyptian Room, Coal Mine/Lower areas, Endgame).
3. Catalog key objects, treasures, NPCs (thief, troll, cyclops), and death/failure states.
4. Study classic parser/IF UX conventions: command line input, disambiguation, scrollback, verbose/brief mode, scoring, save/restore.
5. Study "visual novel" / motion-comic presentation conventions: panel pacing, transition timing, how text and illustration share screen space without competing for attention.
6. Research browser options for running/porting a Z-machine-era game: (a) reimplementing the parser/room logic natively in TypeScript from the ZIL source, versus (b) running the compiled game file through an existing browser Z-machine interpreter (e.g., ifvms.js/Parchment) and hooking into its output/state to trigger art and audio. Recommend one, with tradeoffs (hook granularity, save-file format, moddability, build complexity).
7. Recommend a technical stack for a browser-based, illustrated parser game with fade/fly-in transitions, layered audio, and later portability considerations.
8. Recommend a full asset list (rooms, events, characters, items) for Nano Banana Pro generation, sized to a v1 scope.

Important:
Do not use any Infocom/Activision box art, manual illustrations, or logos as reference imagery. Original text and room/object/verb structure from the open-source release may be reused directly.

Create a research document and save it here:

docs/research-report.md

The research report should include:
- Summary of the source repo's architecture and how classic parser IF works
- Recommendation: native TypeScript reimplementation vs. Z-machine interpreter + hooks (with rationale)
- Key systems we must port faithfully (parser grammar, room graph, object flags, daemons/timers, scoring, save/restore)
- Recommended technical approach for a browser-based illustrated parser game, with later mobile/PWA considerations
- Recommended asset list for Nano Banana Pro generation (rooms, events, characters, items)
- Recommended approach for original ambient music and SFX (synthesis vs. generated/licensed royalty-free libraries vs. hand-authored WebAudio)

After research, continue to planning.

==================================================
PHASE 2 — PRESENTATION CONCEPT
==================================================

Define the visual and interaction direction for the graphic-novel presentation layer. We are not renaming or reinventing Zork's world — this phase is about how we present it.

The game will keep the title Zork I, presented as:
"Zork I: The Great Underground Empire — Graphic Novel Edition"

Define:
1. Screen layout: how the illustrated panel, scrollback text log, and command input coexist on desktop and mobile
2. Panel transition language: exact fade/fly-in behavior (direction, duration, easing) when a new room or event panel appears, and what happens to the previous panel
3. Art direction: a single consistent illustrated style (e.g., inked graphic-novel line art with muted painterly color, or another chosen direction) applied to every room, character, and item panel
4. Typography and UI chrome: how parser text, prompts, and system messages (score, moves, deaths) are styled to feel like comic captions/UI rather than a plain terminal
5. Audio direction: mood per region, transition behavior between regional music beds, SFX palette
6. Accessibility/legibility: ensuring text-only players (audio/image off) still get the full classic Zork experience

Save this concept here:

docs/presentation-concept.md

==================================================
PHASE 3 — REGION & ROOM DESIGN PLAN
==================================================

Break the full Zork I map into its natural regions, matching the source game (do not invent new geography).

1. Above Ground (forest, house exterior, clearing, chimney)
2. House Interior (kitchen, attic, living room, trophy case)
3. Cellar & Troll Region (cellar, troll room, east-west passages)
4. Round Room Hub & Maze (round room, maze, thief's lair, grating)
5. Temple / Egyptian Complex (temple, altar, Egyptian room, torch room, hades)
6. Coal Mine / Lower Empire (mine entrance, ladders, shaft room, coal mine maze, gas room, drafty room)
7. Endgame (barrow, final sequence)

For each region, define:
- Region name (from source material)
- Theme/mood
- Illustrated style notes specific to this region (lighting, palette shift, e.g. torch-lit warmth in the Temple vs. cold grue-dark in the mines)
- Key rooms in this region and which get bespoke panels vs. shared/variant panels
- Key puzzles and mechanics (ported faithfully from source, described for asset-planning purposes only)
- Notable NPCs/hazards present (troll, thief, grues, cyclops)
- Music mood and instrumentation direction
- Required visual assets (list)
- Region entry/exit transition notes (how the panel/music crossfades when moving between regions)

Save the full region plan here:

docs/region-design.md

Also create a simplified room-graph/connectivity map for each region (text-based node map is fine) to guide engine implementation — this does not need to be exhaustive of every single room/direction in v1, but should be detailed enough to build against.

==================================================
PHASE 4 — ASSET PLAN
==================================================

Before generating anything, create a complete asset generation plan.

Save it here:

docs/asset-plan.md

Required asset categories:

1. Room Panels
- One establishing illustration per notable room (graphic-novel panel style)
- Variant/state panels where a room changes meaningfully (e.g., house with/without boarded window, trophy case empty/full)

2. Event & Action Panels
- Key triggered moments: lamp lit, mailbox opened, trophy case interactions, treasure found, door opened, grating unlocked, magic word (XYZZY, etc.), egg opened by thief, death-by-grue, other death states, victory/endgame

3. Character Panels
- Thief, troll, cyclops, and any other NPCs, in a style consistent with the room panels

4. Item Close-Ups
- Key inspectable treasures and tools (lamp, sword, egg, canary, etc.) for "examine" moments

5. UI & Frontispiece Assets
- Title screen illustration and logotype
- Comic-panel frame/border treatment
- Parser input frame styling
- Death/restart screen art
- Victory/endgame illustration

6. Audio Plan (not Nano Banana Pro, documented alongside visuals)
- Ambient music bed per region
- SFX list per action/event category
- Recommended generation/sourcing method for each (synthesized via WebAudio, generated via a music tool, or hand-authored) — no copyrighted Infocom or third-party commercial music/SFX

For every visual asset, define:
- asset name
- purpose
- refined prompt for image generation
- format
- recommended size
- transparent background needed: yes/no
- save path

Image generation prompts should take on the syntax of:

Refined prompt:
"{the narrative prompt}"

Model: nano-banana-pro, {aspect ratio or other sizing details}

Use this folder structure:

ZorkGraphicNovel/
  docs/
    research-report.md
    presentation-concept.md
    region-design.md
    asset-plan.md
  assets/
    rooms/
    events/
    characters/
    items/
    ui/
    audio/
      music/
      sfx/
    raw-generations/
  game/
    index.html
    src/
      main.tsx
      engine/
      parser/
      data/
      components/
      audio/
      state/
    public/

Do not create the game code yet.
Only create the documentation and asset plan first.

==================================================
PHASE 5 — GENERATE VISUAL ASSETS WITH MEDIA-GEN
==================================================

After the asset plan is complete, use the media-gen skill to invoke Nano Banana Pro to generate the game visuals.

Generation style:
Graphic novel / comic illustration, moody atmospheric linework with painterly shading, a cohesive fantasy-dungeon-and-New-England-woods aesthetic true to Zork's tone (equal parts whimsical and ominous), readable as a discrete "panel" at a glance.

Important visual rules:
- Keep a single consistent art direction across every room, character, event, and item panel.
- Panels should read clearly as comic/graphic-novel illustration, not photorealism.
- Compose each panel to leave room for text/UI chrome to sit alongside it without covering important detail.
- UI and item assets should have transparent backgrounds where needed for overlay use.
- If background removal is needed, use the appropriate background removal workflow/tool.
- Save all final usable assets in the correct folder.
- Save raw generations in assets/raw-generations/ if useful.

Suggested generation order:

1. Generate the title screen and a handful of establishing region panels first to lock the art direction (one from each region: Above Ground, Cellar/Troll, Temple, Mine).

Save to:
assets/rooms/ and assets/ui/

2. Generate the remaining room panels for each region, following docs/region-design.md.

Save to:
assets/rooms/

3. Generate event/action panels (lamp lit, treasure found, doors, magic words, deaths, victory).

Save to:
assets/events/

4. Generate character panels (thief, troll, cyclops).

Save to:
assets/characters/

5. Generate item close-up panels for key treasures/tools.

Save to:
assets/items/

6. Generate remaining UI assets (frame treatment, death/restart screen, victory screen, logotype).

Save to:
assets/ui/

After generating assets, create an asset review document:

docs/generated-asset-review.md

In this document, include:
- List of generated assets
- File paths
- Notes about which assets are ready
- Notes about which assets may need regeneration
- Any consistency issues
- Any background removal needs
- Any assets that are missing
- Status of the audio plan (music/SFX sourcing not yet generated vs. ready)

==================================================
APPROVAL STOP
==================================================

After generating and organizing all visual assets, stop.

Do not build the game yet.

Show me:
1. Research summary (including the native-port vs. interpreter recommendation)
2. Presentation concept summary
3. Region/room plan summary
4. Asset list
5. Generated media preview / file paths
6. Any issues or missing assets

Then ask for my approval.

Use this exact message:

"The research, region plan, and generated assets are ready. Please review and confirm if I should continue to build the playable graphic novel edition of Zork."

Do not continue until I explicitly approve.

==================================================
PHASE 6 — BUILD THE GAME ONLY AFTER APPROVAL
==================================================

After I approve, build the playable game.

Technical requirements:
- Browser-based game
- TypeScript + Vite + React
- Framer Motion (or equivalent) for panel fade/fly-in transitions
- Howler.js (or equivalent) for layered/crossfaded audio
- Lightweight state store (e.g., Zustand) for game/world state
- Game logic (rooms, objects, verbs, flags, daemons, scoring) ported from the historicalsource/zork1 source into TypeScript data + engine modules — decision on native port vs. Z-machine interpreter finalized in docs/research-report.md
- Keep code organized and readable
- Use the generated assets from the assets folder
- Game should run locally in the browser and be staticly deployable

Core gameplay requirements:

1. Parser and interaction
- Classic command-line text input ("verb noun" and multi-word commands), with disambiguation prompts matching original Zork behavior
- Command history (up/down arrow to recall)
- Scrollback log of all room text, parser responses, and system messages
- New illustrated panel triggers on room entry and on major events, per docs/asset-plan.md
- Fade/fly-in transition on every new panel; previous panel fades out or is replaced cleanly
- Full room/parser text always visible and legible, never obscured by the illustration

2. Controls
- Keyboard: type commands directly into the input line, Enter to submit, Up/Down to recall history
- Mouse/touch: on-screen quick-verb chips or a tappable compass (N/S/E/W/U/D) for mobile convenience, without replacing free-text input
- Dedicated buttons/hotkeys for inventory, look, score, save, restore
- Mute/volume controls for music and SFX
- Update the controls description on the title screen or an in-game help/about panel

** IMPORTANT!! **
This should work well on both desktop (keyboard-first) and mobile (touch-first):
- Mobile shows a persistent on-screen keyboard-friendly input field plus quick-command chips (look, inventory, take, open, common directions)
- Swipe or tap to dismiss/expand the text log vs. illustration panel if screen space is tight
- Update the controls description on the title screen or options menu if needed

3. World and regions
- Implement the full Zork I room graph and region groupings from docs/region-design.md
- Faithful puzzle logic, object flags, and daemons/timers (e.g., lamp fuel, matches burning down, thief encounters) ported from source
- Region transitions trigger the appropriate music crossfade

4. Puzzles and hazards
- Preserve original puzzle logic exactly (troll blocking passage, grating/lock, thief and egg, grue darkness/death, cyclops, dam controls, etc.)
- Death and failure states behave as in the original (with restart/restore), each with an accompanying illustrated panel

5. Text and documentation fidelity
- All room descriptions, object descriptions, and parser responses come from the source material
- In-game "help"/"about" panel explains parser conventions for players unfamiliar with classic IF

6. Inventory and scoring
- Standard Zork inventory, score, and moves tracking
- Visual/audio feedback when treasures are placed in the trophy case

7. UI overlays
Show:
- Illustrated panel (primary focus)
- Scrollback text log
- Command input line
- Score/moves indicator
- Inventory quick-view
- Mute/volume and save/restore controls

8. Game states
Implement:
- Title screen / main menu (new game, restore, about/help)
- Main play state (parser + illustrated panel + audio)
- Death/restart state
- Victory/endgame state

9. Visual integration
- Use the generated room, event, character, and item panels
- Use generated UI assets (frame, title, death, victory screens)
- Maintain a single consistent graphic-novel art direction throughout
- Keep all text perfectly legible over or alongside artwork

10. Audio
Do not use copyrighted Infocom or third-party commercial music/SFX.
Implement original ambient music per region (crossfading on region change) and short SFX for key actions (doors, combat, magic words, treasure, death, victory), per the audio plan in docs/asset-plan.md.
Provide mute/volume controls that persist across sessions.

11. Save/restore
- In-browser save/restore (localStorage or IndexedDB) matching classic save/restore command behavior
- Optional export/import of a save file

12. Testing and debugging
After building, test the game.
Fix:
- console errors
- broken asset paths
- parser disambiguation and multi-word command bugs
- panel transition glitches or stuck/duplicate panels
- audio not crossfading or overlapping incorrectly on region change
- save/restore failing to fully restore world state
- mobile input/quick-command issues
- any deviation from the original puzzle logic/text

Create a final technical summary:

docs/final-build-report.md

Include:
- What was built
- How to run the game
- File structure
- Controls
- Implemented features
- Known limitations
- Suggested improvements for future versions

==================================================
FINAL DELIVERY
==================================================

At the end, provide:
1. Local run instructions
2. Final file structure
3. Summary of implemented features
4. Known issues or limitations
5. Suggestions for next iteration

Do not skip steps.
Do not build before approval.
Reuse the open-source Zork I source material faithfully; keep all generated illustrations and audio original.
Create a polished, playable, illustrated port of Zork I.
