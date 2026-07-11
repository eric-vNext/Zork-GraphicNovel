# Region & Room Design Plan

**Phase 3 deliverable.** The full Zork I map (110 rooms, verified against `reference/zork1-source/1dungeon.zil`) grouped into its natural regions. No invented geography — every room, exit, and puzzle below is the original. Panels marked **[B]** get bespoke art, **[S:x]** share/variant a panel.

Note on grouping: the brief's seven groupings are kept, with one addition the source map requires — the **Dam / Reservoir / Frigid River** hydro-complex, which is its own musical/visual identity in the original. Total: **8 regions** (matching the 8 audio beds in the brief).

Global visual constants: "Storm-Lantern Ink" style (see `presentation-concept.md` §3); the adventurer appears only as hands/back-of-shoulder; the brass lantern's warm pool is the recurring light motif underground.

---

## Region 1 — Above Ground (Forest & House Exterior)

- **Mood:** Deceptively pastoral New England woods; late-afternoon storm light; something wrong under the calm.
- **Style notes:** Watery gray-gold daylight, long shadows; palette bone-white, moss green, slate sky; the white house always slightly too still. The barrow door (post-victory) is cold violet dusk.
- **Rooms (17):** WEST-OF-HOUSE **[B]** (+ variant: barrow path open), NORTH-OF-HOUSE **[B]**, SOUTH-OF-HOUSE **[B]**, EAST-OF-HOUSE **[B]** (window ajar variant), FOREST-1/2/3 **[S:forest]** (one shared forest panel + one darker variant), PATH **[B]**, UP-A-TREE **[B]** (nest + egg visible), GRATING-CLEARING **[B]** (+ grating-open variant), CLEARING **[B]**, MOUNTAINS **[S:forest-edge]**, CANYON-VIEW **[B]**, CLIFF-MIDDLE **[S:canyon]**, CANYON-BOTTOM **[B]**, END-OF-RAINBOW **[B]** (+ rainbow-solid variant), STONE-BARROW **[B]** (endgame region shares this art).
- **Key puzzles/mechanics:** entering via kitchen window; egg in nest (bird tree); grating unlocked from below with skeleton key; rainbow solidified with sceptre (pot of gold appears); leaflet/mailbox; resurrection point (forest) after first deaths.
- **NPCs/hazards:** songbird (audio only, `I-FOREST-ROOM`); thief never comes above ground (`SACREDBIT`).
- **Music:** Sparse acoustic — soft guitar/harp harmonics over wind and distant birdsong; major-key but unresolved (suspended chords). Instrument palette: nylon strings, breathy flute, field-recording-style wind texture (synthesized).
- **Required visual assets:** 14 room panels/variants listed above + event panels (mailbox opened, window entry, rainbow solid, resurrection).
- **Transitions:** → House Interior via window (creak SFX, warm interior light); → Cellar region via grating (metal clang, music dips to sub-bass before Underground bed enters); music here returns triumphant-tinged after resurrection.

```
            MOUNTAINS
                │E/W
 GRATING-CLR──FOREST-2──CLEARING──CANYON-VIEW
   │S  \W        │W        │W          │(down)
  PATH  FOREST-1─┘      EAST-OF-HOUSE  CLIFF-MIDDLE
   │up   │S              (window→KITCHEN)  │
 UP-A-TREE FOREST-3──S-OF-HOUSE        CANYON-BOTTOM
  PATH─S→N-OF-HOUSE──W→WEST-OF-HOUSE      │N
 GRATING-CLR─down(grate+key)→GRATING-ROOM END-OF-RAINBOW
 WEST-OF-HOUSE─SW(if WON)→STONE-BARROW    (cross rainbow→ARAGAIN-FALLS)
```

## Region 2 — House Interior

