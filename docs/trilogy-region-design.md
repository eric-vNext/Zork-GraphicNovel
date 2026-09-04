# Trilogy Region & Room Design

**Phase 3 deliverable.** The natural regions of Zork II and Zork III, taken from
the source geography — nothing invented. Room lists and node maps are generated
from the extracted world data (`game/src/data/zorkN/world.gen.json`), so they
match the ZIL exactly.

Every one of Zork II's 86 rooms and Zork III's 89 rooms belongs to exactly one
region below. Node-map notation: `n->ROOM` is a plain exit, `[region]` marks a
crossing into another region, and `n~ROUTINE` is an exit the game computes in
code rather than storing as data.

Art direction per region sits inside the game's palette from
`docs/trilogy-presentation-concept.md` §1; the shared style block never changes.

---

# Zork II: The Wizard of Frobozz

10 regions, 86 rooms.

## Barrow & Great Cavern

**11 rooms** · region id `barrow`

- **Mood.** Homecoming turned wrong. You step out of Zork I's victory and the barrow keeps going down.
- **Light.** Cold blue-grey daylight leaking from behind, failing within three rooms; then lantern.
- **Accent.** Phosphorescent moss green on wet limestone.
- **Bespoke panels.** Inside the Barrow, Narrow Tunnel, Foot Bridge, Great Cavern, Deep Ford, Ledge in Ravine, End of Ledge
- **Shared / variant panels.** Shallow Ford / Dark Tunnel / Path Near Stream share one 'cavern stream' panel with dressing changes; Marble Hall bespoke.
- **Puzzles.** None — this is the on-ramp. The ravine and the foot bridge teach that Zork II's caverns are vertical.
- **NPCs & hazards.** The Wizard's first appearance usually lands here.
- **Music.** A low bowed drone with a single descending figure — the Zork I barrow theme, slowed and pitched down a fourth.
- **Transitions.** Entering from the title: hold the barrow panel through the whole prologue. Leaving south into the carousel hub crossfades over the foot bridge.

```
  INSIDE-BARROW [Inside the Barrow]
    s->NARROW-TUNNEL
  NARROW-TUNNEL [Narrow Tunnel]
    n->INSIDE-BARROW, s->FOOT-BRIDGE, cross->FOOT-BRIDGE
  FOOT-BRIDGE [Foot Bridge]
    n->NARROW-TUNNEL, s->GREAT-CAVERN
  GREAT-CAVERN [Great Cavern]
    ne->FOOT-BRIDGE, sw->SHALLOW-FORD
  SHALLOW-FORD [Shallow Ford]
    n->GREAT-CAVERN, s->DARK-TUNNEL, cross->DARK-TUNNEL
  DARK-TUNNEL [Dark Tunnel]
    ne->SHALLOW-FORD, se->GARDEN-NORTH [garden], sw->STREAM-PATH
  STREAM-PATH [Path Near Stream]
    e->FORMAL-GARDEN [garden], ne->DARK-TUNNEL, sw->CAROUSEL-ROOM [carousel], w->MARBLE-HALL
  MARBLE-HALL [Marble Hall]
    e->STREAM-PATH, n->DEEP-FORD, s->CAROUSEL-ROOM [carousel]
  DEEP-FORD [Deep Ford]
    n->RAVINE-LEDGE, u->RAVINE-LEDGE, s->MARBLE-HALL
  RAVINE-LEDGE [Ledge in Ravine]
    u->TINY-ROOM [wonderland], s->DEEP-FORD, w->LEDGE-TUNNEL, d->DEEP-FORD
  LEDGE-TUNNEL [End of Ledge]
    e->RAVINE-LEDGE, in->DRAGON-ROOM [dragon], n->DRAGON-ROOM [dragon]
```

## Carousel Hub

**10 rooms** · region id `carousel`

- **Mood.** Eight identical doors and a machine you cannot see. The game's compass rose, deliberately broken.
- **Light.** Gloom overhead, lantern pool below, the ceiling never resolved.
- **Accent.** Brass — the only warm thing in the room.
- **Bespoke panels.** Carousel Room (spinning and stopped), Room 8, Menhir Room, Riddle Room, Circular Room, Top of Well
- **Shared / variant panels.** Kennel / Cobwebby Corridor / Stairway share a 'dressed passage' panel.
- **Puzzles.** The carousel itself (CAROUSEL-FLIP-FLAG), the menhir (MENHIR-POSITION), the riddle door, the well.
- **NPCs & hazards.** The gnome of Zurich waits at the bottom of the well.
- **Music.** A slow waltz on detuned bells that stops dead when the carousel does — the one bed with a diegetic reason to change.
- **Transitions.** Every exit from the Carousel Room is a hard cut with no directional slide: the room has stolen the player's sense of direction and the presentation should not give it back.

