# Trilogy Asset Plan — Zork II and Zork III

**Phase 4 deliverable.** The complete generation plan for the expansion.
Conventions, naming, formats and the shared style block all follow
`docs/asset-plan.md`; this document does not restate them, it extends them.

**The section that matters most is §3, Variant Families.** On the Zork I build,
independently generated state variants were the single largest source of wasted
work, and the cause turned out to be mechanical: `media-gen`'s default image
model silently ignores reference images. Everything in §3 exists to make that
failure impossible to repeat.

---

## 0. Volume

| | Zork II | Zork III | Total |
|---|---|---|---|
| Base room panels | 52 | 44 | 96 |
| Room state variants (§3) | 34 | 30 | 64 |
| Event panels | 50 | 40 | 90 |
| Item panels | 30 | 20 | 50 |
| Character panels | 14 | 9 | 23 |
| UI / frontispiece | 4 | 4 | 8 |
| **Images** | **184** | **147** | **331** |
| Music beds | 8 | 7 | 15 |
| SFX | 35 | 30 | 65 |

For comparison, all of Zork I is 161 panels. This plan is roughly twice that
again, and it — not the coding — sets the calendar.

---

## 1. Conventions

### The style block

Zork I's `[STYLE]` string (`docs/asset-plan.md` §0) is superseded for the
trilogy by the block below. The look is unchanged — this is the same direction,
reworded after the v1 anchor pass sent 8 of 11 images back as artwork drawn on a
page. Use it **verbatim**:

> **[STYLE]** = "The artwork bleeds to all four edges of the image: no page, no
> paper texture, no border, no frame, no mat, no margin, no vignette edge.
> Graphic novel interior artwork in bold expressive ink linework with painterly
> gouache shading, muted earthy palette of bone, moss, rust and slate, dramatic
> single-source chiaroscuro lighting, 1980s New England woods Americana meets
> subterranean fantasy dungeon gloom, whimsical detail within ominous
> atmosphere, cinematic composition with one clear focal point and quiet
> negative space along one edge for captions. No people and no figures anywhere
> in the image. No text, no lettering, no numerals, no speech bubbles; any
> carved marks are weathered and illegible. Not photorealistic. Edge to edge,
> corner to corner, filling the entire frame."

Three deliberate differences from Zork I's block, each forced by a defect the
anchor pass produced: the full-bleed requirement leads and is restated at the
end; "panel illustration" is gone, because the word *panel* is what invited the
page; and the figure and lettering rules are stated to the model rather than
left in a document it never sees.

One palette clause is appended per game, from
`docs/trilogy-presentation-concept.md` §1:

- **Zork II:** `"palette warmed toward verdigris, brass and ember, with one saturated accent per region"`
- **Zork III:** `"palette cooled and desaturated toward ash, slate and old ivory, colour reserved for the few things that still hold it"`

Every prompt in this document is written as its `{scene}` clause only. The full
prompt at generation time is:

```
"{scene}. [STYLE] {palette clause}"
```

### Formats

Unchanged from `docs/asset-plan.md`: rooms/events/characters 3:2 at 1536×1024
PNG opaque; items 1:1 at 1024×1024; title/death/victory 16:9 at 1920×1080; UI
overlays transparent via luminance keying. Masters land in
`assets/{rooms,events,characters,items,ui}/` with a `z2-` / `z3-` filename
prefix, and convert to delivery WebP with the existing
`game/scripts/convert-assets.py`.

### Standing rules (carried forward, non-negotiable)

- **Player-as-camera.** The adventurer appears only as gloved hands, a
  lamp-bearing forearm, or a cloaked back-of-shoulder at the frame edge. Never a
  face. This caught a `river-upper` regeneration on the Zork I run, and a Zork II
  anchor that came back with two visible adventurers in the Ice Room.
  **A cast shadow is not a figure.** Owner ruling, 2026-09-04, on the Bank of
  Zork depository anchor: the curtain of light throwing a human shadow across
  the vault wall reads as the player's own and stays. Do not regenerate a panel
  to remove a cast shadow, and do not extend this to a body, a face or a
  reflection.
- **No figures in room panels**, stated in the prompt rather than left implied.
  A rule that lives only in a document is a rule the model never sees.
- **No text, lettering or speech bubbles.** Anything the model paints that looks
  like writing is stylised gibberish and must never carry information.
- **Quiet negative space** along one edge for captions.
- **Full-bleed, and say it first.** No borders baked into the art; the frame is
  a UI overlay. The v1 style block opened with *"Graphic novel panel
  illustration"* and 8 of 11 Zork II anchors came back as artwork drawn on a
  page — a cream sheet with an inked border, or a pale or dark band down one
  edge. The word "panel" invites it. The block now opens with the full-bleed
  requirement and repeats it at the end; "panel illustration" is gone in favour
  of "interior artwork".
- Raw and rejected generations stay in the media-gen output folders with their
  `prompt.md` provenance.

### Sequencing (decided 2026-09-04)

Generation is **split by game**: Zork II's assets are produced now, Zork II is
built and shipped, and Zork III's plan is revisited with what that build taught
us before its ~147 images are generated. Zork I's variant states — the
trophy-case tiers, the flooding maintenance room — were discovered during the
build, not during planning; generating Zork III's art from a read-only
enumeration would repeat the mistake this plan exists to prevent.

### What the Zork II anchor pass cost, for budgeting

11 delivered anchors took 26 generations — **2.4 per panel**, not 1:1. Two
lessons for the volume runs:

