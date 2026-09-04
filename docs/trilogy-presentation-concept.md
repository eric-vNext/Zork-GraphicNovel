# Trilogy Presentation Concept — the delta

**Phase 2 deliverable.** `docs/presentation-concept.md` already defines the
presentation language — screen layout, panel transitions, "Storm-Lantern Ink"
art direction, typography, audio, and the legibility floor — and none of it is
being reinvented. This document covers only what the trilogy adds.

Five things change: each game gets a palette of its own inside the one style;
the three games need a shell and a hand-off; Zork II needs a way to show that a
spell is on you; Zork III needs two components that invent rather than
illustrate; and Zork III needs a progress display that is not a trophy case.

---

## 1. One style, three palettes

The locked style block in `docs/asset-plan.md` §0 stays **verbatim** across all
three games. If it drifts, the trilogy reads as three projects.

What shifts is the palette clause inside it. Zork I's "bone, moss, rust and
slate" was tuned for New England woods and a lantern in the dark. Zork II is
brighter, stranger and more whimsical — a wizard's demesne, a volcano, a formal
garden, a room made of Wonderland. Zork III is austere, grey and elegiac — a
dead empire, a shadow you must not kill, a lake under a rock sky.

Each game appends **one** palette line to the shared block, decided at anchor
time and then never touched:

| | Palette clause appended to `[STYLE]` | Light |
|---|---|---|
| **Zork I** | *(none — the base palette is Zork I's)* | Lantern warm against blue-black |
| **Zork II** | "palette warmed toward verdigris, brass and ember, with one saturated accent per region — the glacier's cyan, the garden's rose, the volcano's ember" | Sourced light: lava glow, the wizard's wand, the balloon's burner |
| **Zork III** | "palette cooled and desaturated toward ash, slate and old ivory, colour reserved for the few things that still hold it — the lake, the beam of light, the ring" | Flat, sourceless, grey — except the beam |

The rule that makes this work: **each game may shift saturation and hue centre;
none may change the linework, the shading medium, or the compositional
grammar.** A Zork III panel next to a Zork I panel should read as the same
illustrator on a different assignment.

**Per-region accents** stay as they are in `docs/region-design.md` — one accent
per region, inside the game's palette.

---

## 2. The trilogy shell

### Title and game selection

The existing title screen becomes the trilogy's front door: the logotype, then
three cards. Each card shows the game's own title panel, its subtitle, and — if
there is a save — the room name and score from the most recent slot, so
returning to a game in progress is one click.

Games not yet built are shown but disabled, with the reason on the card. The
engine already carries this: `GameDef.playable` is false for Zork II and III
until their content lands, and `selectGame` allows them for tests while the UI
refuses to start them.

### The hand-off

The source games are written to join, and the presentation should let them.

Zork II's ending (`ZORK3-FCN`) tells the player the adventure concludes in
*Zork III*. Zork III's opening is a dream of tumbling down the staircase they
just descended, and its first room is literally called `ZORK2-STAIR`.

So: when Zork II ends in victory, the victory screen's continue action starts
Zork III rather than returning to the menu — the Zork II ending panel
cross-fades into Zork III's dream prologue over a single audio bed that carries
across the cut. The player can still return to the menu; the point is that the
default path is forward.

Zork I → Zork II gets the same treatment, one step gentler: Zork I's barrow
ending already speaks of "an even greater adventure", and Zork II opens *inside*
that barrow. The same room, from the other side of the door.

### Where you are in the trilogy

The status strip gains a small three-dot trilogy indicator, filled to the game
you are in. It is not a progress bar — Zork III's seven points are not
comparable to Zork I's 350 — just an "I of III".

---

## 3. Zork II: showing that a spell is on you

Twelve spells, and several are persistent conditions that silently rewrite what
your commands do (see `docs/trilogy-research.md` §3.3). A player who is Feeble
and does not know it will read the load-limit refusal as a bug.

This is a **status treatment, not a panel**. Panels are for places and events;
a condition that follows you between rooms belongs in the chrome.

- A **spell band** appears in the status strip while `SPELL?` is set: the
  spell's name in the caption face on a small torn-parchment plate, tinted with
  the spell's own colour, with a slow pulse tied to nothing (it should feel
  like a condition, not a timer — the original never tells you how long).
- Six spells have an onset line (`SPELL-HINTS`) and six do not; that asymmetry
  is deliberate in the source and we keep it. The band appears either way, so
  the unannounced half are discoverable without being explained.