```
  CAROUSEL-ROOM [Carousel Room]
    n->MARBLE-HALL [barrow], ne->STREAM-PATH [barrow], e->TOPIARY-ROOM [garden], se->RIDDLE-ROOM, s->MENHIR-ROOM, sw->COBWEBBY-CORRIDOR, w->ROOM-8, nw->COOL-ROOM
  ROOM-8 [Room 8]
    e->CAROUSEL-ROOM
  COOL-ROOM [Cool Room]
    se->CAROUSEL-ROOM, n->STONE-BRIDGE [dragon], w->GLACIER-ROOM [dragon], cross->STONE-BRIDGE [dragon]
  MENHIR-ROOM [Menhir Room]
    n->CAROUSEL-ROOM, sw->KENNEL, s->STAIRWAY-TOP
  KENNEL [Kennel]
    ne->MENHIR-ROOM, out->MENHIR-ROOM
  STAIRWAY-TOP [Stairway]
    d->DIAMOND-5 [tomb], n->MENHIR-ROOM
  COBWEBBY-CORRIDOR [Cobwebby Corridor]
    in->LAVA-TUBE [dragon], u->LAVA-TUBE [dragon], n->LAVA-TUBE [dragon], ne->CAROUSEL-ROOM, sw->GUARDIAN-ROOM [wizard], d->GUARDIAN-ROOM [wizard]
  RIDDLE-ROOM [Riddle Room]
    d->CAROUSEL-ROOM, nw->CAROUSEL-ROOM, e->PEARL-ROOM
  PEARL-ROOM [Pearl Room]
    e->WELL-BOTTOM, w->RIDDLE-ROOM
  WELL-BOTTOM [Circular Room]
    w->PEARL-ROOM
```

## Formal Garden & Unicorn

**4 rooms** · region id `garden`

- **Mood.** Impossible daylight underground. A formal garden with a unicorn in it, and a sleeping princess.
- **Light.** Warm, high, sourceless — the one region in the trilogy with no visible light source and no shadow.
- **Accent.** Rose and pale gold.
- **Bespoke panels.** Formal Garden, North End of Garden, Topiary, Gazebo
- **Shared / variant panels.** None — four rooms, four panels, plus variants.
- **Puzzles.** The topiary animals, the unicorn and its collar, the princess.
- **NPCs & hazards.** Unicorn, princess.
- **Music.** A solo recorder over a sustained fifth. The only bed in Zork II in a major key.
- **Transitions.** Entering from Dark Tunnel: a slow fade-up rather than a slide, as if walking into light.

```
  FORMAL-GARDEN [Formal Garden]
    w->STREAM-PATH [barrow], n->GARDEN-NORTH, s->TOPIARY-ROOM
  GARDEN-NORTH [North End of Garden]
    in->GAZEBO-ROOM, n->DARK-TUNNEL [barrow], s->FORMAL-GARDEN
  TOPIARY-ROOM [Topiary]
    w->CAROUSEL-ROOM [carousel], n->FORMAL-GARDEN
  GAZEBO-ROOM [Gazebo]
    out->GARDEN-NORTH
```

## Dragon & Glacier

**6 rooms** · region id `dragon`

- **Mood.** Two hazards facing each other across a stone bridge: a dragon that will not be fought and a glacier that will not be passed.
- **Light.** Lava glow from the west, ice-blue from the east, the bridge between them lit by neither.
- **Accent.** Ember orange against cyan.
- **Bespoke panels.** Dragon Room, Dragon's Lair, Stone Bridge, Ice Room (intact and melted), Lava Room, Lava Tube
- **Shared / variant panels.** None.
- **Puzzles.** Leading the dragon to the glacier — the region's whole point, and a state change that rewrites two rooms at once.
- **NPCs & hazards.** The dragon.
- **Music.** Two beds that crossfade by position: a low brass swell to the west, a high glassy shimmer to the east.
- **Transitions.** When ICE-MELTED flips, the Ice Room panel changes under the player and the bed loses its shimmer.

```
  DRAGON-ROOM [Dragon Room]
    e->LEDGE-TUNNEL [barrow], n->DRAGON-LAIR, in->DRAGON-LAIR, w->FRESCO-ROOM [bank], s->STONE-BRIDGE, cross->STONE-BRIDGE
  DRAGON-LAIR [Dragon's Lair]
    s->DRAGON-ROOM, out->DRAGON-ROOM
  STONE-BRIDGE [Stone Bridge]
    n->DRAGON-ROOM, s->COOL-ROOM [carousel]
  GLACIER-ROOM [Ice Room]
    e->COOL-ROOM [carousel], w->LAVA-ROOM, u->LAVA-TUBE
  LAVA-ROOM [Lava Room]
    s->VOLCANO-BOTTOM [volcano], e->GLACIER-ROOM
  LAVA-TUBE [Lava Tube]
    d->GLACIER-ROOM, u->VOLCANO-VIEW [volcano], s->COBWEBBY-CORRIDOR [carousel]
```

## The Volcano

**10 rooms** · region id `volcano`

- **Mood.** A vertical shaft you cross by balloon. The only region in the trilogy where the player flies.
- **Light.** Up-light from the lava far below, throwing everything into silhouette from underneath.
- **Accent.** Ember, and the balloon's own patched brown cloth.
- **Bespoke panels.** Volcano Bottom, Volcano View, Narrow Ledge, Wide Ledge, Library, Dusty Room (safe intact and blown)
- **Shared / variant panels.** The four VAIR airspace rooms share one 'in flight' panel with altitude framing.
- **Puzzles.** The balloon (fuel, receptacle, wire, cloth), the safe and the brick.
- **NPCs & hazards.** None. The hazard is the flight itself.
- **Music.** A slow rising pad that literally rises in pitch with altitude — tied to the balloon's VAIR room rather than the region.
- **Transitions.** Boarding the balloon switches to the flight panel and holds it; each altitude change is a slow vertical slide, not a cut.

