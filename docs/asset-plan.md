# Asset Generation Plan

**Phase 4 deliverable.** Complete generation plan for all visual and audio assets. Visuals generate via **media-gen → nano-banana-pro**. This plan supersedes the coarse count in `region-design.md`: enumerating state variants yields **~85 room images (74 Tier-1)** plus events, characters, items, and UI — **~130 images total, 105 in Tier 1**.

**Tiers:** **T1** = required for v1 playability (generate first). **T2** = variants/flourishes (generate if budget allows; the engine falls back to the base panel).

---

## 0. Global conventions

### The shared style block (append to EVERY prompt verbatim)

> **[STYLE]** = "Graphic novel panel illustration, bold expressive ink linework with painterly gouache shading, muted earthy palette of bone, moss, rust and slate, dramatic single-source chiaroscuro lighting, 1980s New England woods Americana meets subterranean fantasy dungeon gloom, whimsical detail within ominous atmosphere, cinematic composition with one clear focal point and quiet negative space along one edge for captions, no text, no lettering, no speech bubbles, no panel borders, not photorealistic."

Every "Refined prompt" below is written as `"{scene}. [STYLE]"` — expand `[STYLE]` at generation time. When media-gen supports a reference/style image input, chain the locked title-screen + anchor panels as style references for all subsequent generations.

### Formats & sizes

| Category | Aspect | Size | Format | Transparent |
|---|---|---|---|---|
| Rooms, events, characters | 3:2 | 1536×1024 | PNG (→ WebP at build) | No |
| Items | 1:1 | 1024×1024 | PNG | No (dark vignette plate) |
| Title / death / victory screens | 16:9 | 1920×1080 | PNG | No |
| Logotype, frame, compass, input plate | varies | see entry | PNG | **Yes** (via background-removal workflow) |

Naming: kebab-case, state variants suffixed (`-open`, `-won`, `-empty`). Raw/rejected generations → `assets/raw-generations/`.

### Generation order (locks art direction before volume)

1. **Anchors (8):** `ui/title-screen`, then `rooms/west-of-house`, `rooms/troll-room`, `rooms/north-temple`, `rooms/gas-room`, `characters/thief`, `events/lamp-lit`, `items/brass-lantern`. **Stop and eyeball consistency; regenerate until locked.**
2. Remaining rooms by region (1→8) · 3. Events · 4. Characters · 5. Items · 6. UI · then `docs/generated-asset-review.md`.

### Adventurer depiction rule
The player character appears only as gloved hands, a lamp-bearing forearm, or a cloaked back-of-shoulder at frame edge — never a face (player-as-camera).

---

## 1. Room Panels — `assets/rooms/`

All 110 source rooms map to the image keys below (mapping table in §1.9). All are 3:2, 1536×1024, PNG, opaque, path `assets/rooms/<name>.png`.

### 1.1 Region 1 — Above Ground

- **west-of-house** (T1) — Opening shot; must sell the whole game.
  Refined prompt: "An open grassy field before a boarded-up white colonial farmhouse, a small red mailbox on a post in the foreground, storm-gray New England sky with one shaft of gold light on the front door, pine forest crowding the edges. [STYLE]"
- **west-of-house-won** (T2) — Endgame variant.
  Refined prompt: "The same boarded white farmhouse field at violet pre-dawn, a newly revealed stone path leading southwest toward a massive ancient barrow mound glowing faintly gold at its seam. [STYLE]"