- **Prose does not stop the page border.** Naming it ("no border, no frame, no
  margin") made it *worse*: 8 of 11 in v1, then 5 of 8 after the block was
  rewritten to forbid it three ways. Trim programmatically and stop fighting it.
  Budget one extra generation per panel for scene misses only.
- **Reword twice, then change tactic.** The Ice Room and Volcano Bottom each
  missed three times on increasingly explicit prose and landed immediately once
  the prompt led with the *camera* and gave the scene one unambiguous anchor
  (the ice as the far wall floor-to-ceiling; a bright opening far overhead that
  makes a shaft read as a shaft). A fourth rewording is a signal the noun is
  wrong, not the adjectives.

Trim losses are real: 0% on five panels, 23-47% on the rest. Every delivered
anchor still exceeds the 1536px delivery width, so nothing is upscaled.

### Generation order

1. **Per-game anchors** — the game's title screen plus one establishing panel
   per region, text-to-image. Stop, compare against the Zork I set and against
   the palette clause, regenerate until locked. Do not proceed to volume.
2. **Base room panels**, text-to-image, with the anchors as style references.
3. **Variant families**, §3's chained-edit protocol, one family at a time.
4. Events, characters, items, UI.

---

## 2. Panel catalogue

Region ids match `docs/trilogy-region-design.md`. Rooms sharing a panel are
listed together. Save path is `assets/rooms/z2-<name>.png` unless noted.

### Zork II — base room panels (52)

| Panel | Rooms | Scene |
|---|---|---|
| `inside-barrow` | INSIDE-BARROW | An ancient earthen barrow chamber, a narrow tunnel opening at its southern end with a faint glow far down it, an elvish sword and a familiar brass lantern lying on the packed floor |
| `narrow-tunnel` | NARROW-TUNNEL | A low limestone tunnel opening ahead into a wide dim cavern, walls close enough to touch on both sides |
| `foot-bridge` | FOOT-BRIDGE | A rope-and-plank footbridge over a deep ravine, a thin stream glinting far below, phosphorescent moss on the high cavern ceiling |
| `great-cavern` | GREAT-CAVERN | A vast cavern dimly lit by phosphorescent moss clinging to its high ceiling, a deep ravine winding through the floor |
| `cavern-stream` | SHALLOW-FORD, DARK-TUNNEL, STREAM-PATH | A shallow stream running over pale stone through a cavern passage, the water the brightest thing in frame |
| `marble-hall` | MARBLE-HALL | A hall of veined white marble, too finished for a cave, columns disappearing into gloom |
| `deep-ford` | DEEP-FORD | A deep ford where the stream runs waist-high and fast between crumbling banks |
| `ravine-ledge` | RAVINE-LEDGE | A narrow ledge partway down a ravine wall, the stream loud below, handholds worn smooth |
| `ledge-tunnel` | LEDGE-TUNNEL | The end of a ledge where it opens into a tunnel mouth, scorch marks around the opening |
| `carousel-room` | CAROUSEL-ROOM | A large circular room, eight identical passages leaving it, the high ceiling lost in gloom, brass fittings the only warm colour |
| `room-8` | ROOM-8 | A small dead-end chamber, a large numeral crudely chiselled on one wall |
| `cool-room` | COOL-ROOM | A cool dry chamber with a draught from the west carrying a smell of ice |
| `menhir-room` | MENHIR-ROOM | An old limestone quarry chamber, rough-hewn and finished blocks lying helter-skelter, one enormous standing stone upright among them |
| `kennel` | KENNEL | A low fouled chamber with gnawed bones and a heavy chain bolted to the wall |
| `stairway` | STAIRWAY-TOP, COBWEBBY-CORRIDOR | A cobwebbed stair descending into dark, dust thick on every tread |
| `riddle-room` | RIDDLE-ROOM | A small chamber whose east wall is a blank stone door, an inscription carved above it |
| `pearl-room` | PEARL-ROOM | A modest chamber, a string of pearls lying incongruously on bare rock |
| `well-bottom` | WELL-BOTTOM | The bottom of a circular stone well shaft, a bucket hanging on a rope, damp walls curving up out of sight |
| `formal-garden` | FORMAL-GARDEN | A formal walled garden underground, gravel paths and clipped hedges under an impossible warm light with no sun |
| `garden-north` | GARDEN-NORTH | The north end of a formal garden, a white gazebo visible through an arch |
| `topiary` | TOPIARY-ROOM | A topiary garden of animals cut from hedge, each one poised as though it had just stopped moving |
| `gazebo` | GAZEBO-ROOM | Inside a white wooden gazebo, a chest on the floor and a sleeping figure on a bench |
| `dragon-room` | DRAGON-ROOM | A high stone chamber with a bridge to the south, deep claw scoring on the floor |
| `dragon-lair` | DRAGON-LAIR | A dragon's lair heaped with bones and a little dull treasure, the great scorched hollow where the dragon lies |
| `stone-bridge` | STONE-BRIDGE | A single-span stone bridge over blackness, lava glow from one end and ice-blue from the other |
| `ice-room` | GLACIER-ROOM | A large hall of ancient lava worn smooth, a wall of blue-white glacier ice filling the western end |
| `lava-room` | LAVA-ROOM | A chamber of cooled black lava, still warm, an orange glow leaking from below |
| `lava-tube` | LAVA-TUBE | A steep tube of smooth volcanic rock climbing over a jumble of fallen rocks |
| `volcano-bottom` | VOLCANO-BOTTOM | The floor of a vast volcanic shaft, walls rising out of sight, lit from below by dull orange |
| `volcano-view` | VOLCANO-VIEW | A viewing ledge high in a volcanic shaft, the far wall lost in heat haze |
| `narrow-ledge` | LEDGE-1 | A narrow ledge on a volcano wall with a doorway behind it, nothing but air in front |
| `wide-ledge` | LEDGE-2 | A wide ledge on a volcano wall, room to stand back from the drop, a doorway south |
| `library` | LIBRARY | A small stone library, purple and other books on a single shelf, dust in the up-light |
| `dusty-room` | SAFE-ROOM | A featureless dusty room with a rusty iron box embedded in the far wall |
| `balloon-flight` | VAIR-1..4 | The inside rim of a volcanic shaft seen from a wicker basket in flight, cloth bag overhead, wall sliding past |
| `bank-entrance` | BANK-ENTRANCE | An institutional stone entrance hall with two doorways flanking a fresco |
| `fresco-room` | FRESCO-ROOM | A stone room dominated by a faded fresco of a chest being carried by figures in procession |
| `tellers-room` | TELLER-EAST, TELLER-WEST | A bank teller's room in pale stone, a counter and a barred window, everything symmetrical |
| `viewing-room` | VIEWING-EAST, VIEWING-WEST | A small viewing room with a bench and a blank stone wall where a window should be |
| `depository` | DEPOSITORY | A vaulted stone depository, bare, one wall glowing faintly with a curtain of white light |
| `chairmans-office` | OFFICE | A panelled office deep in stone, a portrait and a heavy desk, entirely out of place underground |
| `small-room` | SMALL-ROOM | A featureless small stone cell with no visible door |
| `vault` | VAULT | A sealed vault of dressed stone, stacks of bills mouldering in the corner |
| `tiny-room` | TINY-ROOM | A tiny bare room with a door far too large for it |
| `dreary-room` | DREARY-ROOM | A dreary room, a stone table at its centre with a lidded recess |
| `posts-room` | POSTS-ROOM | A room full of wooden posts driven into a floor of dried mud |
| `pool-room` | POOL-ROOM | A shallow pool of clear liquid filling most of a small chamber, tear-bright |
| `tea-room` | TEA-ROOM | A room laid for tea at three different scales at once, cakes on a table under too-bright light |
| `top-of-well` | WELL-TOP | The top of a stone well, a bucket on a rope, a low ceiling close overhead |
| `low-room` | MAGNET-ROOM | A low room with many exits and a faint metallic hum, iron dust drawn into lines on the floor |
| `machine-room` | MACHINE-ROOM, CAGE-ROOM | A cramped machine room of levers and dials, a steel cage in one corner |
| `in-cage` | IN-CAGE | The inside of a steel cage, bars filling the frame, the room beyond out of focus |
| `cerberus-room` | CERBERUS-ROOM | A vaulted chamber with a heavy door east, deep scratches around it at three different heights |
| `crypt-anteroom` | CRYPT-ANTEROOM | A cold anteroom with an iron door south and a bench of carved stone |
| `crypt` | CRYPT-ROOM | A crypt containing twelve somewhat flattened heads mounted on poles, writing carved into the stone |
| `oddly-angled-room` | DIAMOND-1..9 | A room whose walls meet at angles that are subtly wrong, a low mound of earth at its centre |
| `landing` | ZORK3 | A landing at the head of a rough-hewn staircase descending into darkness, magical runes drawn on the stone and swept with green light |
| `guarded-room` | GUARDIAN-ROOM | A cobwebby room, tracks in the dust, a stained and very strong-looking door at the south end |
| `wizards-workshop` | WIZARDS-WORKSHOP | A wizard's workshop, benches of glassware and half-finished apparatus, everything faintly luminous |
| `wizards-workroom` | WORKBENCH-ROOM | A workbench covered in magical runes and instruments, a wand rack half empty |
| `pentagram-room` | PENTAGRAM-ROOM | A bare room with a pentagram inlaid in the floor in some pale metal |
| `trophy-room` | TROPHY-ROOM | A trophy room of curiosities in cases, a heavy display case dominating one wall |
| `aquarium-room` | AQUARIUM-ROOM | A room with a vast glass aquarium set into one wall, something large moving behind the glass |
| `murky-room` | IN-AQUARIUM | Inside a murky aquarium looking out through green glass at a distorted room |
| `wizards-quarters` | WIZARDS-QUARTERS | A wizard's private quarters, unmade bed and scattered notes, personal and slightly sad |
| `mist-room` | DEAD-PALANTIR-1..4 | A room filled entirely with drifting coloured mist, no walls visible, one dim shape at the centre |

### Zork III — base room panels (44)

Save path `assets/rooms/z3-<name>.png`.

| Panel | Rooms | Scene |
|---|---|---|
| `endless-stair` | ZORK2-STAIR | The bottom of a stair winding upward beyond sight, an eerie light coming from all around casting shadows with no source, a brass lantern at your feet |
| `junction` | JUNCTION | A bare rock junction where four passages meet, every one of them grey |
| `creepy-crawl` | CREEPY-CRAWL, TIGHT-SQUEEZE | A low crawlway of raw rock, the ceiling forcing a stoop |
| `crystal-grotto` | ROCKY-ROOM | A grotto whose walls carry a dull crystalline sheen that refuses to sparkle |
| `barren-area` | CLEARING | A barren open area of grey scree under a rock sky, nothing growing |
| `hairpin-loop` | SLOPE | A hairpin turn on a descending path of loose stone |
| `land-of-shadow` | SHADOW-1..8 | A featureless grey land with no horizon and no shadow anywhere, the flatness itself the threat |
| `foggy-room` | FOGGY-ROOM | A chamber filled with still grey fog, the walls only guessed at |
| `cliff` | CLIFF | A remarkable oasis: a gaping hole two hundred feet up pouring bright sunshine down onto giant trees grown from seedlings, a sheer precipice west, a crumbling stone wall south |
| `cliff-ledge` | CLIFF-LEDGE | A narrow ledge fifty feet down a cliff face, rope hanging past, jagged rocks below |
| `cliff-base` | CLIFF-BASE | The jagged rocks at a cliff base, sea beyond, the sun shaft far above |
| `flathead-ocean` | FLATHEAD-OCEAN | A cold grey sea meeting a rock shore, rocks and waves and nothing else |
| `lake-shore` | LAKE-SHORE | The shore of an underground lake, still dark water under a rock ceiling |
| `aqueduct-view` | AQ-VIEW | A vantage over an aqueduct channel cut into rock, the lake behind |
| `on-the-lake` | ON-LAKE | On the water of an underground lake in a small boat, reflected light moving on the ceiling |
| `underwater` | IN-LAKE | Underwater in a dark lake, light dimming above, everything blue-black |
| `western-shore` | FAR-SHORE | A far shore of pale stone, a low opening leading south |
| `scenic-vista` | VIEW-ROOM | A small carved chamber, a table labelled with a featureless angled surface mounted on the wall, an indicator above it |
| `southern-shore` | SOUTH-SHORE | A southern lake shore of dark sand, the water flat and silent |
| `dark-place` | DARK-1, DARK-2 | Near-total darkness with the faintest suggestion of a slope and a wall |
| `key-room` | KEY-ROOM | A small chamber with a grating in the floor and a single key on the stone |
| `aqueduct` | AQ-1, AQ-2, AQ-3 | A dry stone aqueduct channel, smooth-worn and steeply pitched |
| `damp-passage` | DAMP-PASSAGE | A wide damp room with two nearly identical passages and a channel descending into it |
| `dead-end` | DEAD-END | A dead end of raw rock, the passage simply stopping |
| `great-door` | MUSEUM-ANTE | The south end of a monumental hall, a tremendous iron door rusted shut in the east wall |
| `royal-hall` | WIDE-HALL | A monumental hall of dressed stone, proportions built for something larger than a person |
| `museum-entrance` | MUSEUM-ENTRANCE (+ MID-MUSEUM-ENTRANCE, OLD-MUSEUM-ENTRANCE as era variants, §5.1) | An entrance hall with a grand iron door west and ornate stone and wooden doors east and north, a few wide steps south |
| `technology-museum` | TECH-MUSEUM (+ MID-TECH-MUSEUM, OLD-TECH-MUSEUM, §5.1) | A museum of the Empire's technology, machines under dust sheets on plinths |
| `jewel-room` | JEWEL-ROOM (+ MID-JEWEL-ROOM, OLD-JEWEL-ROOM, §5.1) | A jewel collection room, empty cases and one occupied plinth under a cone of light |
| `royal-puzzle-entrance` | CP-ANTE (+ MID-CP-ANTE, §5.1) | The top of a few wide steps leading down into a square opening in the floor |
| `side-room` | CP-OUT (+ MID-CP-OUT, §5.1) | A narrow room lit from above, steps up to the north and a metal door east |
| `royal-puzzle-interior` | CP | Inside a puzzle of sandstone and marble slabs taller than a person, hard light straight down from a circular opening in the ceiling |
| `engravings-room` | MSTAIRS | A room whose north wall is ornately carved with strange runes and writing in an unfamiliar language |
| `button-room` | MR-ANTE | A small chamber with a single large button set into the wall |
| `beam-room` | MREYE | A chamber crossed by a single hairline beam of white light, the only bright thing |
| `inside-mirror` | IN-MIRROR | Inside a wooden contraption the size of a room, panels and a short pole, mirrors on two faces |
| `mirror-hallway` | MRA, MRB, MRC, MRD, MRG | A hallway of dressed stone with a heavy wooden structure standing in it on rails |
| `mirror-narrow-room` | MRAE/W, MRBE/W, MRCE/W, MRDE/W, MRGE/W | A narrow room beside a hallway, a wooden wall filling one side |
| `dungeon-entrance` | FRONT-DOOR | A dungeon entrance in dressed stone, a bronze door set deep in the wall |
| `narrow-corridor` | BEHIND-DOOR, NORTH-CORRIDOR, SOUTH-CORRIDOR, EAST-CORRIDOR, WEST-CORRIDOR | A narrow torch-lit corridor of dressed stone, institutional and even |
| `parapet` | PARAPET | A parapet overlooking a row of cells far below, a dial and a lever set into the rail |
| `prison-cell` | CELL, PRISON-CELL, GOOD-CELL | A bare prison cell, a barred door and nothing else |
| `treasury-of-zork` | NIRVANA | A treasury heaped with the wealth of an empire, warm light after a whole game of grey |
| `timber-room` | TIMBER-ROOM | A passage cluttered with broken timbers, an extremely narrow opening at the end |
| `room-8` | ROOM-8 | A tiny room with rough walls, a crude numeral chiselled on one wall, the only exit a blur |
| `sacrificial-altar` | ZORK-IV | The interior of a huge temple rudely built of basalt blocks, flickering torches over an altar still wet with blood |

The disconnected mine pocket (`LADDER-TOP`, `LADDER-BOTTOM`, `LOWER-SHAFT`,
`MACHINE-ROOM`, `DEAD-END-5`) is unreachable and unseen; no panels.

---

## 3. Variant Families

**A variant is never generated. It is derived.**

### 3.1 Why this section exists

On the Zork I build the Living Room's eight illustrated states were first
generated independently from fresh text prompts. The elvish sword's angle above
the mantel and the nailed west door's carving drifted between them — visible to
any player walking in and out of the same room. It took three regeneration
passes to fix, and the fix was always the same: derive each state from the
locked base image as an image-to-image edit.

The mechanical cause is worth stating plainly, because it is invisible:

> `media-gen`'s default image model `nano-banana-pro` is **text-to-image only
> and silently ignores `--input-image`**. Its registry entry says so:
> *"TEXT-TO-IMAGE ONLY, silently ignores image_urls."* Passing a reference to it
> does nothing at all, and you get back an independently generated panel that
> looks plausible in isolation and wrong in sequence.

Reference-driven generation requires `--model nano-banana-pro-edit`
(`fal-ai/nano-banana-pro/edit`), which honours `image_urls`.

### 3.2 The protocol

```bash
python ~/.claude/skills/media-gen/scripts/generate.py image \
  --prompt "<change instruction against the reference>" \
  --title "<family>-<state>" \
  --model nano-banana-pro-edit \
  --input-image "<path to the immediately preceding state>"
```

Six rules:

1. **`--model nano-banana-pro-edit` is required.** Without it the reference is
   ignored and you have reproduced the Zork I failure exactly.
2. **Reference the immediately preceding state in the chain, not always the
   base.** Chaining along an axis is what stops step-to-step drift accumulating
   into a visible jump.
3. **Two-reference edits only for combinatorial states**, with `--input-image`
   repeated. Never more than two — beyond that the references fight.
4. **Every edit prompt ends with a full-bleed instruction.** The edit model
   echoes any baked border in the reference as a white page-margin band; this
   hit 5 of the first 7 anchor images on the Zork I run. Keep the batch driver's
   white-band detection with up to two retries.
5. **Prompts are change instructions, not scene descriptions.** The test: *a
   variant prompt that could stand alone as a text-to-image prompt is wrong by
   construction.*
6. **One family at a time, reviewed before the next.** A bad base propagates
   through its whole chain.

### 3.3 The review gate

Before moving to the next family:

- Assemble the family's panels side by side at delivery size and check every
  variant against the base for **every item on its invariant manifest**. Any
  drift is a rejection — regenerate that edge from its parent, never from a
  fresh prompt.
- Step through the family in the order a *player* encounters the states. A
  player toggling one flag should see exactly one thing change.
- Run the automated scans the Zork I build learned to need: white page-margin
  band detection with retries, interior white-patch scan, flat dark-bar edge
  detection with programmatic trimming.

### 3.4 How a family is specified

Every family below gives:

- **Base** — the canonical state everything derives from: the one the player
  sees first and most often.
- **Invariants** — what must be identical across every member, written
  concretely enough to check: camera position and framing, focal length, time of
  day, primary light source and direction, and every fixed prop with its
  position and angle. Anything not listed is free to change; anything listed
  that drifts is a rejection.
- **Axes** — each independent thing that can change, with its values in the
  order the player meets them.
- **Chain** — the ordered derivation graph. Where axes are orthogonal the
  chaining order is fixed and stated.
- **Edit prompts** — one per edge.

---

## 4. Zork II variant families (20 families, 34 variants)

### 4.1 `ice-room` — the glacier

- **Base:** `z2-ice-room` (glacier intact).
- **Gate:** `ICE-MELTED`.
- **Invariants:** camera at floor level looking west down the hall; the smooth
  worn lava floor filling the lower third; the large east passage behind the
  viewer's right shoulder; the jumble of fallen rocks with the lava tube above
  it at frame right, its topmost rock a flat slab angled up-left; ceiling height
  and the two dark ceiling seams; lantern light from behind the camera, warm,
  falling off by the far wall.
- **Axis:** glacier — `intact` → `melted`.
- **Chain:** `ice-room` → `ice-room-melted`.
- **Edit:** *"The same hall from the identical camera in the reference image.
  The wall of blue-white glacier ice at the western end is gone, replaced by a
  damp scorched passage leading west, still partly full of drifting steam; a
  dark wet stain spreads across the floor where the ice stood. Everything else —
  the lava floor, the fallen rocks, the lava tube, the ceiling seams, the
  lantern light and its direction — is unchanged. Full-bleed, no border, no
  white margin."*

### 4.2 `dusty-room` — the safe

- **Base:** `z2-dusty-room` (box chipped, unopened).
- **Gate:** `SAFE-FLAG`.
- **Invariants:** camera square-on to the far wall from the room's centre; the
  rusty iron box embedded in the far wall at chest height, slightly left of
  centre; the room otherwise featureless; the north exit as a dark rectangle at
  frame right; even dust-filtered light from above, no visible source.
- **Axis:** safe — `chipped` → `blown`.
- **Chain:** `dusty-room` → `dusty-room-blown`.
- **Edit:** *"The same dusty room from the identical camera in the reference
  image. The rusty box's door has been blown off and lies twisted on the floor
  below it; the box's interior is now open and dark, and soot streaks the wall
  around it. Everything else — the box's position and size, the featureless
  walls, the north exit, the dust in the light — is unchanged. Full-bleed, no
  border, no white margin."*

### 4.3 `menhir-room` — the standing stone

- **Base:** `z2-menhir-room` (menhir upright).
- **Gate:** `MENHIR-POSITION` (also visible from `KENNEL`).
- **Invariants:** camera from the north entrance looking south down the quarry
  floor; the scatter of rough-hewn and finished limestone blocks and their
  positions; the south passage mouth at frame centre-left; the quarry face at
  frame right; lantern light from the camera, raking left to right.
- **Axis:** menhir — `upright` → `tilted` → `moved aside`.
- **Chain:** `menhir-room` → `menhir-room-tilted` → `menhir-room-moved`.
- **Edits:**
  - *"The same quarry chamber from the identical camera in the reference image.
    The single tall standing stone now leans markedly to one side, its base
    lifted clear of the floor on one edge and a shallow gouge dragged in the
    dust behind it. Everything else — the scattered limestone blocks and their
    positions, the south passage, the quarry face, the raking lantern light — is
    unchanged. Full-bleed, no border, no white margin."*
  - *"The same quarry chamber from the identical camera in the reference image.
    The leaning standing stone has been moved fully aside and now rests against
    the quarry face at frame right, clearing the south passage completely; a
    broad drag-mark crosses the dust where it travelled. Everything else is
    unchanged. Full-bleed, no border, no white margin."*

### 4.4 `carousel-room` — spinning and stopped

- **Base:** `z2-carousel-room` (spinning).
- **Gate:** `CAROUSEL-FLIP-FLAG`.
- **Invariants:** camera at standing height at the room's centre-north, the
  circular wall curving away on both sides; **all eight passage mouths visible
  and identical**, evenly spaced, their arch profile and brass surrounds; the
  ceiling lost in gloom above; lantern pool on the floor beneath the camera.
- **Axis:** carousel — `spinning` → `stopped`.
- **Chain:** `carousel-room` → `carousel-room-stopped`.
- **Edit:** *"The same circular room from the identical camera in the reference
  image. The motion blur and the drifting dust that suggested the room was
  turning are gone; everything is sharp and dead still, and the dust has
  settled into a thin even layer on the floor. Everything else — the eight
  identical passage mouths and their spacing, the brass surrounds, the gloom
  overhead, the lantern pool — is unchanged. Full-bleed, no border, no white
  margin."*

### 4.5 `crypt` — a three-axis family

- **Base:** `z2-crypt` (lit, door closed, secret door hidden).
- **Gates:** `CRYPT-LIT?`, `CRYPT-DOOR` open, `DIM-DOOR` visible.
- **Invariants:** camera from the north door looking south; twelve poles in
  their exact spacing across the chamber with the flattened heads at their
  fixed heights and angles; the carved writing panel on the east wall; the
  south wall's stone courses; torch bracket at frame left.
- **Axes, chained in this order:**
  1. door — `closed` → `open`
  2. secret door — `hidden` → `revealed`
  3. light — `lit` → `dark` (dark is a treatment of whichever state precedes it)
- **Chain:**
  `crypt` → `crypt-door-open` → `crypt-door-open-dim` → `crypt-dark`
  (`crypt-dark` derives from `crypt`, not from the dim state).
- **Edits:**
  - *"…the iron door in the north wall now stands open on darkness beyond…"*
  - *"…low on the south wall, the dim outline of a secret door is now visible
    among the stone courses, a single carved letter on it…"*
  - *"…the torch is out; the chamber is nearly black, the poles and heads only
    suggested by the faintest edge light, no other change…"*

### 4.6 `guarded-room` — the lizard

- **Base:** `z2-guarded-room` (lizard alert, door closed).
- **Gates:** `GUARDIAN-FED`, `WIZ-DOOR` open, candy carried.
- **Invariants:** camera from the north corridor looking south at the door; the
  door's position, its stains and iron banding; the lizard head embedded at
  head height slightly right of the door's centre; cobwebs in the upper
  corners; tracks in the dust leading to the door.
- **Axes:** lizard — `alert` → `sniffing` → `sleepy`; door — `closed` → `open`.
  Chaining order: lizard first, then door.
- **Chain:** `guarded-room` → `guarded-room-sniffing` → `guarded-room-sleepy`
  → `guarded-room-sleepy-open`.
- **Combinatorial:** `guarded-room-alert-open` is a two-reference edit from
  `guarded-room` and `guarded-room-sleepy-open`.

### 4.7 `oddly-angled-room` — the diamond

- **Base:** `z2-oddly-angled-room`.
- **Gates:** `DIAMOND-BASE`, `DIAMOND-COUNT`.
- **Invariants:** everything. The joke of the region is that all nine rooms are
  identical; the variants change only the low mound of earth at the centre and
  the wrongness of the wall angles.
- **Axis:** progress — `0` → `1` → `2` → `3` → `home`.
- **Chain:** strictly linear; each state adds one more scuffed base-path mark
  around the mound.

### 4.8 `dragon-lair` — with and without the dragon

- **Base:** `z2-dragon-lair` (dragon present).
- **Invariants:** camera from the south entrance; the bone heap's silhouette and
  the dull treasure scattered through it; the scorched hollow's shape; the
  ceiling's fire-blackened dome; light from the entrance behind the camera.
- **Axis:** occupant — `dragon` → `empty` → `princess`.
- **Chain:** `dragon-lair` → `dragon-lair-empty` → `dragon-lair-princess`.

### 4.9 `garden` — topiary, unicorn, princess

- **Bases:** `z2-topiary`, `z2-formal-garden`, `z2-gazebo`.
- **Gates:** `TOPIARY-MOVED`, `UNICORN-FRIGHTENED`, `PRINCESS-AWAKE`.
- **Invariants (topiary):** camera from the west path; each hedge animal's
  species, size and position; the gravel path's line; the sourceless warm light
  with no shadow — *this one especially*, because a shadow appearing in one
  variant would break the region's whole conceit.
- **Chains:** `topiary` → `topiary-moved`; `formal-garden` →
  `formal-garden-unicorn` → `formal-garden-unicorn-fled`; `gazebo` →
  `gazebo-princess-awake`.

### 4.10 `balloon` — the craft itself

Not a room family: a **prop family**, and the most demanding one in Zork II,
because the balloon appears inside four room panels and three event panels and
must be the same craft in all of them.

- **Base:** `z2-items/balloon` — the item plate. Generated first, and it is the
  reference for every room panel the balloon appears in, not the other way
  round.
- **Invariants:** the wicker basket's weave and proportions; the cloth bag's
  patch pattern and colour; the receptacle's shape and its position in the
  basket; the wire's gauge and where it is tied.
- **Axes:** altitude — `grounded` → `rising` → `hovering` → `descending`;
  condition — `intact` → `burning` → `deflated`.
- **Chain:** the item plate seeds `balloon-flight`, which seeds the three
  altitude framings; `condition` branches off `grounded`.
- **Rule:** any panel containing the balloon passes the item plate as a second
  reference.

### 4.11 `bank` — the curtain of light

- **Base:** `z2-depository`.
- **Gates:** `SCOL-ROOMS`, `SCOL-ACTIVE`.
- **Invariants:** the vaulted ceiling's rib spacing; the four walls' identical
  dressed stone; the floor's flag pattern; **no light source other than the
  curtain**.
- **Axis:** which wall carries the curtain — `north` / `south` / `east` /
  `west` / `none`.
- **Chain:** `depository` (none) → `depository-curtain-north`, then rotate:
  each subsequent wall derives from the previous curtain state, so the curtain's
  own rendering stays identical while its position moves.

### 4.12 The remaining Zork II families

Same protocol, stated compactly. Each gives base → variants, the gate, and the
one invariant most likely to drift.

| Family | Gate | Chain | Watch |
|---|---|---|---|
| `aquarium-room` | `AQ-FLAG` | `aquarium-room` → `aquarium-room-broken` | The glass wall's frame and the room's proportions; only the glass and the flood change |
| `pool-room` | `BUCKET-TOP-FLAG`, `EVAPORATED`, `MUD-FLAG` | `pool-room` → `pool-room-drained` → `pool-room-muddy` | The pool's outline in the floor stays identical as the liquid leaves it |
| `dreary-room` | `PUNLOCK-FLAG`, `PLOOK-FLAG` | `dreary-room` → `dreary-room-unlocked` → `dreary-room-lid-lifted` | The stone table's height, angle and the recess's exact shape |
| `machine-room` | `CAGE-SOLVE-FLAG` | `machine-room` → `machine-room-cage-open` | Every lever and dial in the same position; only the cage door moves |
| `cerberus-room` | `CERBERUS-LEASHED`, `GUARDIAN-FED` | `cerberus-room` → `cerberus-room-collared` → `cerberus-room-calm` | The three sets of claw scores at their three heights |
| `low-room` | `CAROUSEL-ZOOM-FLAG`, `COMPASS-KLUDGE` | `low-room` → `low-room-quiet` | The iron dust lines on the floor are the only thing that may change |
| `wizards-quarters` | `WIZQDESCS`, `WIZQLAST` | `wizards-quarters` → three dressing variants | The bed, desk and window positions; only the scattered notes and objects change |
| `wizards-workshop` | wizard present | `wizards-workshop` → `wizards-workshop-wizard` | Bench contents and the apparatus' silhouette |
| `depository` | `BANK-SOLVE-FLAG` | see §4.11 | — |

---

## 5. Zork III variant families (15 families, 30 variants)

### 5.1 `museum` — three eras, three rooms

The purest and largest variant family in the trilogy: the same five places in
three centuries, gated by `YEAR`.

- **Bases:** `z3-museum-entrance`, `z3-technology-museum`, `z3-jewel-room`
  (each in the **present**, which is where the player starts).
- **Invariants per room:** camera position and framing; the architecture — every
  door, arch, step and plinth in its exact position and proportion; the room's
  geometry. *Only the state of the building and its contents may change.*
- **Axis:** era — `past` ← `present` → `future`. The player travels backwards
  first, so the chain runs backwards from the present.
- **Chain:**
  `museum-entrance` → `museum-entrance-mid` → `museum-entrance-old`, and
  separately `museum-entrance` → `museum-entrance-future`.
  Same shape for `technology-museum` and `jewel-room`.
- **Edits:**
  - *to `mid`:* *"The same museum entrance hall from the identical camera in the
    reference image, some decades earlier: the dust and decay are gone, the
    wooden door north is sound and freshly finished, the stone is clean and the
    lamps are lit. Every door, arch and step stays in exactly the same position
    and proportion. Full-bleed, no border, no white margin."*
  - *to `old`:* *"…earlier still, at the museum's height: the hall is bright and
    kept, banners hang, the floor is polished. Same camera, same architecture,
    every door and step in the same place…"*
  - *to `future`:* *"…the cleft in the rock to the left of the great iron door
    has filled in with rubble; more debris has fallen from the ceiling. Same
    camera, same architecture…"*
- **Note:** the `OLD-*` rooms additionally carry `GUARDS-PRESENT` /
  `HEAR-VOICES` / `RING-STOLEN`. Those are **event panels**, not room variants —
  the room does not change, the people in it do.

### 5.2 `great-door` — the earthquake

- **Base:** `z3-great-door` (intact).
- **Gate:** `CLEFT-FLAG`.
- **Invariants:** camera from the north end of the hall looking south-east; the
  iron door's position, size, rust pattern and rivet lines; the hall's column
  spacing; the flat dust-lit greyness.
- **Axis:** `intact` → `cleft`.
- **Chain:** `great-door` → `great-door-cleft`.
- **Edit:** *"The same monumental hall from the identical camera in the
  reference image, after an earthquake: the floor is strewn with fallen debris,
  and to the right of the great iron door a gaping cleft has opened in the rock
  with a cleared area visible behind it. The iron door itself is unchanged — same
  position, same rust, same rivets — as are the columns and their spacing.
  Full-bleed, no border, no white margin."*

### 5.3 `scenic-vista` — one frame, four views

- **Base:** `z3-scenic-vista` (the chamber, indicator reading I).
- **Gate:** `ACTIVE-VIEW` 1–4.
- **Invariants:** the chamber; the table's mounting, angle and label plate; the
  indicator's position. **The four views are inset panels rendered inside the
  table's surface**, so the frame is the invariant and the view is the axis.
- **Chain:** the chamber panel is generated once. The four views are the
  existing/new panels `z3-timber-room`, `z3-room-8`, `z3-damp-passage`,
  `z3-sacrificial-altar`, each derived as a **two-reference edit** from the
  target room's own panel and the vista chamber, so each view carries the
  table's perspective and edge falloff.

### 5.4 `cliff` — rope, chest and man

The most stateful family in Zork III: three rooms whose states are coupled.

- **Bases:** `z3-cliff`, `z3-cliff-ledge`, `z3-cliff-base`.
- **Gates:** `ROPE-FLAG`, `CHEST-TIED`, `CHEST-OPENED`, `MAN-SEEN`,
  `MAN-FLAG`, `MAN-GONE`.
- **Invariants (cliff):** the sun shaft's exact angle and where it lands; the
  giant trees' positions and canopy shapes; the crumbling south wall and its
  jagged south-west opening; the precipice edge's line.
- **Axes:** rope — `absent` → `tied to the rail`; chest — `absent` → `at the
  top` → `opened`.
- **Chain:** `cliff` → `cliff-rope` → `cliff-rope-chest` →
  `cliff-rope-chest-open`.
- **Ledge invariants:** the ledge's width and the rope's hanging line must match
  `cliff-rope` exactly — this is a **two-reference edit** from `cliff-ledge` and
  `cliff-rope`.
- **Man axis:** `absent` → `waiting` → `hauling` → `gone`, chained on the ledge.

### 5.5 `land-of-shadow` — the figure

- **Base:** `z3-land-of-shadow` (empty).
- **Gates:** `SHADOW-GONE`, `ATTACK-MODE`.
- **Invariants:** the flat grey ground meeting a flat grey sky with **no
  horizon line and no shadow anywhere**. This is the family where the invariant
  is an absence, and the edit model will want to add a horizon; the prompt must
  forbid it every time.
- **Axis:** figure — `absent` → `present` → `wounded` → `gone`.
- **Chain:** linear. The figure enters at mid-distance and closes one step per
  state; its hood, blade and posture are the props that must not drift.

### 5.6 `mirror-box` — the contraption

- **Base:** `z3-inside-mirror`.
- **Gates:** `MDIR`, `MLOC`, `POLEUP-FLAG`, `WOOD-OPEN-FLAG`,
  `MIRROR-OPEN-FLAG`.
- **Decision:** **the box gets one interior panel and one exterior panel, and
  its state is carried by the schematic component, not by art.** Illustrating
  five positions × two facings × pole × panels would be twenty near-identical
  panels that a player could not tell apart, which is precisely the failure the
  schematic exists to prevent (`docs/trilogy-presentation-concept.md` §4.2).
- **The two variants that *are* worth drawing:** the mirror panel open vs.
  closed (`WOOD-OPEN-FLAG`), because that one is a physical change the player
  makes with their hands.
- **Chain:** `inside-mirror` → `inside-mirror-panel-open`.

### 5.7 `royal-puzzle` — the door and the interior

- **Bases:** `z3-side-room`, `z3-royal-puzzle-interior`.
- **Gate:** `CP-FLAG`.
- **Axis:** east side of the side room — `metal door` → `open passage`.
- **Chain:** `side-room` → `side-room-passage`.
- **Note:** the puzzle interior has exactly **one** panel. Every other piece of
  its state lives in the slate diagram component.

### 5.8 `engravings-room` — the secret door

- **Base:** `z3-engravings-room` (runes only).
- **Gates:** `SECRET-DOOR` invisible / visible / open, `OLD-MAN-GONE`.
- **Invariants:** the north wall's rune carving — **every glyph in the same
  place**, since the door's outline emerges from among them; the two passage
  mouths south-west and south-east; the flat even light.
- **Axis:** door — `hidden` → `outlined` → `open`.
- **Chain:** linear. The outline edit must not redraw the runes; state that
  explicitly in the prompt.

### 5.9 `flathead-ocean` — the ship

- **Base:** `z3-flathead-ocean` (empty sea).
- **Gates:** `BOAT-SEEN`, `SHIP-GONE`.
- **Invariants:** the shoreline rocks' silhouette; the horizon's height in
  frame; the sea's tone and wave scale.
- **Axis:** `empty` → `ship on the horizon` → `empty again`. The third state is
  **not** a re-use of the first: the sea is calmer and the light lower, and it
  is chained off the ship state so the difference is deliberate.

### 5.10 `aqueduct` and `key-room`

- `aqueduct` → `aqueduct-running` (`AQ-FLAG`): the same channel with water in
  it. Invariants: the channel's pitch and the stone's worn profile.
- `key-room` → `key-room-uncovered` (`COVER-MOVED`): the grating exposed.
  Invariants: the chamber, the key's position on the stone.

### 5.11 The remaining Zork III families

| Family | Gate | Chain | Watch |
|---|---|---|---|
| `dungeon-entrance` | `DM-SEEN`, `BRONZE-DOOR-LOCKED` | `dungeon-entrance` → `dungeon-entrance-open` | The bronze door's boss pattern and its depth in the wall |
| `mirror-hallway` (guardians) | `GUARDIANS-SEEN`, `GUARDSTR` | `mirror-hallway` → `mirror-hallway-guardians` | The rails' spacing and the box's position; the guardians are added, nothing is moved |
| `prison-cell` | `LCELL` | `prison-cell` → `prison-cell-occupied` | The bars' spacing and the door's hinge side |
| `parapet` | `PNUMB` | `parapet` → four dial settings | The rail, the dial's face and the view down; only the pointer moves |
| `on-the-lake` | `LAKE-POINT` | `on-the-lake` → `on-the-lake-far` | The ceiling's reflected-light pattern is the same water, later |

### 5.12 State that is deliberately not art

Listed so nobody generates a panel for it by mistake. All of it is carried by
the engine, the text, or a component:

- **Royal Puzzle position and grid** (`CPHERE`, `CPTABLE`, `CPWALLS`,
  `CPPUSH-FLAG`, `CP-MOVED`) — the slate diagram component.
- **Mirror-box position, facing and beam** (`MLOC`, `MDIR`, `POLEUP-FLAG`,
  `BEAM-BREAKER`, `MIRROR-OPEN-FLAG`) — the schematic component.
- **Invisibility** (`INVIS`) — a panel treatment, not a panel.
- **Combat state** (`S-STRENGTH`, `P-STRENGTH`, `ATTACK-MODE`, `P-HITS`) —
  event panels and text.
- **The Fantasize spell** (`SPELL?` = 12) — a log-text treatment.
- **The Dungeon Master following** (`FOLFLAG`, `IN-DUNGEON`) — he is drawn in
  the event panels, not composited into every room.
- **Oddly-angled Room progress** (`DIAMOND-COUNT`, `DIAMOND-SOLVE`) — §4.7
  covers the four panels; the count itself is text.
- **Timers and counters** (`LAST-MOVES`, `LAKE-TIME`, `PRCOUNT`) — never art.

---

## 6. Event, character, item and UI panels

### Zork II events (50)

Deaths (Zork II has 44 distinct `JIGS-UP` calls; 18 get their own panel, the
rest reuse a death treatment): volcano fall, balloon burn, glacier collapse,
dragon fire, Cerberus, the demon, the wizard's float expiring over water,
drowning in the bucket, the chomper, the gnome's bomb, crushed by the menhir,
the bank curtain, the aquarium, the serpent, the guardians, the pentagram, the
riddle door, the carousel.

Set-pieces: the Wizard appears; the Wizard casts (one panel, tinted per spell);
the Wizard fumbles; the Wizard vanishes; the wand taken; the dragon led to the
glacier; the glacier melts; the unicorn collared; the princess wakes; the
gazebo chest opened; Cerberus collared; the safe blown; the balloon launched;
the balloon lands; the robot lifts the cage; the cake eaten; the palantir
vision; the demon summoned; the wizard's case filled; the pentagram entered;
victory at the Landing.

### Zork III events (40)

Deaths (19): the shadow's blade, the cliff fall, drowning in the lake, the
grue den, the Royal Puzzle sealed, the guardians, the earthquake, the ocean,
the endgame's wrong choice, and the rest as treatments.

Set-pieces: the hooded figure appears; the fight; breaking off the fight; the
figure's hood falls; the man on the ledge; the chest hauled up; the earthquake;
the cleft opens; the time machine fires (one panel per era transition); the
ring taken; the guards arrive; the beam sighted; the guardians pass an invisible
player; the Dungeon Master appears; the Dungeon Master obeys; the door opens;
the Treasury.

### Characters

Zork II (14): the Wizard of Frobozz, the dragon, the princess, the unicorn,
Cerberus, the demon, the gnome of Zurich, the volcano gnome, the robot, the
serpent, the genie, the guardians, the lizard head, the chomper.

Zork III (9): the hooded figure, the old man, the man on the ledge, the Dungeon
Master, the stone guardians, the guards of the past, Lord Dimwit Flathead
(heard, never seen — **no panel**; the empty throne instead), the grue (two
eye-points only), the prisoner.

### Items

Zork II (30): the wand, the balloon (see §4.10), the brick and fuse, the candy,
the collar, the coconut, the crown, the flask, the lantern, the letter opener,
the match, the palantir, the pearls, the portrait, the purple book, the ruby,
the sphere ×3, the statue, the stradivarius, the tin, the violin, the wrench,
the zorkmid coin, the cake ×4, the robot, the key.

Zork III (20): the lamp, the sword, the lance, the hood, the cloak, the ring,
the chest, the amulet, the book, the bread, the cage key, the grue repellent,
the hunk of vitreous slag, the lore book, the pole, the rope, the staff, the
torch, the viewing table, the sequence card.

### UI (8)

Per game: a title screen, a death/restart screen, a victory screen, and a
logotype. Zork III's victory screen is the Treasury of Zork; Zork II's is the
Landing, composed to lead the eye down the stair — it is also the hand-off
frame into Zork III.

---

## 7. Audio

Method unchanged: `game/scripts/synth-audio.py`, pure numpy DSP with the fixed
seed, `afconvert` to AAC. Nothing licensed, nothing sampled.

**Zork II beds (8):** barrow, carousel, garden, dragon/glacier, volcano, bank,
wonderland, wizard. **Zork III beds (7):** stair, shadow, cliff, lake, museum,
mirror, endgame — plus the Royal Puzzle's deliberate silence, which is a bed of
nothing and needs no file.

**The trilogy title theme** is one piece in three arrangements
(`docs/trilogy-presentation-concept.md` §6): full for Zork I, reharmonised and
brighter for Zork II, reduced to a single line for Zork III, resolving only in
the Treasury.

**SFX:** ~35 for Zork II (the wand, each spell's onset, the balloon burner, the
carousel stopping, the glacier melting, the safe's explosion, Cerberus, the
robot, the chomper, the curtain of light) and ~30 for Zork III (the shadow's
blade, the earthquake, the time machine, the beam, stone on stone for each
puzzle push, the bronze door, the dial, the low bell for each point of
potential).