```
  VOLCANO-BOTTOM [Volcano Bottom]
    n->LAVA-ROOM [dragon]
  VOLCANO-VIEW [Volcano View]
    e->LAVA-TUBE [dragon]
  LEDGE-1 [Narrow Ledge]
    w->VOLCANO-BOTTOM, s->LIBRARY
  LEDGE-2 [Wide Ledge]
    w->VOLCANO-BOTTOM, s->SAFE-ROOM
  LIBRARY [Library]
    n->LEDGE-1, out->LEDGE-1
  SAFE-ROOM [Dusty Room]
    n->LEDGE-2
  VAIR-1 [Volcano Core]
    (no exits — reached by puzzle, vehicle or vision)
  VAIR-2 [Volcano Near Small Ledge]
    w->LEDGE-1, land->LEDGE-1
  VAIR-3 [Volcano by Viewing Ledge]
    (no exits — reached by puzzle, vehicle or vision)
  VAIR-4 [Volcano Near Wide Ledge]
    land->LEDGE-2, w->LEDGE-2
```

## The Bank of Zork

**10 rooms** · region id `bank`

- **Mood.** Institutional stone and a curtain of light. The most disorienting puzzle in the trilogy, played straight-faced.
- **Light.** Flat, even, bureaucratic — until the curtain, which is the only light source in its room.
- **Accent.** The curtain's cold white.
- **Bespoke panels.** Bank Entrance, Fresco Room, both Teller's Rooms, both Viewing Rooms, Safety Depository, Chairman's Office, Small Room, Vault
- **Shared / variant panels.** The two teller rooms and the two viewing rooms are mirrored pairs — one panel each, flipped.
- **Puzzles.** The curtain of light; the walls that relocate you by where you came from.
- **NPCs & hazards.** None.
- **Music.** A dry, close, four-note ostinato on muted strings that never resolves.
- **Transitions.** Passing through a wall is a white flash-cut, not a slide — the player did not walk anywhere.

```
  BANK-ENTRANCE [Bank Entrance]
    nw->TELLER-WEST, ne->TELLER-EAST, e->FRESCO-ROOM
  FRESCO-ROOM [Fresco Room]
    e->DRAGON-ROOM [dragon], w->BANK-ENTRANCE
  TELLER-EAST [East Teller's Room]
    n->VIEWING-EAST, s->BANK-ENTRANCE, e->DEPOSITORY
  TELLER-WEST [West Teller's Room]
    n->VIEWING-WEST, s->BANK-ENTRANCE, w->DEPOSITORY
  VIEWING-EAST [East Viewing Room]
    s->BANK-ENTRANCE
  VIEWING-WEST [West Viewing Room]
    s->BANK-ENTRANCE
  DEPOSITORY [Safety Depository]
    w~BKLEAVEW, e~BKLEAVEE, s->OFFICE
  OFFICE [Chairman's Office]
    n->DEPOSITORY
  SMALL-ROOM [Small Room]
    (no exits — reached by puzzle, vehicle or vision)
  VAULT [Vault]
    (no exits — reached by puzzle, vehicle or vision)
```

## Wonderland

**10 rooms** · region id `wonderland`

- **Mood.** Alice, underground. Cakes that resize you, a room you enter as a giant and leave as a mote.
- **Light.** Overbright and slightly wrong, like a stage set.
- **Accent.** Icing white and a sickly sugar pink.
- **Bespoke panels.** Tiny Room, Dreary Room, Posts Room, Pool Room, Tea Room, Top of Well, Low Room, Machine Room, Dingy Closet, Cage
- **Shared / variant panels.** None — the scale gag needs every room drawn at its own scale.
- **Puzzles.** The cakes, the pool of tears, the robot and the cage, the magnet room's exits.
- **NPCs & hazards.** The robot.
- **Music.** A music-box figure played at two speeds at once.
- **Transitions.** A size change is the one place a scale transform is allowed: the panel pushes in or pulls out hard before settling.

```
  TINY-ROOM [Tiny Room]
    n->DREARY-ROOM, in->DREARY-ROOM, d->RAVINE-LEDGE [barrow]
  DREARY-ROOM [Dreary Room]
    s->TINY-ROOM, out->TINY-ROOM
  POSTS-ROOM [Posts Room]
    e->POOL-ROOM
  POOL-ROOM [Pool Room]
    out->POSTS-ROOM, w->POSTS-ROOM
  TEA-ROOM [Tea Room]
    w->WELL-TOP, nw->MAGNET-ROOM
  WELL-TOP [Top of Well]
    e->TEA-ROOM
  MAGNET-ROOM [Low Room]
    n~MAGNET-ROOM-EXIT, s~MAGNET-ROOM-EXIT, w~MAGNET-ROOM-EXIT, ne~MAGNET-ROOM-EXIT, nw~MAGNET-ROOM-EXIT, sw~MAGNET-ROOM-EXIT, se~MAGNET-ROOM-EXIT, e~MAGNET-ROOM-EXIT, out~MAGNET-ROOM-EXIT
  MACHINE-ROOM [Machine Room]
    w->MAGNET-ROOM, s->CAGE-ROOM
  CAGE-ROOM [Dingy Closet]
    out->MACHINE-ROOM, n->MACHINE-ROOM
  IN-CAGE [Cage]
    (no exits — reached by puzzle, vehicle or vision)
```

## Tomb, Cerberus & the Oddly-angled Room

**13 rooms** · region id `tomb`