- **north-of-house** (T1) — "A narrow strip of grass along the north face of a boarded white farmhouse, all windows boarded, dark pine trees leaning close, a beaten path winding north into the woods. [STYLE]"
- **south-of-house** (T1) — "The south wall of a weathered white farmhouse with boarded windows, tall grass bending in wind, forest shadow swallowing the yard's edge. [STYLE]"
- **east-of-house** (T1) — "The back door of a white farmhouse, boarded shut, and beside it one small kitchen window standing slightly ajar, inviting and wrong, late light glinting on the glass. [STYLE]"
- **forest** (T1, shared) — "Deep New England pine and hemlock forest, columns of trunks in dim green-gold light, a carpet of needles, no path, the sense of being watched by nothing at all. [STYLE]"
- **forest-dark** (T1, shared) — "Dimmer, older forest of black-barked trees packed close, the canopy sealed overhead, thin gray light failing between trunks. [STYLE]"
- **path** (T1) — "A forest path between tall pines, one enormous low-branched tree beside the trail, sunbeams dappling the dirt. [STYLE]"
- **up-a-tree** (T1) — "View from a thick tree branch three meters up a forest path tree, a small woven bird's nest on the branch holding a large egg that glitters with jewels, the ground soft-focus below. [STYLE]"
- **grating-clearing** (T1) — "A small forest clearing where dead leaves drift over a rusted iron grating set flush in the earth, pines ringing the clearing like onlookers. [STYLE]"
- **grating-clearing-open** (T2) — "The same forest clearing with the iron grating thrown open, a black square of underworld exhaling cold air, leaves spiraling down into it. [STYLE]"
- **clearing** (T1) — "A wide forest clearing at the wood's east edge, grass flattened in a rough circle, distant view opening eastward toward a great canyon rim under storm light. [STYLE]"
- **canyon-view** (T1) — "The rim of a vast river canyon, the Frigid River glinting far below, a rainbow faint above distant thundering falls, ledges descending along the cliff. [STYLE]"
- **canyon-middle** (T1, shared) — "A narrow rock ledge halfway down a canyon wall, the river louder below, handholds worn smooth by ancient climbers. [STYLE]"
- **canyon-bottom** (T1) — "The stony floor of a river canyon beside rushing white water, cliff walls towering to a strip of sky, spray hanging in the air. [STYLE]"
- **end-of-rainbow** (T1) — "A rocky riverbank at the base of towering falls where a rainbow ends against wet stone, mist drifting, the colors faintly unreal against the gray gorge. [STYLE]"
- **rainbow-solid** (T2) — "The same falls with the rainbow turned solid and crystalline like a glass bridge, hard-edged bands of color you could walk on, a black iron pot of gold gleaming at its foot. [STYLE]"

### 1.2 Region 2 — House Interior

- **kitchen** (T1) — "An abandoned farmhouse kitchen, table with a brown sack and a glass bottle of water, a dark chimney mouth, stairs up into gloom, cold daylight through one small window. [STYLE]"
- **attic** (T1) — "A cramped attic under bare rafters, a coil of rope and a nasty-looking knife on a dusty table, one blade of light from a gap in the boards. [STYLE]"
- **living-room** (T1) — "A comfortable abandoned living room, an oriental rug centered on wooden floorboards, a battered trophy case against the wall, an elvish sword above the mantel, a wooden door to the west with strange gothic lettering, an old brass lantern on a table. [STYLE]"
- **living-room-trapdoor** (T1) — "The same living room with the oriental rug shoved aside revealing an open wooden trap door in the floorboards, black stairs descending, the trophy case watching. [STYLE]"
- **living-room-case-full** (T2) — "The same living room at night, the trophy case ablaze with nineteen treasures — jewels, a golden egg, a crystal skull, a chalice — their glow the only light. [STYLE]"
- **gallery** (T1) — "An underground art gallery with fine stonework walls, mostly stripped bare, one luminous framed painting of unparalleled beauty still hanging, lantern light pooling on it. [STYLE]"
- **studio** (T1) — "A dingy underground artist's studio, dried paint splashed on stone, brushes and a broken easel, a huge dark fireplace with a narrow sooty chimney climbing into blackness. [STYLE]"

### 1.3 Region 3 — Cellar & Troll Region

- **cellar** (T1) — "A cold stone cellar at the foot of wooden stairs, a metal ramp polished smooth sloping down from a chute in the wall, passage mouths north and south, lantern light against wet stone. [STYLE]"
- **troll-room** (T1) — "A small square cavern room with axe-scarred walls and old dark stains on the floor, a hulking troll with a bloody axe blocking the far passages, lantern light catching his tusks. [STYLE]"
- **troll-room-empty** (T2) — "The same scarred cavern room standing empty, the passages east and west finally open, a bloody axe abandoned on the stone. [STYLE]"
- **east-of-chasm** (T1) — "A cave edge overlooking a bottomless black chasm, the lantern's glow dying before it finds a far wall, a narrow path hugging the rim eastward. [STYLE]"
- **chasm-room** (T1) — "A great scree-sloped cavern split by a plunging chasm, boulders like fallen teeth, two dark passages leading away above the drop. [STYLE]"
- **passage** (T1, shared) — "A rough-hewn underground corridor of the Great Underground Empire, chisel marks in the stone, lantern light sliding along the walls toward a black bend ahead. [STYLE]"
- **passage-cold** (T1, shared) — "A long frost-rimed stone corridor, breath-mist in the lantern beam, pale mineral veins glittering in the walls. [STYLE]"