- **Mood:** Abandoned domesticity; dust motes in window light; the trophy case waiting like an altar.
- **Style notes:** Warm sepia interior against cool exterior glimpses; oriental rug reds; brass and oak; the trap door a black rectangle of promise.
- **Rooms (4):** KITCHEN **[B]**, ATTIC **[B]**, LIVING-ROOM **[B]** with variants: rug moved + trap door open, trophy case empty vs. **full (victory-adjacent)**; STUDIO **[B]** (chimney room — physically underground but visually "house": sooty hearth-light) and GALLERY **[B]** grouped here for art/music (they connect to Cellar region play-wise).
- **Key puzzles/mechanics:** rug → trap door; trap door slams shut behind you (until thief dead/case route earned); chimney climb up from Studio (max 2 items, lamp required); trophy case deposits = score; attic rope+knife; brown sack/garlic/lunch; matches in Dam Lobby but candles here on altar path.
- **NPCs/hazards:** none (the door slam is the region's "ghost").
- **Music:** Music-box intimacy — celesta/music-box motif (the game's main theme in miniature) over room-tone; creaking-wood accents. The trophy-case deposit fanfare is this theme resolving.
- **Required assets:** kitchen, attic, living room ×3 states, gallery, studio + events (trap door revealed, case deposit, door slam).
- **Transitions:** → Cellar via trap door: music-box motif cut by the door-slam SFX, Underground bed fades in from silence (the game's signature threshold moment — give it 1 s of musicless dark).

```
ATTIC ─down─ KITCHEN ─W─ LIVING-ROOM ─down(trap door)→ CELLAR
               │E(window)               │W(if MAGIC-FLAG)→STRANGE-PASSAGE
          EAST-OF-HOUSE                 └─(rug/case/sword/lamp here)
GALLERY(N)──STUDIO ─up chimney(≤2 items)→ KITCHEN
```

## Region 3 — Cellar & Troll Region

- **Mood:** First taste of the Empire: dripping stone, claustrophobia, the troll's territorial stink.
- **Style notes:** Lantern pool vs. blue-black; wet stone speculars; troll room streaked with old gore (tasteful ink, not splatter); the Gallery's painting a shock of color in the murk.
- **Rooms (5):** CELLAR **[B]**, TROLL-ROOM **[B]** (+ troll-defeated variant: empty room, bloodstain), EAST-OF-CHASM **[B]**, EW-PASSAGE **[S:passage]**, CHASM-ROOM **[B]**.
- **Key puzzles/mechanics:** troll blocks east/west until paid (sword fight or lucky axe outcomes); trap door slams; painting in Gallery (treasure); darkness/grue rules begin here.
- **NPCs/hazards:** **the troll** (melee daemon `I-FIGHT`), grues in any dark room.
- **Music:** Low drone with irregular drips (pitched percussion), sub pulse quickening near the troll; troll defeated → drone relaxes, drips remain.
- **Required assets:** 5 panels + variants; troll character panel; events: troll fight, troll defeated, grue warning, grue death.
- **Transitions:** ← House via trap door (see above); → Maze west of Troll Room (music thins to near-silence + heartbeat); → Round Room hub east (bed opens up, cavernous reverb).

```
LIVING-ROOM ─trap door─ CELLAR ─N─ TROLL-ROOM ─W─ MAZE-1
                          │S          │E
                    EAST-OF-CHASM   EW-PASSAGE ─E─ ROUND-ROOM
                          │E          │N/down
                       GALLERY      CHASM-ROOM ─NE─ RESERVOIR-SOUTH
                          │N
                       STUDIO(chimney↑)
```

## Region 4 — The Maze, Cyclops & Thief's Lair

- **Mood:** Disorientation weaponized; identical twisting passages; evidence of previous adventurers (the skeleton); the thief's den above.
- **Style notes:** Deliberately near-identical maze panels — same claustrophobic rough stone with tiny compositional shifts (a crack, a bone) rewarding attention; skeleton alcove gets bespoke art; Cyclops room framed low-angle to make him enormous; Treasure Room glitters against squalor.
- **Rooms (20):** MAZE-1…15 **[S:maze ×3 lighting/prop variants]**, DEAD-END-1…4 **[S:dead-end]**, skeleton room (MAZE-5) **[B]**, GRATING-ROOM **[B]** (+ grating-open shaft of daylight variant), CYCLOPS-ROOM **[B]** (+ cyclops-fled wall-hole variant), STRANGE-PASSAGE **[S:passage]**, TREASURE-ROOM **[B]** (thief's lair).
- **Key puzzles/mechanics:** maze mapping (drop-item breadcrumbs — the thief picking them up is canon cruelty); skeleton loot (coins, key, useless lantern); grating unlock (key, from below; leaves to Grating-Clearing); **cyclops**: feed lunch + bottle of water → sleeps, or say **ODYSSEUS** → smashes through wall to Living Room (MAGIC-FLAG); **thief's Treasure Room**: he attacks here at full strength; give him the egg earlier → he opens it (canary intact); kill him → all loot + opened egg drop.
- **NPCs/hazards:** **thief** (roams whole dungeon via `I-THIEF`, steals valuables/items, deposits here; "engrossed" window when gifted a treasure), **cyclops**, grues.
- **Music:** Barest region — heartbeat pulse, air-tone, occasional skitter SFX-as-music; Cyclops room adds huge slow snore/breath rhythm; Treasure Room: detuned music-box (the thief hums the house theme, wrong).
- **Required assets:** maze shared ×3, dead-end shared, skeleton, grating room ×2, cyclops room ×2, treasure room; character panels: thief, cyclops; events: thief steals, egg opened, thief fight, cyclops fed/ODYSSEUS.
- **Transitions:** Maze entry from Troll Room kills the drone (silence + heartbeat is the "you are lost" signal); ODYSSEUS blasts straight to House Interior bed via masonry-crash SFX; grating exit → Above Ground bed + daylight panel.

```
TROLL-ROOM ─W─ MAZE-1 ─S─ MAZE-2 ─E─ MAZE-3 ─up─ MAZE-5(skeleton,key)
  (maze interconnections faithful to source tables: 1↔4, 2↔4(down),
   4→DEAD-END-1, 5─SW→MAZE-6, 6↔7, 7↔8, 8→DEAD-END-3, 7↔9,
   9↔10/11, 11↔GRATING-ROOM(up grate→GRATING-CLEARING), 10↔13,
   12→DEAD-END-2, 13↔14, 14↔15, 15─SE→CYCLOPS-ROOM)
CYCLOPS-ROOM ─up─ TREASURE-ROOM (thief)
CYCLOPS-ROOM ─E(if MAGIC-FLAG)─ STRANGE-PASSAGE ─E─ LIVING-ROOM
```

## Region 5 — Round Room Hub & Temple / Egyptian Complex / Hades

- **Mood:** The Empire's cathedral floor: echoing hub passages opening into solemn sacred spaces — then the genuinely frightening gate of Hades.
- **Style notes:** Hub/passages: cool grays, multiple exits as black mouths. Temple: torch-lit amber warmth, colossal columns, granite; Egyptian room gold-on-dark; Dome Room vertiginous. Hades: sickly green-white spirit light, the only "supernatural glow" in the game.
- **Rooms (16):** ROUND-ROOM **[B]**, NS-PASSAGE / EW-PASSAGE (listed in R3) / NARROW-PASSAGE / WINDING-PASSAGE / COLD-PASSAGE **[S:passage ×2]**, LOUD-ROOM **[B]** (+ quiet variant post-ECHO), DEEP-CANYON **[B]**, DAMP-CAVE **[S:passage]**, ENGRAVINGS-CAVE **[B]**, DOME-ROOM **[B]**, TORCH-ROOM **[B]**, NORTH-TEMPLE **[B]**, SOUTH-TEMPLE (Altar) **[B]**, EGYPT-ROOM **[B]**, ENTRANCE-TO-HADES **[B]** (+ spirits-banished variant), LAND-OF-LIVING-DEAD **[B]**, SMALL-CAVE/TINY-CAVE **[S:cave]**.
- **Key puzzles/mechanics:** rope tied to Dome railing → descend to torch (treasure + light); **LOUD ROOM: say "ECHO"** → acoustics fixed, platinum bar takeable; temple bell/book/candles → **exorcism at Hades** (hot bell, lit candles, read book — timed sequence `I-XB/XBH/XC`) → crystal skull; prayer at altar teleports to Forest; gold coffin (sceptre inside) through Egypt Room — coffin too big for most routes (Altar "down" squeeze with light management); grues everywhere unlit.
- **NPCs/hazards:** evil spirits (block Hades), thief raids here happily, grues.
- **Music:** Hub: spacious cavern bed (long-reverb struck stone). Temple: low male-choir-like pad (synth vox, no words) + torch crackle; Egyptian room adds a thin exotic reed line. Hades: dissonant cluster drones, whispering textures (reversed noise), resolving to hollow silence after exorcism.
- **Required assets:** ~14 panels + variants; events: ECHO, exorcism (bell-book-candle), spirits shriek/banished, prayer teleport, dome descent.
- **Transitions:** Round Room is the crossfade crossroads — hub bed is neutral so adjacent region beds (Troll drone, Dam hydro, Temple choir) hand off cleanly; Hades sub-bed layers *over* the hub bed (adds dissonance layer rather than full crossfade).

```
EW-PASSAGE ─E─ ROUND-ROOM ─N─ NS-PASSAGE ─N─ CHASM-ROOM
                 │E: LOUD-ROOM ─up─ DEEP-CANYON ─E─ DAM-ROOM
                 │        └─E─ DAMP-CAVE ─E─ WHITE-CLIFFS-N
                 │S: NARROW-PASSAGE ─S─ MIRROR-ROOM-S
                 │SE: ENGRAVINGS-CAVE ─E─ DOME-ROOM ─down(rope)─ TORCH-ROOM
TORCH-ROOM ─S/down─ NORTH-TEMPLE ─E/down─ EGYPT-ROOM(coffin)
NORTH-TEMPLE ─S─ SOUTH-TEMPLE(altar) ─down─ TINY-CAVE ─down─ ENTRANCE-TO-HADES
ENTRANCE-TO-HADES ─S(after exorcism)─ LAND-OF-LIVING-DEAD(skull)
MIRROR-ROOM-S ↔(touch mirror)↔ MIRROR-ROOM-N   COLD-PASSAGE─W─SLIDE-ROOM
NARROW/WINDING/COLD passages knit S-mirror side: WINDING─N─MIRROR-S? (per source:
 MIRROR-1 S side: N→NARROW-PASSAGE... faithful tables in engine data)
```

## Region 6 — Dam, Reservoir & Frigid River

- **Mood:** Flooded industrial grandeur — the Empire's one working machine; then open water: speed, spray, and white cliffs.
- **Style notes:** Concrete monolith scale, spillway spray catching light; control-panel greebles (bubble, bolt, buttons); river panels are the region's "wide shots" — the one place panels breathe with distance. Palette: steel blue, foam white, FCD#3's absurd yellow button accents.
- **Rooms (20):** DAM-ROOM **[B]** (+ gates-open variant), DAM-LOBBY **[B]**, MAINTENANCE-ROOM **[B]** (+ flooding variant), DAM-BASE **[B]**, RESERVOIR-SOUTH / RESERVOIR / RESERVOIR-NORTH **[B ×1 + drained variant showing trunk of jewels]**, STREAM-VIEW / IN-STREAM **[S:stream]**, RIVER-1…5 **[S:river ×2]**, WHITE-CLIFFS-N/S **[B ×1]**, SHORE **[S:river]**, SANDY-BEACH **[B]**, SANDY-CAVE **[S:cave]**, ARAGAIN-FALLS **[B]**, ON-RAINBOW **[B]**.
- **Key puzzles/mechanics:** press **yellow button** (bubble glows) → turn bolt with wrench → gates open, reservoir drains (`I-RFILL/I-REMPTY`, 8-turn timers) → cross drained bed for **trunk of jewels**; **blue button = flooding Maintenance Room** (13-turn drowning trap, room ruined); inflate **magic boat** (pump) at Dam Base, board, launch — river carries you (`I-RIVER` speeds), sharp objects puncture boat; **buoy holds emerald**; dig at Sandy Beach with shovel → **scarab**; Aragain Falls + sceptre → rainbow solid → **pot of gold**; shovel/sceptre logistics.
- **NPCs/hazards:** river itself (falls death if you drift), boat puncture, grues in dark segments.
- **Music:** Hydro bed — deep turbine hum + water-wash textures, metallic clanks in rhythm; on the river the bed opens: flowing arpeggio over water rush, building subtly toward the falls' white-noise roar (positional mix by room).
- **Required assets:** ~13 panels + variants; item close-ups: boat, buoy/emerald, trunk; events: gates open/drain, flood trap, boat launch, over-the-falls death, buoy, scarab dig.
- **Transitions:** From hub (Deep Canyon) the turbine hum fades up under the cavern bed before the visual arrives — you *hear* the dam first (audio foreshadowing, 1-room early layer-in). River → Above Ground at Aragain/rainbow: water roar crossfades to birdsong.

```
DEEP-CANYON ─E─ DAM-ROOM ─N─ DAM-LOBBY ─N/E─ MAINTENANCE-ROOM(buttons!)
DAM-ROOM ─E/down─ DAM-BASE(boat) ─launch→ RIVER-1→2→3→4→5 (one-way current)
RIVER: land W/E per segment → WHITE-CLIFFS-N/S(buoy on river), SHORE
RIVER-4: E→SANDY-BEACH ─NE─ SANDY-CAVE(dig:scarab)
RIVER-5 ─E─ SHORE ─N─ ARAGAIN-FALLS ─cross(rainbow solid)─ ON-RAINBOW ─ END-OF-RAINBOW
RESERVOIR-SOUTH ↔(drained)↔ RESERVOIR(trunk) ↔ RESERVOIR-NORTH ─N─ ATLANTIS-ROOM
STREAM-VIEW/IN-STREAM feed RESERVOIR-S from COLD/NARROW passage side
```

## Region 7 — Coal Mine & Lower Empire

- **Mood:** The deepest working: creaking timbers, gas, coal dust, bat shrieks — industrial danger where light itself is a bomb.
- **Style notes:** Coal-black values dominate; lantern beam tighter, dust motes; timber geometry; the Drafty/Machine rooms feel like the bottom of the world. Gas Room gets a queasy green tinge. Slide Room: worn-smooth chute of black rock.
- **Rooms (18):** MINE-ENTRANCE **[B]**, SQUEEKY-ROOM **[S:mine-passage]**, BAT-ROOM **[B]**, SHAFT-ROOM **[B]** (basket rig), SMELLY-ROOM **[S:mine-passage]**, GAS-ROOM **[B]**, MINE-1…4 **[S:coal-maze ×2]**, LADDER-TOP/LADDER-BOTTOM **[S:ladder]**, DEAD-END-5 **[S:dead-end]**, TIMBER-ROOM **[B]**, LOWER-SHAFT (Drafty Room) **[B]**, MACHINE-ROOM **[B]**, SLIDE-ROOM **[B]**, plus ATLANTIS-ROOM **[B]** (trident), MIRROR-ROOM-1/2 **[S:mirror]**, COLD/WINDING passage links **[S:passage]**.
- **Key puzzles/mechanics:** **bat** grabs you unless carrying **garlic** (random drop into mine); **Gas Room: open flame = explosion death** (carry lamp not torch/candles/match); coal maze to **dead-end coal**; **Shaft Room basket**: put torch+screwdriver+coal in basket, lower it, squeeze through Timber crack empty-handed (dark!), retrieve at Drafty Room; **Machine Room: coal in machine + screwdriver switch → diamond**; send diamond/torch back up; **Slide Room chute → Cellar** (one-way home with loot); jeweled scarab… (no—scarab is beach); **trident at Atlantis**.
- **NPCs/hazards:** vampire bat, gas explosion, grue-dark squeeze (the game's scariest legit sequence), thief raids.
- **Music:** Deep creaking-timber bed, distant collapses, Geiger-like ticks; Gas Room adds hiss; the dark squeeze section mutes everything except breath/heartbeat (audio-designed terror); Machine Room adds dormant-machine sub-thrum.
- **Required assets:** ~13 panels + variants; character panel: bat; item close-ups: coal/diamond, basket; events: bat abduction, gas explosion death, machine diamond, slide ride.
- **Transitions:** Entry from Reservoir-North/Atlantis side (hydro bed → timber creaks) or Slide from Cold Passage; **slide exit → Cellar** = whoosh SFX + hard cut to Troll-region drone (the one intentionally abrupt music cut in the game — comedic relief).

```
ATLANTIS-ROOM ─up─ RESERVOIR-N side  │ COLD-PASSAGE ─W─ SLIDE-ROOM ─down(chute!)→ CELLAR
SLIDE-ROOM ─N─ MINE-ENTRANCE ─W─ SQUEEKY-ROOM ─N─ BAT-ROOM(garlic!) ─E─ SHAFT-ROOM(basket)
SHAFT-ROOM ─N─ SMELLY-ROOM ─down─ GAS-ROOM(no flames!) ─E─ MINE-1..4 (maze)
MINE-4 ─down─ LADDER-TOP ─down─ LADDER-BOTTOM ─S→DEAD-END-5(coal) │ ─W→TIMBER-ROOM
TIMBER-ROOM ─W(empty-handed, dark)─ LOWER-SHAFT(basket arrives) ─S─ MACHINE-ROOM(coal→diamond)
```

## Region 8 — Endgame (Stone Barrow)

- **Mood:** Earned dawn; the Empire acknowledges you. Solemn, quiet triumph with a threshold of mystery (Zork II beckons).
- **Style notes:** Pre-dawn violet above ground; the barrow's massive stone door ajar with warm gold light *inside* — inversion of every dark doorway so far. Wide, ceremonial compositions.
- **Rooms (2):** WEST-OF-HOUSE (won variant — path to the barrow visible) **[variant]**, STONE-BARROW **[B]** + INSIDE-THE-BARROW threshold panel **[B]** (victory art).
- **Mechanics (faithful):** depositing all 19 treasures in the trophy case → "An almost inaudible voice whispers..." → **ancient map** appears in case → take map, go to West of House → SW/enter barrow → *"Inside the Barrow"* victory text (score 350, rank Master Adventurer) → invitation to the sequel.
- **NPCs/hazards:** none — hazards are over; that's the point.
- **Music:** The music-box house theme, fully voiced at last (strings + celesta), resolving to a single sustained tone as the barrow door is entered; then silence and wind.
- **Required assets:** map-appears event panel, barrow exterior, victory panel, victory screen UI art.
- **Transitions:** Trophy-case completion stinger interrupts the House bed; Above-Ground bed replaced by the victory theme once WON-FLAG set (region 1 map, region 8 music — intentional).

```
LIVING-ROOM(case: 19/19) → map appears → WEST-OF-HOUSE ─SW/IN→ STONE-BARROW → [VICTORY]
```

---

## Panel budget summary (feeds `asset-plan.md`)

| Region | Bespoke | Shared/variant sets | Total images |
|---|---|---|---|
| 1 Above Ground | 11 | forest, canyon (2 sets) + 3 state variants | 16 |
| 2 House | 5 | 2 state variants (living room, case) | 8 |
| 3 Cellar/Troll | 4 | 1 variant + passage set | 6 |
| 4 Maze/Thief | 5 | maze ×3, dead-end, +2 variants | 10 |
| 5 Hub/Temple/Hades | 11 | passage ×2, cave, mirror + 2 variants | 15 |
| 6 Dam/River | 9 | river ×2, stream + 3 variants | 13 |
| 7 Coal Mine | 8 | mine-passage, coal-maze ×2, ladder + variants | 11 |
| 8 Endgame | 2 | 1 variant | 3 |
| **Total room art** | | | **~58** (covers all 110 rooms via sharing) |

Every room in the engine maps to exactly one image key (bespoke or shared); shared families are chosen so no two *simultaneously-visible-on-one-path* rooms feel like a repeat.