- **Mood.** A crypt with twelve flat heads on poles, a three-headed dog, and a room that plays baseball.
- **Light.** Torchlight in the crypt; the Oddly-angled Room lit from no direction at all.
- **Accent.** Bone white and dried blood.
- **Bespoke panels.** Cerberus Room, Crypt Anteroom, Crypt (lit and dark, door open and shut, secret door revealed), Landing
- **Shared / variant panels.** The nine Oddly-angled Rooms are one panel with nine framings — the joke is that they are identical.
- **Puzzles.** Cerberus and the collar, the crypt's secret 'F' door, the baseball diamond.
- **NPCs & hazards.** Cerberus.
- **Music.** A dead-slow processional on low woodwinds; the Oddly-angled Rooms get silence and a single wooden knock per move.
- **Transitions.** The Landing is the game's last room: hold on it, then hand off to Zork III.

```
  CERBERUS-ROOM [Cerberus Room]
    e->CRYPT-ANTEROOM, in->CRYPT-ANTEROOM, u->DIAMOND-5
  CRYPT-ANTEROOM [Crypt Anteroom]
    in->CRYPT-ROOM, s->CRYPT-ROOM, w->CERBERUS-ROOM
  CRYPT-ROOM [Crypt]
    n->CRYPT-ANTEROOM, s->ZORK3
  ZORK3 [Landing]
    (no exits — reached by puzzle, vehicle or vision)
  DIAMOND-1 [Oddly-angled Room]
    se->DIAMOND-5
  DIAMOND-2 [Oddly-angled Room]
    s->DIAMOND-5, se->DIAMOND-6, sw->DIAMOND-4
  DIAMOND-3 [Oddly-angled Room]
    sw->DIAMOND-5
  DIAMOND-4 [Oddly-angled Room]
    ne->DIAMOND-2, se->DIAMOND-8, e->DIAMOND-5
  DIAMOND-5 [Oddly-angled Room]
    nw->DIAMOND-1, n->DIAMOND-2, ne->DIAMOND-3, w->DIAMOND-4, e->DIAMOND-6, sw->DIAMOND-7, s->DIAMOND-8, se->DIAMOND-9, d->CERBERUS-ROOM, u->STAIRWAY-TOP [carousel]
  DIAMOND-6 [Oddly-angled Room]
    w->DIAMOND-5, nw->DIAMOND-2, sw->DIAMOND-8
  DIAMOND-7 [Oddly-angled Room]
    ne->DIAMOND-5
  DIAMOND-8 [Oddly-angled Room]
    n->DIAMOND-5, nw->DIAMOND-4, ne->DIAMOND-6
  DIAMOND-9 [Oddly-angled Room]
    nw->DIAMOND-5
```

## The Wizard's Demesne

**8 rooms** · region id `wizard`

- **Mood.** The Wizard's own rooms. Everything here is his, including the guardians and the aquarium.
- **Light.** Cold arcane blue from the workbench, warm from the trophy room.
- **Accent.** Verdigris and wand-blue.
- **Bespoke panels.** Guarded Room (lizard alert, sniffing, sleepy), Wizard's Workshop, Wizard's Workroom, Pentagram Room, Trophy Room, Aquarium Room, Murky Room, Wizard's Quarters
- **Shared / variant panels.** None.
- **Puzzles.** The lizard and the candy, the pentagram, the aquarium, the demon.
- **NPCs & hazards.** The Wizard, the guardians, the genie.
- **Music.** The title theme's Zork II arrangement, heard properly for the first time.
- **Transitions.** Entering the workshop for the first time is an event panel, not a room panel.

```
  GUARDIAN-ROOM [Guarded Room]
    n->COBWEBBY-CORRIDOR [carousel], s->WIZARDS-WORKSHOP, in->WIZARDS-WORKSHOP
  WIZARDS-WORKSHOP [Wizard's Workshop]
    n->GUARDIAN-ROOM, out->GUARDIAN-ROOM, w->WORKBENCH-ROOM, s->TROPHY-ROOM
  WORKBENCH-ROOM [Wizard's Workroom]
    e->WIZARDS-WORKSHOP, s->PENTAGRAM-ROOM, w->AQUARIUM-ROOM
  PENTAGRAM-ROOM [Pentagram Room]
    n->WORKBENCH-ROOM
  TROPHY-ROOM [Trophy Room]
    n->WIZARDS-WORKSHOP
  AQUARIUM-ROOM [Aquarium Room]
    e->WORKBENCH-ROOM, in->IN-AQUARIUM, s->WIZARDS-QUARTERS
  IN-AQUARIUM [Murky Room]
    out->AQUARIUM-ROOM
  WIZARDS-QUARTERS [Wizard's Quarters]
    n->AQUARIUM-ROOM
```

## Palantir Visions

**4 rooms** · region id `palantir`

- **Mood.** Four rooms of coloured mist seen through a stone. Not places — visions.
- **Light.** Each room lit entirely by its own colour.
- **Accent.** Red, blue, white, black in turn.
- **Bespoke panels.** All four.
- **Shared / variant panels.** One composition, four colour treatments — the purest variant family in Zork II.
- **Puzzles.** The palantir itself.
- **NPCs & hazards.** None.
- **Music.** No bed. A single sustained tone per room, a fifth apart.
- **Transitions.** No slide, no fade — a cut, because looking into a palantir is not travel.

```
  DEAD-PALANTIR-1 [Room of Red Mist]
    w->DEAD-PALANTIR-2
  DEAD-PALANTIR-2 [Room of Blue Mist]
    w->DEAD-PALANTIR-3
  DEAD-PALANTIR-3 [Room of White Mist]
    w->DEAD-PALANTIR-4
  DEAD-PALANTIR-4 [Room of Black Mist]
    (no exits — reached by puzzle, vehicle or vision)
```