### 1.4 Region 4 — Maze, Cyclops & Thief

- **maze-a / maze-b / maze-c** (T1 ×3, shared) — Three near-identical panels; vary only small props.
  Refined prompt (a): "A claustrophobic maze of twisty little passages all alike, crumbling mortared stone, three identical dark openings, lantern light flattening every difference. [STYLE]" — (b): same + "a single old crack crossing the floor" — (c): same + "a rusted spike driven into one wall".
- **dead-end** (T1, shared) — "A blind stone pocket at the end of a twisting passage, rough wall filling the frame, lantern shadow of the viewer thrown huge across it. [STYLE]"
- **maze-skeleton** (T1) — "A maze chamber holding the slumped skeleton of a luckless adventurer against the wall, a rusty knife, scattered coins, a ring of skeleton keys and a burned-out lantern in the dust. [STYLE]"
- **grating-room** (T1) — "A tiny stone cell beneath a locked iron grating in the ceiling, dead leaves sifting through the bars, thin gray daylight striping the floor. [STYLE]"
- **grating-room-open** (T2) — "The same cell with the grating swung open, a column of forest daylight and falling leaves pouring in. [STYLE]"
- **cyclops-room** (T1) — "A vaulted cavern chamber, and filling it a giant one-eyed cyclops seated against the wall, his single enormous eye fixed on the viewer, bones scattered, low-angle composition making him mountainous. [STYLE]"
- **cyclops-room-hole** (T2) — "The same vaulted chamber empty, a cyclops-shaped hole smashed through the east wall into darkness, dust still hanging in the lantern light. [STYLE]"
- **treasure-room** (T1) — "A small hidden den heaped with stolen loot — coins, goblets, jewelry spilling from sacks — a rope ladder over the edge of a hole in the floor, the walls close and mean. [STYLE]"

### 1.5 Region 5 — Round Room Hub, Temple & Hades

- **round-room** (T1) — "A perfectly circular stone chamber, five black passage mouths at the compass points, the lantern in the center throwing spoke-like shadows into every exit. [STYLE]"
- **loud-room** (T1) — "An abrasively angular stone chamber that looks like it sounds — every surface faceted and echoing — a platinum bar gleaming impossibly on the floor, passages east and west and a stair up. [STYLE]"
- **deep-canyon** (T1) — "A deep underground canyon room where the sound of rushing water rises from below, ledges and stairs cut into the walls, spray-haze in the lantern beam. [STYLE]"
- **engravings-cave** (T1) — "A low cave whose walls crawl with ancient engravings of unparalleled craft — processions, dams, kings — half-lit by a moving lantern. [STYLE]"
- **dome-room** (T1) — "The top of a vast stone dome viewed from a precarious railed ledge, a rope tied to the railing dropping away into torch-lit depths far below, vertigo composition. [STYLE]"
- **torch-room** (T1) — "The floor of the great dome, a white marble pedestal bearing a burning ivory torch, the rope dangling from impossible height, warm firelight against cathedral dark. [STYLE]"
- **north-temple** (T1) — "The northern hall of an ancient subterranean temple, colossal granite columns, a brass bell on a stand, shafts of impossible amber light through dust. [STYLE]"
- **south-temple-altar** (T1) — "The temple's southern sanctum, a great stone altar with an ancient black book upon it and a pair of candles burning low, carved gods watching from the shadows. [STYLE]"
- **egypt-room** (T1) — "A chamber in ancient Egyptian style, hieroglyph-painted walls, and centered a magnificent solid gold coffin of Ramses the Second, lantern light running like liquid over the gold. [STYLE]"
- **entrance-to-hades** (T1) — "A cavern threshold wreathed in sickly green-white spirit light, a legion of translucent wailing ghosts barring an ornate gate, their forms streaming like smoke. [STYLE]"
- **hades-banished** (T2) — "The same gate standing silent and open, the spirit light extinguished, wisps of smoke dissolving, the way south clear. [STYLE]"
- **land-of-living-dead** (T1) — "The Land of the Dead beyond the gate, a plain of pale bones and standing shades frozen mid-lament, and on a cairn a crystal skull shining like ice. [STYLE]"
- **cave** (T1, shared) — "A small featureless natural cave, sandy floor, two dark exits, the lantern's circle of safety very small. [STYLE]"
- **mirror-room** (T1, shared) — "A cold stone room dominated by an enormous flawless wall mirror reflecting the viewer's lantern glow as a second ghost light, the reflection subtly too deep. [STYLE]"

