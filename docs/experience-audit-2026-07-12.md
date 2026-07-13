# Zork — Graphic Novel Edition: Experience Audit

*A play-through review by a Gen-X Zork fan who has wanted to* see *this game since 1983.*
*Date: 2026-07-12. Build: Revision 88 / Serial 840726, local dev server.*

---

## The short version

This is the port I always wanted and never thought I'd get. The parser is faithful
down to the "It's curtains for the troll" phrasing, and the art is not filler — it's a
genuine graphic novel. The lantern-and-skull **death screen**, the runic-barrow
**victory screen**, the troll with the bloody axe, the thief as a hooded gentleman-rogue
with a stiletto and swag bag, the *painting* rendered as an actual gilt-framed landscape
in the Gallery — these land emotionally. The dynamic room states (the troll room keeps
his **abandoned axe** on the floor after he vanishes; the trophy case fills in tiers) are
the kind of touch that shows real care.

So this report is not "fix the art." The art is the strongest thing here. It's about the
**presentation layer around** the art: one real readability bug that undercuts the whole
experience, a handful of small fidelity gaps, and a set of features that would turn a
faithful port into a keepsake.

Everything below is ordered by impact.

---

## 1. Verified issues (things that are actually broken or inconsistent)

### 1.1 — The transcript does not reliably scroll to new output  *(highest priority)*

This is the one that matters. In a parser game the **text is the game** — every death,
hint, and combat result is a line you must read. Right now the story log frequently
leaves the newest lines below the fold, so you sit staring at stale text (I spent most of
my session looking at the *Kitchen* description while actually standing in the Troll Room,
mid-combat).

It's reproducible from a cold start. Measuring "distance from the bottom of the log" after
each command from a fresh game:

```
south          → 0px    (fine)
east           → 0px    (fine)
examine house  → 72px   (already past the 60px "stick" threshold)
north          → 232px  (new room description now off-screen)
west of house  → 298px  (getting worse every turn)
```

**Root cause** (`components/GameScreen.tsx`, `LogView`): auto-scroll only fires when the
user is already within 60px of the bottom (`stick.current`). But the room-name lines use a
Framer-Motion entrance animation that grows the log's height *after* the scroll has run,
so the resting position ends up >60px from the bottom, which latches `stick` to `false`
permanently until the player manually scrolls back down. Combat and multi-line room
descriptions trip it immediately.

**Fix options:**
- Scroll to bottom on *new command submission* unconditionally (a user who just typed a
  command always wants to see its result), and keep the "stick" logic only for passive
  daemon output.
- Or measure/scroll after the entrance animation completes (`onAnimationComplete`), or
  reserve the line's final height before animating so `scrollHeight` is stable.
- Raise the stick threshold to ~1–1.5× line-height, and re-run the scroll on
  `ResizeObserver` of the log content.

Nothing else in this report will be felt if a player can't see the text.

### 1.2 — In darkness the art contradicts the words