# Zork III: The Dungeon Master

10 regions, 89 rooms.

## Endless Stair & Junction

**7 rooms** · region id `stair`

- **Mood.** You arrive already deep, already tired. Zork III opens after the adventure, not before it.
- **Light.** Eerie, sourceless, grey — the light 'coming from all around you' the source describes.
- **Accent.** Almost none. This is the region that establishes Zork III's restraint.
- **Bespoke panels.** Endless Stair, Junction, Creepy Crawl, Crystal Grotto, Barren Area, Hairpin Loop
- **Shared / variant panels.** Tight Squeeze reuses the Creepy Crawl panel tighter-cropped.
- **Puzzles.** None. The region exists to set tone and hand out the lamp.
- **NPCs & hazards.** None yet — but the hooded figure is one room away.
- **Music.** A single sustained low string with no rhythm at all.
- **Transitions.** The dream prologue holds a black frame with the text alone before the first panel arrives.

```
  ZORK2-STAIR [Endless Stair]
    s->JUNCTION
  JUNCTION [Junction]
    w->CLEARING, n->ZORK2-STAIR, s->CREEPY-CRAWL, e->DAMP-PASSAGE [lake]
  CREEPY-CRAWL [Creepy Crawl]
    n->JUNCTION, s->FOGGY-ROOM [shadow], sw->SHADOW-1 [shadow], e->TIGHT-SQUEEZE
  TIGHT-SQUEEZE [Tight Squeeze]
    w->CREEPY-CRAWL, e->ROCKY-ROOM
  ROCKY-ROOM [Crystal Grotto]
    s->WIDE-HALL [greatdoor], w->TIGHT-SQUEEZE
  CLEARING [Barren Area]
    sw->SHADOW-2 [shadow], nw->SLOPE, w->CLIFF [cliff], e->JUNCTION
  SLOPE [Hairpin Loop]
    se->CLEARING, u->CLEARING, sw->CLIFF-BASE [cliff], d->CLIFF-BASE [cliff]
```

## Land of Shadow

**9 rooms** · region id `shadow`

- **Mood.** Eight rooms that are the same room. A hooded figure you must fight and must not kill.
- **Light.** Flat grey with no shadow anywhere, which is the joke of the name.
- **Accent.** The figure's blade, the only bright thing.
- **Bespoke panels.** One Land of Shadow panel, one Foggy Room.
- **Shared / variant panels.** All eight SHADOW rooms share the panel; the fight is carried by event panels and by the figure's position in frame.
- **Puzzles.** The fight itself, which the player must break off rather than win.
- **NPCs & hazards.** The hooded figure.
- **Music.** Two notes, alternating, slowing as the figure weakens.
- **Transitions.** Movement within the region does not change the panel at all — only the figure moves. That stillness is the disorientation.

```
  SHADOW-1 [Land of Shadow]
    s->SHADOW-5, e->CREEPY-CRAWL [stair], nw->SHADOW-2, w->SHADOW-3, sw->SHADOW-4, se->FOGGY-ROOM
  SHADOW-2 [Land of Shadow]
    n->CLEARING [stair], se->SHADOW-1, sw->SHADOW-7, s->SHADOW-3, w->SHADOW-8, e->SHADOW-1
  SHADOW-3 [Land of Shadow]
    nw->SHADOW-8, ne->SHADOW-1, se->SHADOW-1, sw->SHADOW-6, n->SHADOW-2, s->SHADOW-4, w->SHADOW-7, e->SHADOW-1
  SHADOW-4 [Land of Shadow]
    n->SHADOW-3, e->SHADOW-1, ne->SHADOW-1, se->SHADOW-5, s->SHADOW-5, w->SHADOW-6, nw->SHADOW-7
  SHADOW-5 [Land of Shadow]
    n->SHADOW-4, nw->SHADOW-6, ne->SHADOW-1
  SHADOW-6 [Land of Shadow]
    n->SHADOW-7, nw->FLATHEAD-OCEAN [cliff], w->FLATHEAD-OCEAN [cliff], d->FLATHEAD-OCEAN [cliff], se->SHADOW-5, e->SHADOW-4, ne->SHADOW-3
  SHADOW-7 [Land of Shadow]
    ne->SHADOW-2, e->SHADOW-3, se->SHADOW-4, s->SHADOW-6, n->SHADOW-8, d->FLATHEAD-OCEAN [cliff], nw->FLATHEAD-OCEAN [cliff], w->FLATHEAD-OCEAN [cliff], sw->FLATHEAD-OCEAN [cliff]
  SHADOW-8 [Land of Shadow]
    s->SHADOW-7, e->SHADOW-2, se->SHADOW-3, sw->FLATHEAD-OCEAN [cliff], w->FLATHEAD-OCEAN [cliff], d->FLATHEAD-OCEAN [cliff], n->CLIFF [cliff]
  FOGGY-ROOM [Foggy Room]
    n->CREEPY-CRAWL [stair], s->LAKE-SHORE [lake], w->SHADOW-1
```

## Cliff & Flathead Ocean

**4 rooms** · region id `cliff`