### 1.6 Region 6 — Dam, Reservoir & Frigid River

- **dam-room** (T1) — "Atop Flood Control Dam #3, a colossal concrete dam holding back dark reservoir water, control panelwork with a single glass bubble, the gorge yawning below, industrial-gothic scale. [STYLE]"
- **dam-open** (T2) — "The same dam with its gates open, columns of white water thundering through the sluices into the gorge, spray climbing the concrete. [STYLE]"
- **dam-lobby** (T1) — "A derelict visitor's lobby inside the dam, faded mural of the dam's glory days, a dispenser of matchbooks, pamphlets moldering on a counter, wan artificial gloom. [STYLE]"
- **maintenance-room** (T1) — "A cramped dam maintenance room crowded with pipework and a control panel of four large colored buttons — blue, yellow, brown, red — a tube of gunk and a wrench on the workbench. [STYLE]"
- **maintenance-flooding** (T2) — "The same maintenance room with water jetting from a burst pipe, already shin-deep and climbing, tools floating, the blue button still glowing smugly. [STYLE]"
- **dam-base** (T1) — "The rocky base of the great dam beside the river, and on the shore a folded pile of yellowed plastic with a hand pump nearby — a deflated magic boat waiting. [STYLE]"
- **reservoir** (T1, shared) — "A vast black underground reservoir, the lantern beam skating over still water to nothing, a stone shore in the foreground. [STYLE]"
- **reservoir-drained** (T1) — "The same reservoir emptied to a plain of glistening mud and stranded debris, and half-buried at its center an ornate ancient trunk spilling jewels. [STYLE]"
- **stream** (T1, shared) — "A narrow underground stream sliding between smooth stone banks, the current audible in the dark, reflections wobbling on the ceiling. [STYLE]"
- **river-upper** (T1, shared) — "Aboard a small inflated boat on a swift underground river between sheer stone walls, the current strong, lantern light on black racing water. [STYLE]"
- **river-lower** (T1, shared) — "The same river run wider and faster, white chop at the bow, towering chalk-white cliffs sliding past, a distant roar ahead. [STYLE]"
- **white-cliffs** (T1) — "A boat's-eye view beneath sheer white chalk cliffs rising from the river, banded strata like pages of a giant book, a red buoy bobbing midstream. [STYLE]"
- **sandy-beach** (T1) — "A wide sandy beach on the underground river's shore, a rusted shovel jutting from the sand, boat pulled up at the waterline. [STYLE]"
- **aragain-falls** (T1) — "The brink of Aragain Falls from the shore, the river hurling itself into mist, a rainbow arching across the gorge in the spray-light. [STYLE]"
- **on-rainbow** (T1) — "Standing on a solidified rainbow bridge above the falls' gorge, bands of hard glassy color underfoot, mist and river far below, the far bank waiting. [STYLE]"

### 1.7 Region 7 — Coal Mine & Lower Empire

