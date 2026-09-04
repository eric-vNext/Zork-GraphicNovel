# Trilogy Research — Zork II and Zork III

**Phase 1 deliverable.** Game-design and presentation research for the trilogy
expansion. The architectural findings are already established in
`docs/trilogy-expansion-brief.md` and are not repeated here; this document adds
what the brief deliberately left out.

Every number below was counted from the vendored sources (`reference/zork2-source`,
`reference/zork3-source`) or from the extracted world data
(`game/src/data/zorkN/world.gen.json`), not estimated.

---

## 1. Inventory, measured

| | Zork I | Zork II | Zork III |
|---|---|---|---|
| Rooms | 110 | 86 | 89 |
| Objects (incl. 18 shared `gglobals`) | 140 | 165 | 139 |
| Action routines | 190 | 189 | 219 |
| Game-specific ZIL lines | 6,837 | 6,772 | 6,358 |
| Daemons / interrupts | 16 | 23 | 24 |
| Objects with `VALUE` | 23 | 22 | 1 |
| `ACTORBIT` characters | 7 | 14 | 9 |
| Distinct `JIGS-UP` deaths | 22 | 44 | 19 |
| Max score | 350 | 400 | 7 ("potential") |
| Start room | `WEST-OF-HOUSE` | `INSIDE-BARROW` | `ZORK2-STAIR` ("Endless Stair") |

### Exit shapes — where the difficulty actually sits

| | exits | routine-computed (`PER`) | door-gated | flag-gated | refusal message only |
|---|---|---|---|---|---|
| Zork I | 352 | 7 | 6 | 25 | 37 |
| Zork II | 219 | 11 | 12 | 13 | 21 |
| Zork III | 356 | **73** | 31 | 8 | 49 |

Zork III computes **73 of its 356 exits in code** — ten times Zork I's seven.
Almost all of them belong to the mirror box (`MRGO`, `MIRIN`, `MIROUT`) and the
Royal Puzzle (`CPEXIT`). That single number is the best summary of why Zork III
is the harder engineering job: a third of its map does not exist as data at all.

---

## 2. Region groupings

Derived from the extracted exit graph. Both games are one large connected
component plus small pockets reached only by teleport, vehicle or puzzle.

### Zork II — 86 rooms, 70 in the main component

| Region | Rooms |
|---|---|
| **Barrow & Great Cavern** | `INSIDE-BARROW` `NARROW-TUNNEL` `FOOT-BRIDGE` `GREAT-CAVERN` `SHALLOW-FORD` `DARK-TUNNEL` `STREAM-PATH` `MARBLE-HALL` `DEEP-FORD` `RAVINE-LEDGE` `LEDGE-TUNNEL` |
| **Carousel hub** | `CAROUSEL-ROOM` `ROOM-8` `COOL-ROOM` `MENHIR-ROOM` `KENNEL` `STAIRWAY-TOP` `COBWEBBY-CORRIDOR` `RIDDLE-ROOM` `PEARL-ROOM` `WELL-BOTTOM` |
| **Garden & unicorn** | `FORMAL-GARDEN` `GARDEN-NORTH` `TOPIARY-ROOM` `GAZEBO-ROOM` |
| **Dragon & Glacier** | `DRAGON-ROOM` `DRAGON-LAIR` `STONE-BRIDGE` `GLACIER-ROOM` `LAVA-ROOM` `LAVA-TUBE` |
| **Volcano** | `VOLCANO-BOTTOM` `VOLCANO-VIEW` `LEDGE-1` `LEDGE-2` `LIBRARY` `SAFE-ROOM` + the balloon airspace `VAIR-1..4` |
| **Bank of Zork** | `BANK-ENTRANCE` `FRESCO-ROOM` `TELLER-EAST` `TELLER-WEST` `VIEWING-EAST` `VIEWING-WEST` `DEPOSITORY` `OFFICE` `SMALL-ROOM` `VAULT` |
| **Wonderland** | `TINY-ROOM` `DREARY-ROOM` `POSTS-ROOM` `POOL-ROOM` `TEA-ROOM` `WELL-TOP` `MAGNET-ROOM` `MACHINE-ROOM` `CAGE-ROOM` `IN-CAGE` |
| **Tomb, Cerberus & the Oddly-angled Room** | `CERBERUS-ROOM` `CRYPT-ANTEROOM` `CRYPT-ROOM` `ZORK3` `DIAMOND-1..9` |
| **Wizard's demesne** | `GUARDIAN-ROOM` `WIZARDS-WORKSHOP` `WORKBENCH-ROOM` `PENTAGRAM-ROOM` `TROPHY-ROOM` `AQUARIUM-ROOM` `IN-AQUARIUM` `WIZARDS-QUARTERS` |
| **Palantir visions** | `DEAD-PALANTIR-1..4` (Red / Blue / White / Black Mist) |