- **Mood.** Sunlight. A hole in the world two hundred feet up, trees grown from seedlings, and a man on a ledge who may or may not help you.
- **Light.** A single hard sun shaft — the only true daylight in Zork III.
- **Accent.** Living green, shocking after the shadow lands.
- **Bespoke panels.** Cliff (rope tied and not, chest present and gone), Cliff Ledge (man absent, waiting, hauling, gone), Cliff Base, Flathead Ocean (empty and with the ship)
- **Shared / variant panels.** None.
- **Puzzles.** The rope, the chest, and the decision about the man.
- **NPCs & hazards.** The hooded man.
- **Music.** A high sustained tone with birdsong far off — the only diegetic wildlife in the game.
- **Transitions.** Arriving at the Cliff from the Barren Area is the game's one bright cut: no fade, straight into the light.

```
  CLIFF [Cliff]
    d->CLIFF-LEDGE, sw->SHADOW-8 [shadow], e->CLEARING [stair]
  CLIFF-LEDGE [Cliff Ledge]
    d->CLIFF-BASE
  CLIFF-BASE [Cliff Base]
    s->FLATHEAD-OCEAN, ne->SLOPE [stair]
  FLATHEAD-OCEAN [Flathead Ocean]
    n->CLIFF-BASE, se->SHADOW-6 [shadow], ne->SHADOW-8 [shadow], e->SHADOW-7 [shadow]
```

## Lake, Aqueduct & Scenic Vista

**15 rooms** · region id `lake`

- **Mood.** Water under a rock sky, an aqueduct, and a table that shows you four places you cannot reach.
- **Light.** Reflected, moving, the only light in Zork III that is not still.
- **Accent.** Lake blue-green.
- **Bespoke panels.** Lake Shore, Aqueduct View, On the Lake, Underwater, Western Shore, Scenic Vista, Southern Shore, Key Room, Aqueduct (dry and running), Damp Passage, Dead End
- **Shared / variant panels.** Dark Place ×2 share one near-black panel; AQ-1..3 share an aqueduct panel with dressing.
- **Puzzles.** Swimming with the lamp, the Scenic Vista's four views, the aqueduct.
- **NPCs & hazards.** None.
- **Music.** Water and a slow harmonic pad; underwater is the same bed, low-passed.
- **Transitions.** The Scenic Vista's four views are inset panels within the Vista's own panel, not replacements for it.

```
  LAKE-SHORE [Lake Shore]
    se->AQ-VIEW, d->AQ-VIEW, n->FOGGY-ROOM [shadow]
  AQ-VIEW [Aqueduct View]
    nw->LAKE-SHORE, u->LAKE-SHORE
  ON-LAKE [On the Lake]
    n->LAKE-SHORE, s->SOUTH-SHORE, w->FAR-SHORE, nw->FAR-SHORE, sw->SOUTH-SHORE, d->IN-LAKE
  IN-LAKE [Underwater]
    u->ON-LAKE, n->IN-LAKE, s->IN-LAKE, e->IN-LAKE, w->IN-LAKE, ne->IN-LAKE, nw->IN-LAKE, se->IN-LAKE, sw->IN-LAKE
  FAR-SHORE [Western Shore]
    s->VIEW-ROOM
  VIEW-ROOM [Scenic Vista]
    n->FAR-SHORE
  SOUTH-SHORE [Southern Shore]
    u->DARK-1, s->DARK-1
  DARK-1 [Dark Place]
    n->SOUTH-SHORE, s->DARK-2, u->DARK-2, d->SOUTH-SHORE
  DARK-2 [Dark Place]
    n->DARK-1, e->KEY-ROOM, u->KEY-ROOM, d->DARK-1
  KEY-ROOM [Key Room]
    w->DARK-2, d->AQ-1
  AQ-1 [Aqueduct]
    n->AQ-2
  AQ-2 [High Arch]
    n->AQ-3, s->AQ-1
  AQ-3 [Water Slide]
    n->DAMP-PASSAGE, d->DAMP-PASSAGE, s->AQ-2
  DAMP-PASSAGE [Damp Passage]
    w->JUNCTION [stair], e->DEAD-END, ne->MSTAIRS [mirror]
  DEAD-END [Dead End]
    w->DAMP-PASSAGE, nw->MSTAIRS [mirror]
```

## Great Door & Royal Hall

**2 rooms** · region id `greatdoor`

- **Mood.** A monumental hall and a door that will not open. Then an earthquake opens the wall beside it.
- **Light.** Dust in still air.
- **Accent.** Rust.
- **Bespoke panels.** Great Door (before and after the earthquake), Royal Hall
- **Shared / variant panels.** None.
- **Puzzles.** The earthquake and the cleft — a map change, not a lock.
- **NPCs & hazards.** None.
- **Music.** Silence, then a single low impact when the quake lands.
- **Transitions.** The earthquake is an event panel plus a screen shake, and the Great Door's room panel changes underneath it.

```
  MUSEUM-ANTE [Great Door]
    n->WIDE-HALL, e->MUSEUM-ENTRANCE [museum]
  WIDE-HALL [Royal Hall]
    n->ROCKY-ROOM [stair], s->MUSEUM-ANTE
```

## The Royal Museum, in three eras

**9 rooms** · region id `museum`

- **Mood.** The same five rooms in three centuries. The finest museum in the Empire, before, during and after its ruin.
- **Light.** Present: dim and dusty. Middle: lit and kept. Past: bright, staffed, alive.
- **Accent.** The ring's gold, in every era.
- **Bespoke panels.** Museum Entrance, Technology Museum, Jewel Room — each in three eras.
- **Shared / variant panels.** The three eras are one family per room, era as the axis. Nine panels from three base compositions.
- **Puzzles.** The time machine, the ring, and the guards who see you take it.
- **NPCs & hazards.** Guards, voices, Lord Dimwit Flathead heard but never seen.
- **Music.** One bed with three arrangements: full in the past, thinned in the middle era, a single line in the present.
- **Transitions.** A time jump is a hard white cut with a sound like a struck rail — never a crossfade, which would imply travel.