- **atlantis-room** (T1) — "An ancient guano-streaked hall named for drowned Atlantis, wave motifs carved in the walls, a beautiful crystal trident on a ledge, water-sound from somewhere below. [STYLE]"
- **mine-entrance** (T1) — "The timber-framed mouth of an old coal mine, warning carvings half-effaced, coal dust silting the floor, the dark inside darker than dark. [STYLE]"
- **mine-passage** (T1, shared) — "A narrow mine gallery braced with sagging timbers, coal glitter in the walls, the lantern beam choked by hanging dust. [STYLE]"
- **bat-room** (T1) — "A high-ceilinged mine chamber, and hanging from the roof a huge vampire bat with folded wings and open eyes, jade figurine gleaming on the guano-crusted floor. [STYLE]"
- **shaft-room** (T1) — "A mine room built around a black vertical shaft, a wooden basket hanging from a chain over the drop, the chain vanishing down into nothing. [STYLE]"
- **gas-room** (T1) — "A mine chamber with a sickly green haze in the air, a sapphire-encrusted bracelet on the floor, everything rendered in queasy tension — one spark from catastrophe. [STYLE]"
- **coal-maze-a / coal-maze-b** (T1 ×2, shared) — "A twisting coal seam passage, walls of glittering black, timber props leaning, three openings indistinguishable. [STYLE]" — (b): same + "a heap of dead coals in one corner".
- **ladder** (T1, shared) — "A rickety wooden ladder bolted down a sheer shaft wall, rungs worn to shine, the lantern showing ten rungs and then night. [STYLE]"
- **timber-room** (T1) — "A long low room of broken timber piles, and in the west wall a crack barely wide enough for a person with empty hands, exhaling cold air. [STYLE]"
- **drafty-room** (T1) — "A small drafty chamber at the bottom of everything, the wooden basket resting at the end of its chain, torchlight from the basket painting the walls amber. [STYLE]"
- **machine-room** (T1) — "A chamber housing a huge dormant machine like an industrial dragon, a lid on its belly, a single switch shaped for a screwdriver, dust of ages on the iron. [STYLE]"
- **slide-room** (T1) — "A cavern where a steep natural chute of glass-smooth black stone plunges downward out of sight, old claw marks at its lip, cold air rushing up. [STYLE]"

### 1.8 Region 8 — Endgame

- **stone-barrow** (T1) — "Before a massive prehistoric stone barrow in violet pre-dawn light, its huge door ajar, warm gold light seeping from the seam — the first inviting doorway in the world. [STYLE]"

### 1.9 Room → image key mapping (engine data)

Every one of the 110 source rooms maps to one key above, e.g.: FOREST-1/2/3, MOUNTAINS → `forest`/`forest-dark`; all MAZE-1..15 → `maze-a/b/c` (assigned to break up repeats); DEAD-END-1..5 → `dead-end`; EW/NS/NARROW/WINDING/DAMP → `passage`; COLD-PASSAGE → `passage-cold`; SMALL/TINY/SANDY-CAVE → `cave`; MIRROR-1/2 → `mirror-room`; RESERVOIR-S/N → `reservoir(±drained)`; RIVER-1..3 → `river-upper`; RIVER-4/5, SHORE → `river-lower`; WHITE-CLIFFS-N/S → `white-cliffs`; SQUEEKY/SMELLY → `mine-passage`; MINE-1..4 → `coal-maze-a/b`; LADDER-TOP/BOTTOM → `ladder`; LOWER-SHAFT → `drafty-room`; STRANGE-PASSAGE → `passage`; UP-A-TREE etc. bespoke as listed. The full 110-row table is generated into `game/src/data/roomArt.ts` during the build phase.

---

## 2. Event & Action Panels — `assets/events/`

3:2, 1536×1024, PNG, opaque, path `assets/events/<name>.png`.