`ZORK3` ("Landing") is the hand-off room: `ZORK3-FCN` ends the game there and
announces that the adventure concludes in Zork III.

### Zork III — 89 rooms, 69 in the main component

| Region | Rooms |
|---|---|
| **Endless Stair & Junction** | `ZORK2-STAIR` `JUNCTION` `CREEPY-CRAWL` `TIGHT-SQUEEZE` `ROCKY-ROOM` `CLEARING` `SLOPE` |
| **Land of Shadow** | `SHADOW-1..8` `FOGGY-ROOM` |
| **Cliff & Flathead Ocean** | `CLIFF` `CLIFF-LEDGE` `CLIFF-BASE` `FLATHEAD-OCEAN` |
| **Lake, aqueduct & Scenic Vista** | `LAKE-SHORE` `AQ-VIEW` `ON-LAKE` `IN-LAKE` `FAR-SHORE` `VIEW-ROOM` `SOUTH-SHORE` `DARK-1` `DARK-2` `KEY-ROOM` `AQ-1..3` `DAMP-PASSAGE` `DEAD-END` |
| **Great Door & Royal Hall** | `MUSEUM-ANTE` `WIDE-HALL` |
| **Museum (three eras)** | `MUSEUM-ENTRANCE` `TECH-MUSEUM` `JEWEL-ROOM`, plus `MID-*` and `OLD-*` |
| **Royal Puzzle** | `CP-ANTE` `CP-OUT` `CP` (+ `MID-CP-ANTE` `MID-CP-OUT`) |
| **Mirror Box** | `MSTAIRS` `MR-ANTE` `MREYE` `IN-MIRROR` `MRA/MRB/MRC/MRD/MRG` each with `E`/`W` narrow rooms, `FRONT-DOOR` |
| **Dungeon endgame** | `BEHIND-DOOR` `NORTH-/SOUTH-/EAST-/WEST-CORRIDOR` `PARAPET` `CELL` `PRISON-CELL` `GOOD-CELL` `NIRVANA` |
| **Vista targets** (seen, never entered) | `TIMBER-ROOM` `ROOM-8` `DAMP-PASSAGE` `ZORK-IV` and the disconnected mine pocket `LADDER-TOP/BOTTOM` `LOWER-SHAFT` `MACHINE-ROOM` `DEAD-END-5` |

---

## 3. The five subsystems with no Zork I analogue

### 3.1 The Royal Puzzle — `3actions.zil` 170–600