```
  MUSEUM-ENTRANCE [Museum Entrance]
    e->JEWEL-ROOM, w->MUSEUM-ANTE [greatdoor], s->CP-ANTE [puzzle], d->CP-ANTE [puzzle], n->TECH-MUSEUM
  TECH-MUSEUM [Technology Museum]
    s->MUSEUM-ENTRANCE, out->MUSEUM-ENTRANCE
  JEWEL-ROOM [Jewel Room]
    w->MUSEUM-ENTRANCE, out->MUSEUM-ENTRANCE
  MID-MUSEUM-ENTRANCE [Museum Entrance]
    e->MID-JEWEL-ROOM, s->MID-CP-ANTE [puzzle], d->MID-CP-ANTE [puzzle], n->MID-TECH-MUSEUM
  MID-TECH-MUSEUM [Technology Museum]
    s->MID-MUSEUM-ENTRANCE, out->MID-MUSEUM-ENTRANCE
  MID-JEWEL-ROOM [Jewel Room]
    w->MID-MUSEUM-ENTRANCE, out->MID-MUSEUM-ENTRANCE
  OLD-MUSEUM-ENTRANCE [Museum Entrance]
    e->OLD-JEWEL-ROOM, n->OLD-TECH-MUSEUM
  OLD-TECH-MUSEUM [Technology Museum]
    s->OLD-MUSEUM-ENTRANCE, out->OLD-MUSEUM-ENTRANCE
  OLD-JEWEL-ROOM [Jewel Room]
    w->OLD-MUSEUM-ENTRANCE, out->OLD-MUSEUM-ENTRANCE
```

## The Royal Puzzle

**5 rooms** · region id `puzzle`

- **Mood.** You are inside the wall you are pushing.
- **Light.** From an opening in the ceiling, straight down, hard-edged.
- **Accent.** Sandstone gold against marble grey.
- **Bespoke panels.** Royal Puzzle Entrance, Side Room (door and passage), one interior establishing panel
- **Shared / variant panels.** The interior is one panel; the *state* is carried by the slate diagram component, not by art.
- **Puzzles.** The Royal Puzzle. See the presentation concept §4.1.
- **NPCs & hazards.** None.
- **Music.** No bed. A single stone-on-stone scrape per push, and nothing else.
- **Transitions.** Entering the puzzle drops the region music entirely — the silence is the warning.

```
  CP-ANTE [Royal Puzzle Entrance]
    w->CP-OUT, n->MUSEUM-ENTRANCE [museum], u->MUSEUM-ENTRANCE [museum], d~CPENTER
  CP-OUT [Side Room]
    n->CP-ANTE, u->CP-ANTE, e->CP
  CP [Room in a Puzzle]
    n~CPEXIT, s~CPEXIT, e~CPEXIT, w~CPEXIT, ne~CPEXIT, nw~CPEXIT, se~CPEXIT, u~CPEXIT, sw~CPEXIT
  MID-CP-ANTE [Royal Puzzle Entrance]
    w->MID-CP-OUT, n->MID-MUSEUM-ENTRANCE [museum], u->MID-MUSEUM-ENTRANCE [museum], d~CPENTER
  MID-CP-OUT [Side Room]
    n->MID-CP-ANTE
```

## The Mirror Box

**20 rooms** · region id `mirror`

- **Mood.** A machine the size of a room, on rails, that you ride and rotate. The trilogy's most demanding object.
- **Light.** Lamp-light inside the box; the beam, when it exists, is the only other source.
- **Accent.** The beam's white.
- **Bespoke panels.** Engravings Room, Button Room, Beam Room, Inside Mirror, Dungeon Entrance, one Hallway panel, one Narrow Room panel
- **Shared / variant panels.** The five hallways share one panel and the ten narrow rooms share one; the *schematic* carries position and facing.
- **Puzzles.** Riding, rotating, the pole, the beam, and the guardians who kill anyone visible.
- **NPCs & hazards.** The stone guardians.
- **Music.** A mechanical pulse that changes pitch with the box's position.
- **Transitions.** Riding the box is a slow vertical slide of the same panel; rotating is a quarter-turn of the schematic only.