- **mailbox-open** (T1) — First interaction most players ever make. "Extreme close-up of gloved hands opening a small red mailbox, a single folded leaflet inside catching the light, white house soft in the background. [STYLE]"
- **lamp-lit** (T1) — "A brass lantern flaring to life in cupped hands, the new sphere of warm light carving a room out of absolute darkness. [STYLE]"
- **grue-warning** (T1) — "Near-total darkness, the faintest cold outlines of a passage, and low in the black two dim slavering points that might be eyes. [STYLE]"
- **grue-death** (T1) — "Absolute darkness swallowing the frame as a dropped brass lantern falls away unlit, a suggestion of wet fangs closing from every side, nothing explicit, pure dread. [STYLE]"
- **troll-fight** (T1) — "A snarling troll mid-swing with his bloody axe, an elvish sword flashing up to parry, sparks in lantern light, dynamic diagonal action composition. [STYLE]"
- **thief-encounter** (T1) — "A gaunt sardonic man in shabby dark clothes materialized from shadow, stiletto held with unpleasant ease, large bag over his shoulder, half-bowing with mock courtesy. [STYLE]"
- **egg-opened** (T1) — "A jewel-encrusted golden egg open on hinges revealing a golden clockwork canary nested inside, ruby eye and silver beak, rendered like a reliquary unveiled. [STYLE]"
- **case-deposit** (T1) — "Gloved hands placing a glittering treasure into a battered wooden trophy case among other treasures, the glass reflecting lantern flame, quiet ceremony. [STYLE]"
- **exorcism** (T1) — "Before the ghost-choked gate of Hades: a hand ringing a brass bell, candles burning, the black book open, the spirits recoiling in streaming terror from the sound. [STYLE]"
- **boat-launch** (T1) — "A small yellow inflated boat pushing off into a black underground river, lantern at the bow, the current already pulling, the shore letting go. [STYLE]"
- **falls-death** (T1) — "A tiny yellow boat tipping over the brink of colossal underground falls into white mist, oars flying, rendered vast and final. [STYLE]"
- **flood-death** (T1) — "A cramped maintenance room fully drowned, tools and pamphlets suspended in green water, the lantern still glowing on the flooded workbench, terrible calm. [STYLE]"
- **bat-abduction** (T1) — "A huge vampire bat with wings spread wall to wall seizing the viewer, the room wheeling below as the ground drops away, motion-smeared ink. [STYLE]"
- **gas-explosion** (T1) — "The first white instant of a gas explosion in a mine chamber, light bleaching the timbers, everything drawn in that one overexposed heartbeat. [STYLE]"
- **resurrection** (T1) — "A forest floor seen from just-opened eyes, pine crowns wheeling overhead in gray-gold light, mist in shafts — being given one more chance. [STYLE]"
- **map-appears** (T1) — "Inside the glass of a full trophy case, an ancient parchment map fading into existence among the treasures, drawn in ghostly half-transparency mid-materialization. [STYLE]"
- **victory-barrow** (T1) — "Passing through the great stone door of the barrow into warm golden light, walls carved with the whole adventure's story, the silhouette of the adventurer at last seen whole, from behind, entering legend. [STYLE]"
- **window-entry** (T2) — "Climbing headfirst through a small kitchen window, curtain brushing past, the warm abandoned interior tilting into view. [STYLE]"
- **thief-steals** (T2) — "A gaunt shadow lifting a glittering jewel from the viewer's satchel with surgical delicacy, already turning away, smile like a paper cut. [STYLE]"
- **treasure-gleam** (T2) — Generic take-treasure flourish. "Gloved fingers closing around a treasure that throws prismatic lantern light between them, close-up, jubilant. [STYLE]"
- **door-slam** (T2) — "A wooden trap door slamming shut overhead from below, dust and light knifing through the closing crack, the sound almost visible. [STYLE]"
- **echo** (T2) — "An angular stone chamber ringing with visible concentric shockwaves of sound in the air, a platinum bar vibrating loose of its resonance. [STYLE]"
- **dam-button** (T2) — "A gloved thumb pressing a large yellow button on an ancient control panel, a glass bubble above flaring green with new light. [STYLE]"
- **machine-diamond** (T2) — "An iron machine's lid open, and where a heap of coal was, a huge perfect diamond blazing in the lantern beam. [STYLE]"
- **slide-ride** (T2) — "Plunging down a glass-smooth black stone chute, walls streaking past, lantern light tumbling, exhilaration and dread in equal measure. [STYLE]"
- **cyclops-odysseus** (T2) — "A giant cyclops fleeing in blind terror straight through a stone wall, masonry exploding outward, his shadow huge in the dust. [STYLE]"
- **prayer-teleport** (T2) — "Kneeling hands at a stone altar dissolving into drifting motes of gold light, the temple dark melting into forest green. [STYLE]"
- **xyzzy** (T2) — "A small empty room where a word has just been spoken, faint dissipating ripples in the air, palpable unimpressed silence. [STYLE]"
- **sword-glow** (T2) — "An elvish sword blade waking with cold blue inner light in a dark passage, runes surfacing along the fuller, warning made visible. [STYLE]"

---

## 3. Character Panels — `assets/characters/`