A 4×8 grid of blocks the player walks *inside*, pushing sandstone slabs to open
a path. State lives in three parallel vectors: `CPTABLE` (what occupies each
cell), `CPOBJS` (objects lying in cells), `CPWALLS`/`CPEXITS` (which walls carry
ladders and where the room's real exits are). `CPHERE` is the player's cell.

- `CPEXIT` resolves every compass move (`CP`'s nine exits are all `PER CPEXIT`).
- `CPWALL-OBJECT` performs a push: the pushed slab moves one cell, the player
  follows, and a slab pushed against a wall or another slab refuses.
- `CPWHERE` redraws a fixed-font 3×3 map of the player's neighbourhood **every
  turn**: `<FIXED-FONT-ON>`, then three rows built from `CP-CORNER` / `CP-ORTHO`
  with the glyphs `MM` (marble/immovable), `SS` (sandstone/pushable), `??`
  (unknown diagonal) and `..` (you).
- Special cells: cell 1 has the ceiling opening, cell 22 a depressed floor,
  cell 33 the steel door and its card slot. Cells with `-2`/`-3` walls carry
  the east and west ladders.
- The puzzle is **losable**: `CPBLOCK-FLAG` records that the player has sealed
  themselves in, and `CP-MOVED` gates the shared library's `V-WALK` arm.

*Implication for us:* this cannot be a panel. It needs a bespoke component.
See `docs/trilogy-presentation-concept.md` §4.

### 3.2 The Mirror Box — `3actions.zil` 600–1500

A room-sized contraption the player rides along a north–south corridor. Its
sub-graph is five hallway rooms (`MRD` `MRG` `MRC` `MRB` `MRA`, north to south)
each paired with `E`/`W` "narrow rooms", plus `IN-MIRROR`, `MR-ANTE` and
`MREYE`. Three independent axes:

- **Position** — `MLOC` names which hallway the box currently occupies.
- **Facing** — `MDIR` and `POLEUP-FLAG`: the short pole raises to lock the box,
  and pushing the mirror rotates it, swapping which side is east and which west.
- **Beam** — `BEAM-FUNCTION`, `BEAM-BREAKER`, `MIRROR-OPEN-FLAG`,
  `WOOD-OPEN-FLAG`: a beam of light sighted through the box's channels, which
  the player must break or pass at the right moment.

`GUARDIANS` gates `MRG`/`MRGE`/`MRGW` on `INVIS`: the stone guardians destroy
anyone not made invisible by the beam. `MRGO`, `MIRIN` and `MIROUT` compute
every movement, which is where most of Zork III's 73 `PER` exits live.

### 3.3 The Wizard of Frobozz — `2actions.zil` ~3455–3708

`I-WIZARD` re-queues itself every 4 turns and may appear and cast one of
**twelve** spells (`<CONSTANT SPELLS 12>`). The Zork II arms of the shared
library exist because several of them rewrite core verb behaviour for a
duration — this is a cross-cutting effect layer, not a room puzzle:

| Spell | Effect while active |
|---|---|
| Feeble | `LOAD-ALLOWED` drops; restored on expiry |
| Fumble | `FUMBLE-NUMBER`/`FUMBLE-PROB` inject random drops into `ITAKE` |
| Fear | the player flees the Wizard's room |
| Filch | touching an object teleports it into the wizard's case (`RIPOFF`) |
| Freeze | movement blocked entirely |
| Fall | — |
| Ferment | drunken movement |
| Fierce | `SWORD-GLOW` overridden |
| Float | gravity suspended; expiry over a `NONLANDBIT` room is **fatal** |
| Fireproof | — |
| Fence | — |
| Fantasize | `PRINT-CONT` hallucinates objects into room listings at 20% |

`SPELL-HINTS` and `SPELL-STOPS` are the onset and expiry messages. Only six of
the twelve have either, which is itself a design fact: half the spells are meant
to be noticed by their effect, not announced.

The player later takes the wand and casts spells themselves through
`V-INCANT` → `V-ENCHANT`, with `V-DISENCHANT` to undo them.

**Our engine already has the layer** (`game/src/engine/spells.ts`) with the
shared-library hooks wired; Phase 6 fills in the per-spell effects.

### 3.4 The Bank of Zork — `2actions.zil` 1310–2172

The curtain-of-light vault. `SCOL-ROOMS` / `SCOL-WALLS` / `SCOL-ROOM` /
`SCOL-ACTIVE` track which wall the player last entered through; walking into a
wall (`SCOL-GO`, `SCOL-THROUGH`) relocates them accordingly, and `I-CURTAIN`
runs the curtain itself. `BKLEAVEE` / `BKLEAVEW` are `PER` exits out of the
`DEPOSITORY`. The shared `V-THROUGH` has a Zork II arm purely for this puzzle.

Its failure modes are not reachable by a linear walkthrough, so it needs its own
test suite (Phase 6).

### 3.5 Vehicles, followers, time

- **Balloon** (II) — `BALLOON-FCN` / `I-BALLOON` / `RISE-AND-SHINE` /
  `DECLINE-AND-FALL` / `BALLOON-BURN` / `PUT-BALLOON`, ~230 lines. Altitude is
  the four `VAIR-*` rooms; `BALLOON-UPS` / `BALLOON-FLOATS` / `BALLOON-DOWNS`
  are the ascent, hover and descent message tables. Failure states: the
  receptacle burning out (`I-BURNUP`), the cloth bag (`BINF-FLAG`), the wire
  (`BTIE-FLAG`), and landing on the wrong ledge.
- **Oddly-Angled Room** (II) — `DIAMOND-MOTION` remaps movement onto a baseball
  diamond; `DIAMOND-BASE`, `DIAMOND-COUNT`, `DIAMOND-MOVES` and `DIDIRS` track
  the runner's progress, and `DIAMOND-SOLVE` opens the way when the circuit is
  completed.
- **Dungeon Master** (III) — `DUNGEON-MASTER-F` / `MASTER-F` / `DMISH` /
  `I-FOLIN`. He follows the player (`FOLFLAG`) and obeys typed orders
  (`DM, GO NORTH`), refusing to enter the prison cell. Our parser supports actor
  commands via `ACTORBIT` but has never exercised that path.
- **Scenic Vista** (III) — `VIEW-ROOM-F` reads `ACTIVE-VIEW` (1–4) and prints
  the matching entry of `VIEWS`, with `VIEW-ROMANS` giving the indicator
  numeral. The four targets are `TIMBER-ROOM`, `ROOM-8`, `DAMP-PASSAGE` and
  `ZORK-IV`. `I-VIEW-CHANGE` cycles it every 4 turns; `I-VIEW-SNAP` freezes it.
- **The shadow** (III) — `SHADOW-ROOMS` over `SHADOW-1..8`, with `P-STRENGTH`,
  `S-STRENGTH`, `ATTACK-MODE`, `P-HITS`/`S-HITS` and `SHADOW-GONE`. A fight the
  player is meant to *lose* correctly.

---

## 4. Room-state variants — the exhaustive list

This is the input to the variant families in `docs/trilogy-asset-plan.md`. It
was derived mechanically: every room whose `ACTION` routine reads a global, plus
the object-presence changes that alter what a panel should show.

**A variant discovered during the build is a variant generated out of chain.**
If something is missing from this list, add it here first.

### Zork II

| Room(s) | Gate | What changes |
|---|---|---|
| `GLACIER-ROOM` | `ICE-MELTED` | Glacier intact → melted, a scorched steam-filled passage opens west |
| `SAFE-ROOM` | `SAFE-FLAG` | Rusty box with a chipped oblong hole → door blown off |
| `MENHIR-ROOM` | `MENHIR-POSITION` | The standing stone upright / tilted / moved aside (also visible from `KENNEL`) |
| `CAROUSEL-ROOM` | `CAROUSEL-FLIP-FLAG` | Spinning, loud, disorienting → stopped and silent |
| `MAGNET-ROOM` | `CAROUSEL-ZOOM-FLAG`, `COMPASS-KLUDGE` | Machine room state; the low room's exits change |
| `CRYPT-ROOM` | `CRYPT-LIT?`, `CRYPT-DOOR` open, `DIM-DOOR` visible | Lit/dark, door open/closed, the secret "F" door revealed |
| `GUARDIAN-ROOM` | `GUARDIAN-FED`, `WIZ-DOOR` open, candy carried | Lizard head alert / sniffing at you / sleepy; door open |
| `DEPOSITORY` + bank rooms | `SCOL-ROOMS`, `SCOL-ACTIVE`, `BANK-SOLVE-FLAG` | Which wall is a curtain of light |
| `DIAMOND-1..9` | `DIAMOND-BASE`, `DIAMOND-COUNT`, `DIAMOND-SOLVE` | The room's apparent orientation as the circuit advances |
| `IN-CAGE` | `CAGE-SOLVE-FLAG` | The cage before and after the robot frees it |
| `WIZARDS-QUARTERS` | `WIZQDESCS`, `WIZQLAST` | A rotating set of quarters descriptions |
| `DRAGON-ROOM` / `DRAGON-LAIR` | dragon present, `DRAGON-ANGER` | Lair with the dragon / after he leaves / with the princess |
| `FORMAL-GARDEN` `TOPIARY-ROOM` `GARDEN-NORTH` | `TOPIARY-MOVED`, `TOPIARY-NEAR`, `UNICORN-FRIGHTENED`, `PRINCESS-AWAKE` | Topiary animals moved; unicorn present/fled; princess asleep/awake |
| `CERBERUS-ROOM` | `CERBERUS-LEASHED`, `GUARDIAN-FED` | Cerberus chained / collared / calmed |
| `POSTS-ROOM` `POOL-ROOM` | `BUCKET-TOP-FLAG`, `EVAPORATED`, `MUD-FLAG` | The pool full / drained / muddy |
| `TINY-ROOM` `DREARY-ROOM` | `PUNLOCK-FLAG`, `PLOOK-FLAG` | Palantir lid locked / unlocked / lifted |
| `AQUARIUM-ROOM` / `IN-AQUARIUM` | `AQ-FLAG` | Aquarium sealed / broken open |
| `VOLCANO-BOTTOM` `LEDGE-1` `LEDGE-2` `VAIR-1..4` | balloon altitude, `BINF-FLAG`, `BTIE-FLAG` | The balloon on the ground / rising / hovering / burning, seen from each ledge |
| `WIZARDS-WORKSHOP` `PENTAGRAM-ROOM` | `WIZ-DOOR-FLAG`, wizard present | The workshop with and without the Wizard |
| Any room | `SPELL?` = Fantasize | An hallucinated object in the listing (presentation-level, not a panel) |

### Zork III

| Room(s) | Gate | What changes |
|---|---|---|
| `MUSEUM-ENTRANCE` `TECH-MUSEUM` `JEWEL-ROOM` `CP-ANTE` `CP-OUT` | `YEAR` — **three eras** (`OLD-*` past, `MID-*` middle, present) | The same five places in three different centuries, with their own room objects |
| `MUSEUM-ANTE` | `CLEFT-FLAG` | Monumental hall intact → full of earthquake debris with a gaping cleft |
| `MUSEUM-ENTRANCE` | `YEAR` vs `YEAR-PRESENT` | The cleft absent (past) / open (present) / filled with rubble (future) |
| `OLD-*` museum rooms | `GUARDS-PRESENT`, `HEAR-VOICES`, `FLATHEAD-HEARD`, `RING-STOLEN` | Guards present / voices approaching / the ring gone |
| `CP-OUT` | `CP-FLAG` | A metal door east → an open passage east |
| `CP` | `CPPUSH-FLAG`, `CPHERE`, `CPTABLE` | The live puzzle grid — a component, not a panel |
| `MSTAIRS` | `SECRET-DOOR` open/invisible, `OLD-MAN-GONE`, `OLD-MAN-FED` | Runes only / door outline visible / door open; the old man present or gone |
| `CLIFF` | `ROPE-FLAG`, `CHEST-TIED`, `CHEST-OPENED` | Rope tied to the rail or not; the chest at the top, opened, or gone |
| `CLIFF-LEDGE` | `MAN-SEEN`, `MAN-FLAG`, `MAN-GONE`, `MAN-POINT`, `CHEST-TIED` | The hooded man absent / waiting / hauling / gone |
| `CLIFF-BASE` | `CHEST-TIED` | The chest on the rocks or not |
| `FLATHEAD-OCEAN` | `BOAT-SEEN`, `SHIP-GONE` | Empty sea / a ship on the horizon / the ship gone |
| `SHADOW-1..8` | `SHADOW-GONE`, `ATTACK-MODE`, `S-STRENGTH` | The hooded figure present, fighting, or gone |
| `VIEW-ROOM` | `ACTIVE-VIEW` (I / II / III / IV) | One frame, four different places seen through it |
| `ON-LAKE` / `IN-LAKE` | `LAKE-POINT`, `INVIS`, `LAST-MOVES` | On the water / underwater / invisible |
| `AQ-2` `AQ-3` | `AQ-FLAG` | The aqueduct dry or running |
| `KEY-ROOM` | `COVER-MOVED` | Grating covered / uncovered |
| `IN-MIRROR` | `MDIR`, `MLOC`, `POLEUP-FLAG`, `WOOD-OPEN-FLAG`, `MIRROR-OPEN-FLAG` | The box's facing, position, pole and panel state |
| `MRG` `MRGE` `MRGW` | `INVIS`, `GUARDIANS-SEEN`, `GUARDSTR` | The stone guardians watching / ignoring an invisible player |
| `FRONT-DOOR` / `BEHIND-DOOR` | `DM-SEEN`, `BRONZE-DOOR-LOCKED` | The Dungeon Master's door before and after he appears |
| `CELL` `SOUTH-CORRIDOR` | `LCELL` | Which cell the prisoner mechanism has connected |
| `PARAPET` | `PNUMB` | The dial setting shown on the parapet |
| `NORTH-CORRIDOR` etc. | `DM-SEEN`, `IN-DUNGEON`, `FOLFLAG` | With and without the Dungeon Master following |

**Counts for the asset plan:** 20 Zork II variant families and 22 Zork III
families, before combinatorial states.

---

## 5. The trilogy as one product

- **Cross-game hand-off is in the source.** Zork II's `ZORK3-FCN` ends the game
  by announcing that "the ultimate adventure concludes in *Zork III: The
  Dungeon Master*", and Zork III's `GO` opens with a dream of tumbling down the
  staircase you just descended. The two texts are written to join; the
  presentation should honour that rather than dropping the player on a menu.
- **Zork III's opening already assumes Zork II.** Its start room is literally
  named `ZORK2-STAIR`, and the lamp is "your old friend, the brass lantern".
- **Save slots** are namespaced per game (`zorkN:slot`, shipped in Phase 0), so
  a player can keep three saves in each game and move between them.
- **Asset weight.** Zork I ships 161 panels at 31 MB of WebP; the projection is
  ~305 more, landing near 90 MB in total. The service worker currently
  precaches everything, which will not survive that. Per-game cache buckets with
  the other two games fetched on demand is a Phase 9 item, and so is code-
  splitting the world data — registering Zork II and III already grew the
  bundle from 499 kB to 621 kB because all three worlds are statically imported.
- **One region vocabulary.** `Region` is now a per-game string rather than a
  fixed union, so each game names its own regions and music beds without
  colliding.

---

## 6. Open questions for the design phases

1. Does the mirror box get illustrated panels *and* a schematic, or only a
   schematic? (Decided in the asset plan, §"Variant families".)
2. Zork III has one treasure. What replaces the trophy-case museum inset as the
   player's sense of progress? (Presentation concept §5.)
3. The three museum eras are the same five rooms three times. Do they share one
   base panel with era treatments, or are they three separate families? They
   share a family with `YEAR` as the axis — that is what the chained-edit
   protocol is for.