- **Float** additionally tints the panel edge and lifts the caption plate a few
  pixels — the one spell whose expiry can kill you deserves a persistent
  reminder in the panel itself.
- **Fantasize** hallucinates objects into room listings. That is text, not art:
  the hallucinated line renders in the log in a slightly washed ink so a
  re-reading player can spot it afterwards, but nothing marks it at the time.
- The Wizard's own appearances are event panels, one per outcome (casting,
  fumbling the spell, thinking better of it and vanishing).

---

## 4. Zork III: the two components

These are the only places in the trilogy where the graphic-novel treatment must
invent rather than illustrate. Both must read as objects *in* the illustrated
world — drawn, inked, lit — not as debug overlays dropped on top of it.

### 4.1 The Royal Puzzle grid

The original redraws a fixed-font 3×3 ASCII map of the player's immediate
neighbourhood every turn. Reproducing that as monospace text inside a graphic
novel would be an admission of defeat; reproducing it as a top-down floor plan
would lose the fact that the player is *inside* the wall they are pushing.

**The design:** the panel holds a fixed, hand-inked establishing view of the
puzzle interior — sandstone and marble slabs, the light from above, the ladder
on the wall. Overlaid in the panel's quiet corner, in the same ink, is a
**3×3 slate diagram**: nine cells drawn as chiselled squares, marble hatched,
sandstone stippled, the player's cell marked with the lantern glyph, unknown
diagonals left blank. It is the same information `CPWHERE` prints, drawn as a
mason's tally scratched into the wall.

- It updates every turn with a short ink-wipe, not a fade — the puzzle's rhythm
  is deliberate and mechanical.
- A push animates: the slab glyph slides one cell, the player glyph follows.
- When `CPBLOCK-FLAG` is set — the player has sealed themselves in — the
  diagram gets a scratched border. The game does not say you have lost; neither
  do we.
- The full 4×8 map is **never** shown. The original withholds it and the puzzle
  is the mapping.

### 4.2 The mirror-box schematic

Three independent axes (position, facing, beam) that prose alone defeats most
players on, and that panel art cannot convey at all — a rotation looks like a
different room.

**The design:** a small **elevation schematic** pinned to the panel's edge,
drawn as an engraving on the box's own wooden panel: the corridor as a vertical
line with five stops, the box as a rectangle at its current stop, an arrow for
its facing, the short pole up or down, and the beam as a hairline that either
passes through or stops.

- It appears only while the player is inside or beside the box, and slides away
  when they leave the region.
- Rotating the box rotates the schematic's arrow with a quarter-turn easing —
  the one place in the trilogy where motion carries information rather than
  mood.
- The mirror rooms still get full illustrated panels; the schematic sits over
  them, the way a diagram sits in the margin of a technical page.

---

## 5. Progress without a trophy case

Zork I and Zork II both end with treasures in a case, and Zork I's presentation
leans on it hard: the four-tier Living Room panel ladder, the `case-view`
museum inset, the treasure fly-in on first take.

**Zork II keeps all of it**, pointed at the wizard's case: same tiers, same
inset, same fanfare, 400 points and its own rank ladder.

**Zork III has none of it.** One valued object, `SCORE-MAX 7`, and `V-SCORE`
reports "potential", not score. The seven points are completed *tasks*, not
loot.

So Zork III's progress display is a **list of seven, not a count of treasures**:

- The status strip shows `Potential 3 of 7` in place of the score.
- The inset that opens where Zork I's case museum would is a **hand-inked
  ledger** of the seven, each line struck through as it is earned, the unearned
  ones left blank rather than named — the game never tells you what the seven
  are, and neither do we.
- No fanfare on a treasure; instead a single low bell when the potential rises,
  reused from the trilogy's shared SFX set.
- The lantern health indicator, the compass, the chips and everything else in
  the strip are unchanged.

---

## 6. Audio

- **Beds are per game and per region**, named in each game's presentation
  module. There is no shared bed except the title.
- **The trilogy title theme** is one piece with three arrangements: Zork I's
  full statement, Zork II's brighter reharmonisation, Zork III's reduction to a
  single line. A player moving between games should hear the same tune lose and
  regain its accompaniment.
- **Hand-off cuts** carry a single bed across the game change, established
  above.
- The synthesis method is unchanged: `game/scripts/synth-audio.py`, numpy DSP,
  fixed seed, nothing licensed.