3:2, 1536×1024, PNG, opaque. Full-figure "introduction" panels consistent with their room appearances.

- **troll** (T1) — "A nasty pathetic troll in a scarred cavern, hide like wet stone, tusks chipped, bloody axe dragging, brutish and a little sad, lantern-lit full figure. [STYLE]"
- **thief** (T1) — "A lean sardonic gentleman burglar in worn dark clothes, stiletto in one hand, large loot bag on his shoulder, suggestion of a battered slouch hat, courteous contempt in his face, full figure emerging from cave shadow. [STYLE]"
- **cyclops** (T1) — "An enormous cyclops seated in a vaulted cavern, single vast bloodshot eye, hands like boulders, bones of past meals around him, hungry patience, low angle. [STYLE]"
- **bat** (T1) — "A giant vampire bat unfurling from a mine ceiling, wingspan filling the chamber, needle teeth bared in a shriek, jade glinting below. [STYLE]"

*(The grue has no character panel by design — darkness panels only.)*

---

## 4. Item Close-Ups — `assets/items/`

1:1, 1024×1024, PNG, opaque — each composed as a "collector's plate": the object centered on a dark vignetted stone/cloth surface in lantern light. Shared plate framing locks consistency. Prompt pattern: `"Museum-quality close-up of {object}, centered on dark worn cloth in a pool of warm lantern light, dark vignette. [STYLE]"` with `{object}` below.

**T1 (15):** brass-lantern ("a battered brass hurricane lantern, glass sooty, flame warm"), elvish-sword ("an elvish shortsword of antique make, faint blue rune-glow along the blade"), jeweled-egg ("a jewel-encrusted golden egg, filigree hinges, breathtaking craftsmanship"), clockwork-canary ("a golden clockwork canary with ruby eye and silver beak, mid-tick"), painting ("a small luminous oil painting of unparalleled beauty in a gilt frame, subject an idyllic landscape half-lost to time"), ivory-torch ("a burning ivory torch, flame steady and white-gold"), gold-coffin ("a solid gold Egyptian coffin worked with hieroglyphs, heavy beyond reason"), sceptre ("an ornamented Egyptian sceptre banded in gold and lapis, rainbow light caught in its head"), crystal-skull ("a life-size crystal skull, cold prismatic fire inside"), silver-chalice ("a graceful silver chalice, thief's fingerprints in the tarnish"), diamond ("a huge flawless diamond throwing spectral fire"), crystal-trident ("a crystal trident of drowned Atlantis, water-light rippling through it"), bell-book-candles ("a brass bell, black leather book and pair of white candles arranged as for rite"), ancient-map ("an ancient parchment map of an empire, edges alight with faint gold"), garlic-and-sack ("a brown paper sack with a clove of garlic and a hot pepper sandwich").

**T2 (8):** trunk-of-jewels, bag-of-coins, emerald-buoy ("a red river buoy split open revealing a large emerald"), scarab ("a beautiful jeweled scarab"), pot-of-gold, jade-figurine, platinum-bar, magic-boat ("a folded yellow plastic boat with hand pump").

Paths: `assets/items/<name>.png`.

---

## 5. UI & Frontispiece Assets — `assets/ui/`

- **title-screen** (T1) — 16:9 1920×1080, opaque.
  Refined prompt: "Split composition movie-poster panel: above, the boarded white farmhouse in its storm-lit field; below the grass line, the vast inverted glowing underworld of caverns, a dam, a temple and a tiny lantern light descending — one continuous scene. Leave the upper sky quiet for a title. [STYLE]"
- **logotype** (T1) — ~1600×600, **transparent** (background-removal workflow).
  Refined prompt: "Hand-inked graphic-novel logotype lettering of the single word ZORK, massive carved-stone serif letterforms with gold-leaf edge light and ink shadow, isolated on plain white background, no other text." *(Subtitle "The Great Underground Empire — Graphic Novel Edition" is set in live type, not baked in.)*
- **panel-frame** (T1) — 2048×1408, **transparent**, 9-slice.
  Refined prompt: "An empty rectangular comic panel border frame, hand-inked irregular double line with slight ink bleed and corner weight, pure white empty center and surround, black ink only, no contents."