When you extinguish the lamp *in place* and `look`, the log correctly says **"It is pitch
black. You are likely to be eaten by a grue,"** but the panel keeps showing the fully-lit
room. The `grue-warning` panel only swaps in on **movement** into a dark room
(`state/store.ts`: the dark-panel branch requires `sawRoom`, which a stationary `look`
doesn't set). Result: the single most atmospheric beat in Zork — the dark — is visually
muted half the time.

**Fix:** drive the panel from lighting state, not the room event. If `!roomLit(s)` and the
player is alive, show darkness regardless of whether a room event fired this turn.

### 1.3 — Only a binary Mute; no volume control

The `AudioManager` already implements `setMusicVol` / `setSfxVol` with localStorage
persistence — but the UI exposes only a **Mute** toggle. Music and SFX can't be balanced.
This is a five-minute win: two sliders in a small settings popover, wired to methods that
already exist.

### 1.4 — Two authored SFX are never triggered

`public/audio/sfx/` ships **`page-turn`** and **`water-flow`**, but neither is referenced
anywhere in `src`. `page-turn` is the painful one: a soft page-turn on each room/panel
transition is exactly the sound that would sell the "graphic novel" conceit, and it's
already sitting in the bundle unused. `water-flow` would enrich the river/reservoir rooms
that currently rely on the music bed alone.

### 1.5 — Minor parser-feedback quirk

Typing an unparseable multi-word phrase like `north of house` returns *"I don't know the
word 'north'"* — but `north` is a perfectly good direction. The parser is blaming the
first token when the *phrase* is what failed. Low priority, but it reads as a bug to anyone
who fat-fingers a command. Consider "I didn't understand that" for whole-phrase failures,
reserving "I don't know the word X" for genuinely unknown vocabulary.

---

## 2. Imagery — how to make the panels breathe

The static panels are beautiful but, well, static — and "graphic novel" invites a little
more life. In roughly ascending effort:

- **Ambient micro-motion (cheap, high impact).** A slow Ken-Burns drift (2–4% scale/pan
  over 20–30s) on each panel, plus per-region CSS/canvas overlays: a flickering warm mask
  over lantern-lit caves, drifting fog in the maze, a shimmer over water rooms, a slow
  ember rise in the coal mine. Framer Motion is already in the stack. Respect the existing
  `REDUCED_MOTION` guard.
- **A real darkness panel.** Instead of one static grue-warning, render near-black with a
  pair of slowly drifting grue eyes that edge closer the longer you stay in the dark, and
  let `grue-growl` swell with them. This turns a fail-state into the game's best jump-scare.
- **Combat state art.** The troll gets one pose. A quick "troll staggered / wounded"
  variant that swaps on a solid hit (the melee system already knows hit severity) would
  make the fight feel reactive rather than a slideshow.
- **Visual inventory & a visual trophy case.** `ITEM_ART` already maps 25 treasures to
  panels, and the tiered case art (`some / crowded / full`, open/closed) is a highlight.
  Surface it: an `Inventory` grid of item thumbnails, and a full-screen "treasure vault"
  view of what you've banked. The `CaseView` component is already a foothold.
- **Fill the last few generic beats.** Most events have bespoke panels, but the fallback
  treasure pickup still uses a generic `treasure-gleam` when an item lacks art, and a few
  transitions borrow room art. A short pass to give the remaining marquee moments
  (rainbow forming, egg opening in the tree, reservoir draining) their own card would close
  the gap. (Reservoir already has a drained variant — good.)

---

## 3. Sound — small moves, big atmosphere

The audio is original and synthesized, which suits the retro spirit; the region beds
crossfade cleanly (2.5s) and there are region-specific treasure chimes, which is a lovely
detail. Suggestions:

- **Wire `page-turn` to transitions** (see 1.4). This is the single most on-brand audio
  change available and it's free.
- **Layer room-tone one-shots** over the beds: an occasional drip in caves, distant
  machinery near the dam (`dam-machinery` exists), a bat flutter in the mine. Sparse and
  randomized so it never becomes a loop you notice.
- **Low-health cue.** A subtle heartbeat/breath that fades in as wounds accumulate (the
  store already tracks `wounds` → `health` and drives a wound vignette). Pair it with the
  existing `death-stinger`.
- **Escalate the dark.** `grue-growl` exists; make it swell with the proposed darkness
  panel so sound and image finally agree.
- **Verify the set-piece stingers fire** on first occurrence — `case-fanfare` on the first
  deposit, `echo` in the Loud Room, `bell`/`ghost-curse` through the exorcism. The files
  and refs exist; a quick confirmation pass would ensure none are being swallowed by the
  bed-debounce logic.
- **Music/SFX sliders** (see 1.3).

---

## 4. Features — from faithful port to keepsake

These are the things that would make a Gen-X player send the link to everyone they gamed
with in 1983.

- **An illustrated auto-map (toggleable).** The `ancient-map` art already exists in-world.
  An optional, tab-away map of *visited* rooms — drawn in the same ink style — would let
  modern players enjoy the game without a legal pad, while purists leave it off. This is
  the highest-value new feature after the scroll fix.
- **A panel gallery / "art book."** Unlock each panel as you first see it and let players
  browse them in a gallery. For a game whose whole premise is "I always wanted to *see*
  it," a re-viewable art book is the emotional payoff — and it costs almost nothing on top
  of assets you already ship.
- **"Cinematic mode."** A toggle that collapses the parser column and lets the panel plus
  the current text fill the screen, tap/click to advance — a lean-back way to experience
  the story. The parser stays one tap away.
- **Death & victory share cards.** Compose the gorgeous death-screen (or victory-barrow)
  art with the player's score/moves and cause of death into a downloadable card. Zork's
  deaths are half the fun; make them shareable.
- **A "ways you have died" ledger + progressive hints.** Classic Infocom humor plus a
  modern safety net for players who never actually finished Zork (most of us).
- **Accessibility polish.** `aria-live` on the log and `REDUCED_MOTION` handling are
  already there — good. Add a text-size control and confirm the 3-dot health indicator has
  a non-color affordance (shape/number) for colorblind players.

---

## 5. What to do first

| # | Change | Effort | Payoff |
|---|--------|--------|--------|
| 1 | Fix transcript auto-scroll (§1.1) | S | Critical — everything else depends on it |
| 2 | Darkness panel driven by lighting, not movement (§1.2) | S | Restores the game's best mood beat |
| 3 | Wire `page-turn` SFX to transitions (§1.4) | XS | Free, and sells the whole concept |
| 4 | Music/SFX volume sliders (§1.3) | S | Backend already done |
| 5 | Ambient micro-motion + real darkness panel (§2) | M | Panels start to feel alive |
| 6 | Illustrated auto-map (§4) | L | The headline modern-player feature |
| 7 | Panel gallery / art book (§4) | M | The nostalgia payoff |

---

## Closing

I finished my session grinning. The bones are excellent and the art is a love letter. Fix
the scroll so players can actually read the game that's already there, let the panels move
a little and the dark get darker, and give us a map and an art book to keep — and this
stops being "a faithful Zork port with pictures" and becomes the definitive way to
experience the Great Underground Empire.