```
  MSTAIRS [Engravings Room]
    n->MR-ANTE, d->MR-ANTE, sw->DAMP-PASSAGE [lake], se->DEAD-END [lake]
  MR-ANTE [Button Room]
    s->MSTAIRS, u->MSTAIRS, n->MREYE
  MREYE [Beam Room]
    n~MRGO, nw~MRGO, ne~MRGO, s->MR-ANTE
  IN-MIRROR [Inside Mirror]
    out~MIROUT, n~MIROUT, s~MIROUT, nw~MIROUT, ne~MIROUT, se~MIROUT, sw~MIROUT, w~MIROUT, e~MIROUT
  MRA [Hallway]
    n~MRGO, nw~MRGO, ne~MRGO, enter~MIRIN, s->MREYE
  MRAE [Narrow Room]
    enter~MIRIN, w~MIRIN, n->MRB, s->MREYE
  MRAW [Narrow Room]
    enter~MIRIN, e~MIRIN, n->MRB, s->MREYE
  MRB [Hallway]
    n~MRGO, nw~MRGO, ne~MRGO, enter~MIRIN, s~MRGO, sw~MRGO, se~MRGO
  MRBE [Narrow Room]
    enter~MIRIN, w~MIRIN, n->MRC, s->MRA
  MRBW [Narrow Room]
    enter~MIRIN, e~MIRIN, n->MRC, s->MRA
  MRC [Hallway]
    n~MRGO, nw~MRGO, ne~MRGO, enter~MIRIN, s~MRGO, sw~MRGO, se~MRGO
  MRCE [Narrow Room]
    enter~MIRIN, w~MIRIN, n->MRG, s->MRB
  MRCW [Narrow Room]
    enter~MIRIN, e~MIRIN, n->MRG, s->MRB
  MRD [Hallway]
    n->FRONT-DOOR, ne->FRONT-DOOR, nw->FRONT-DOOR, s~MRGO, se~MRGO, sw~MRGO
  MRDE [Narrow Room]
    enter~MIRIN, w~MIRIN, n->FRONT-DOOR, s->MRG
  MRDW [Narrow Room]
    enter~MIRIN, w~MIRIN, n->FRONT-DOOR, s->MRG
  MRG [Hallway]
    n~MRGO, nw~MRGO, ne~MRGO, enter~MIRIN, s~MRGO, sw~MRGO, se~MRGO
  MRGE [Narrow Room]
    enter~MIRIN, w~MIRIN, n->MRD, s->MRC
  MRGW [Narrow Room]
    enter~MIRIN, e~MIRIN, n->MRD, s->MRC
  FRONT-DOOR [Dungeon Entrance]
    n->BEHIND-DOOR [endgame], enter->BEHIND-DOOR [endgame], s~MRGO, se->MRDE, sw->MRDW
```

## The Dungeon Master's Endgame

**10 rooms** · region id `endgame`

- **Mood.** Corridors, cells, a parapet and a dial. The Dungeon Master follows you and does what you say.
- **Light.** Even torchlight, institutional.
- **Accent.** Bronze.
- **Bespoke panels.** Narrow Corridor, Parapet, Prison Cell, Treasury of Zork, Dungeon Entrance
- **Shared / variant panels.** The four corridors share one panel, rotated.
- **Puzzles.** The cell mechanism, the dial, and giving the Dungeon Master the right order at the right moment.
- **NPCs & hazards.** The Dungeon Master.
- **Music.** The trilogy title theme, reduced to a single line, resolving for the first time in the Treasury.
- **Transitions.** The Treasury of Zork is the trilogy's last panel and gets the longest hold in the whole project.

```
  BEHIND-DOOR [Narrow Corridor]
    n->SOUTH-CORRIDOR, s->FRONT-DOOR [mirror]
  NORTH-CORRIDOR [North Corridor]
    e->EAST-CORRIDOR, w->WEST-CORRIDOR, n->PARAPET, s->CELL, enter->CELL
  SOUTH-CORRIDOR [South Corridor]
    e->EAST-CORRIDOR, w->WEST-CORRIDOR, n~BRONZE-DOOR-EXIT, s->BEHIND-DOOR
  EAST-CORRIDOR [East Corridor]
    n->NORTH-CORRIDOR, s->SOUTH-CORRIDOR
  WEST-CORRIDOR [West Corridor]
    n->NORTH-CORRIDOR, s->SOUTH-CORRIDOR
  PARAPET [Parapet]
    s->NORTH-CORRIDOR
  CELL [Prison Cell]
    out->NORTH-CORRIDOR, n->NORTH-CORRIDOR
  PRISON-CELL [Prison Cell]
    (no exits — reached by puzzle, vehicle or vision)
  GOOD-CELL [Prison Cell]
    out->NIRVANA, s->NIRVANA
  NIRVANA [Treasury of Zork]
    (no exits — reached by puzzle, vehicle or vision)
```

## Vista Targets (seen, never entered)

**8 rooms** · region id `vista`

- **Mood.** Places seen through the Scenic Vista and never entered, plus a mine pocket that exists only to be looked at.
- **Light.** Each as its own place — they are not lit by where you are standing.
- **Accent.** Per view.
- **Bespoke panels.** Timber Room, Room 8, Sacrificial Altar — the three named views; Damp Passage already has a panel.
- **Shared / variant panels.** The disconnected mine rooms need no panels at all unless a view targets them.
- **Puzzles.** None; they are the payload of the Vista.
- **NPCs & hazards.** None.
- **Music.** Inherit the Vista's bed.
- **Transitions.** These render as inset panels inside the Scenic Vista panel, framed by the table's edge.

```
  TIMBER-ROOM [Timber Room]
    e->LADDER-BOTTOM, w->LOWER-SHAFT
  ROOM-8 [Room 8]
    (no exits — reached by puzzle, vehicle or vision)
  ZORK-IV [Sacrificial Altar]
    (no exits — reached by puzzle, vehicle or vision)
  LADDER-TOP [Ladder Top]
    d->LADDER-BOTTOM
  LADDER-BOTTOM [Ladder Bottom]
    s->DEAD-END-5, w->TIMBER-ROOM, u->LADDER-TOP
  LOWER-SHAFT [Drafty Room]
    s->MACHINE-ROOM, out->TIMBER-ROOM, e->TIMBER-ROOM
  MACHINE-ROOM [Machine Room]
    (no exits — reached by puzzle, vehicle or vision)
  DEAD-END-5 [Dead End]
    n->LADDER-BOTTOM
```