- **input-plate** (T2) — 1600×200, **transparent**.
  Refined prompt: "A long horizontal aged-parchment caption plate with hand-inked border, empty, isolated on plain white, no text."
- **compass-rose** (T1) — 800×800, **transparent**.
  Refined prompt: "An antique brass compass rose seen flat from above, eight points, engraved and worn, isolated object on plain white background."
- **death-screen** (T1) — 16:9 1920×1080, opaque.
  Refined prompt: "A funerary panel: the brass lantern lying extinguished in darkness, a thread of smoke rising from its wick and forming a faint skull, deep black field with generous quiet space for an epitaph. [STYLE]"
- **victory-screen** (T1) — 16:9 1920×1080, opaque.
  Refined prompt: "Dawn over the white farmhouse field seen from the mouth of the glowing barrow, the whole Great Underground Empire faint beneath the earth in cutaway like a memory, triumphant and elegiac. Quiet sky for closing text. [STYLE]"
- **paper-texture** (T2) — 1024×1024 tileable, opaque: "Subtle aged paper texture, faint fiber and foxing, near-uniform pale bone tone, seamless tile, no marks."

---

## 6. Audio Plan — `assets/audio/` (not Nano Banana; per research-report §6)

All original. Loops 60–90 s seamless, OGG + M4A, ≈96 kbps, mixed ≈ -20 LUFS; SFX -14 LUFS peaks, <1.5 s.

### Music beds — `assets/audio/music/`

| File | Region | Direction | Method |
|---|---|---|---|
| `title.ogg` | Title | Music-box main theme, distant wind | Generated (media-gen music model if available) else Tone.js offline render |
| `above-ground.ogg` | 1 | Nylon guitar/flute, wind, birdsong, suspended chords | same |
| `house.ogg` | 2 | Celesta music-box miniature of theme, wood creaks | same |
| `underground.ogg` | 3 | Low drone, pitched drips, sub pulse | same |
| `maze.ogg` | 4 | Near-silence: heartbeat, air tone, skitters | Tone.js/synth (best authored by hand) |
| `temple.ogg` | 5 | Wordless choir pad, torch crackle; Hades adds dissonant overlay layer `hades-layer.ogg` | Generated + authored layer |
| `dam-river.ogg` | 6 | Turbine hum, water wash, metallic rhythm; river variant `river.ogg` flowing arps | Generated |
| `coal-mine.ogg` | 7 | Creaking timbers, distant collapse, Geiger ticks | Authored |
| `victory.ogg` | 8 | Full-voiced theme, strings + celesta, resolves | Generated |

### SFX — `assets/audio/sfx/` (all hand-authored via offline WebAudio/Node synthesis script unless noted)

`door-creak`, `window-open`, `mailbox`, `take`, `drop`, `treasure-chime`, `case-fanfare` (theme fragment), `sword-clash-1/2`, `sword-glow` (icy shimmer), `lamp-on`, `lamp-off`, `match-strike`, `magic-shimmer` (ODYSSEUS/prayer/rainbow), `water-splash`, `boat-inflate`, `dam-machinery`, `flood-rising`, `bat-screech`, `thief-snicker`, `troll-grunt`, `grue-growl` (sub rumble — also used under grue-warning panel), `death-stinger`, `hollow-voice` (XYZZY — formant synth), `slide-whoosh`, `explosion`, `bell`, `page-turn` (panel transition, very subtle, optional), `ui-click`.

### Sourcing decision per category
- Beds: generated via media-gen's music model **if** its registry offers one at Phase 5 time; otherwise scripted synthesis (both fully original). Decision recorded in `generated-asset-review.md`.
- SFX: 100% scripted synthesis (originality guaranteed, ~15 KB each).
- Nothing sampled, nothing licensed, no Infocom material.

---

## 7. Post-generation checklist (feeds `generated-asset-review.md`)

1. Anchor-set consistency review before volume generation (§0).
2. Every T1 asset present at its exact path; PNG→WebP conversion at build.
3. Transparent assets (`logotype`, `panel-frame`, `input-plate`, `compass-rose`) pass background removal cleanly — halo check on dark background.
4. Per-region palette drift check (place panels side by side).
5. Caption negative-space check (does UI overlay cover focal detail?).
6. Log regenerations + rejects in `assets/raw-generations/`.
