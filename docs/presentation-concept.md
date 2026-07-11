# Presentation Concept — "Zork I: The Great Underground Empire — Graphic Novel Edition"

**Phase 2 deliverable.** How we *present* the unmodified Zork I. Nothing here changes game logic, text, or geography.

---

## 1. Screen Layout

The screen is composed of three persistent elements — **Panel** (illustration), **Log** (scrollback of all room/parser text), **Command Bar** (input + chips) — plus a thin **Status Strip** (score, moves, health lantern, volume, save/restore).

### Desktop / Landscape (≥ 900px wide or landscape aspect)

```
┌─────────────────────────────┬──────────────────────────┐
│                             │ STATUS STRIP             │
│                             ├──────────────────────────┤
│        PANEL                │  LOG (scrollback)        │
│   (illustrated, framed,     │  West of House           │
│    ~58% width, letterboxed  │  You are standing in an  │
│    3:2 image, caption bar)  │  open field west of a    │
│                             │  white house...          │
│  ┌ caption: room name ┐     │  > open mailbox          │
│                             │  Opening the small       │
│                             │  mailbox reveals a       │
│                             │  leaflet.                │
│                             ├──────────────────────────┤
│                             │  > _        [chips][⌘]   │
└─────────────────────────────┴──────────────────────────┘
```

- Panel column: dark charcoal "page" background; the 3:2 image sits in an inked comic frame with a small caption plate (current room name in caption lettering). Compass rose overlay bottom-left of the panel (clickable, subtle).
- Log column: fixed-width column optimized to ~60–70 characters per line for reading; auto-scrolls to bottom on new text; user scroll-up pauses auto-scroll until they return to bottom (standard chat behavior).
- Command bar pinned at bottom of log column.

### Mobile / Portrait

```
┌───────────────────────┐
│ STATUS STRIP (thin)   │
├───────────────────────┤
│  PANEL  (3:2, ~38%    │  ← collapses to ~72px strip when
│  of viewport height)  │    keyboard is open (visualViewport)
├───────────────────────┤
│  LOG (flex-grows,     │
│  auto-scroll)         │
├───────────────────────┤
│ [chips: look inv ... ]│  ← horizontally scrollable chip row
│ [ > input       (⏎) ] │  ← pinned above soft keyboard
└───────────────────────┘
```

- **Keyboard-open behavior:** panel animates down to a letterboxed strip (a wide crop of the same art) so the last two responses + input remain visible. When keyboard closes, panel expands back.
- **Tap the panel** to toggle "art focus" (panel expands, log collapses to 3 lines) vs. "read focus"; a drag handle between panel and log allows manual balance. Swipe down on the log header also expands art.
- Chips row + compass keep whole play sessions possible without the keyboard (see `research-report.md` §4).

## 2. Panel Transition Language

The signature move — every new panel behaves like a comic page turn caught mid-motion:

- **Incoming panel:** opacity 0→1 over **420 ms**, combined with a fly-in from **24px right and 12px up, plus scale 1.035→1.0**, easing `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quint feel — fast arrival, soft settle). Event panels (deaths, victory, thief) use a slightly bigger entrance: 600 ms, from 36px, with a 60 ms white-flash-free "ink dip" (background darkens 8%).
- **Outgoing panel:** simple opacity 1→0 over **260 ms**, no movement (movement on both layers reads as smearing). Outgoing sits *under* incoming (z-order), so overlap never flickers.
- **Interruption rule:** transitions are interruptible and last-write-wins. If the player types three commands in two seconds, intermediate panels are skipped — only the final target panel animates in. No queue, no stacking.
- **Text never waits.** Log text renders on frame 0 of the response; the panel animation runs in parallel. (Design pillar 2, enforced structurally.)
- **Same-room events** (e.g., lamp lit while standing still) crossfade panel-to-panel with the standard 420 ms but *no* fly-in — movement is reserved for *travel and drama*.
- Region change additionally triggers the 2–3 s music crossfade; panel timing is unchanged (audio is slower than art on purpose — light travels faster than sound).
- `prefers-reduced-motion`: fly-in and scale disabled; pure 300 ms crossfade.

## 3. Art Direction

**One style for everything** (locked via a shared style block in every generation prompt):

> **"Storm-Lantern Ink"** — bold expressive ink linework with painterly gouache shading; muted, earthy palette (bone, moss, rust, slate) that shifts per region; dramatic chiaroscuro single-source lighting (sun shafts above ground, lantern/torch pools below); 1980s New England woods Americana meets subterranean fantasy gloom; whimsy allowed in details (the mailbox, the songbird), dread in the darks; every image composed as a discrete comic panel with a clear focal point and quiet negative space near one edge for captions; **no text, no speech bubbles, no borders baked into the art** (the frame is a UI overlay).

- **Light is the protagonist.** Above ground: watery daylight. Underground: the lantern's warm pool against blue-black darkness. Darkness panels are *almost* black with the faintest suggestion of space — the grue is never depicted (two eyes at most, in the grue-warning panel — canonical restraint).
- Consistency mechanics: fixed palette anchors per region (see `region-design.md`), the adventurer is shown rarely and only from behind/hands (player-as-camera), recurring props (lamp, sword) match their item close-ups.
- Panels leave caption space; UI never covers focal detail.

## 4. Typography & UI Chrome

- **Room names / captions:** a hand-lettered comic-caption face (e.g., an OFL caption font in the CC-licensed comic-lettering family) in small yellowed caption plates with an ink border — classic graphic-novel location captions.
- **Body / parser text:** a highly readable humanist serif (e.g., *Source Serif*) — prose, not terminal. **Player's own commands** echo in a monospace (e.g., *JetBrains Mono*) prefixed with the classic `>`, in a distinct ink-blue — the one deliberate terminal artifact, honoring the parser.
- **System messages** (score changes, save confirmations, deaths) render inside caption plates — e.g., death text arrives in a black plate with off-white lettering.
- Status strip: score/moves as a small brass plaque motif; health as a lantern icon that dims with wounds; mute/volume, save/restore as inked icons.
- Colors: parchment-on-charcoal. Log background `#17181c`, text `#e8e2d5`, commands `#7fb4d9`, caption plates `#e9dfa8`/ink.
- All UI chrome is CSS/SVG + the generated frame/texture assets — text is always real text (selectable, screen-readable), never baked into images.

## 5. Audio Direction

- **Beds:** one ambient loop per region (see `region-design.md` for moods). All beds are sparse, low-mid register, ~-20 LUFS quiet — under-the-reading texture, not soundtrack.
- **Transitions:** on region change, current bed fades out over 2.5 s while next fades in over 2.5 s (equal-power crossfade via Howler volume ramps). Rapid region flip-flop (player pacing over a border) is debounced: a bed must play ≥8 s before the next crossfade begins.
- **SFX palette:** short (0.2–1.5 s), dry, "foley-in-a-stone-room" character; one family of reverb so everything sounds like the same world. Triggered by world events, never by keystrokes. Death stinger duck-fades the music bed to 20% for 4 s.
- **Mix rules:** SFX bus and music bus have independent persisted volumes + master mute. First user gesture unlocks audio (mobile requirement); title screen "begin" click doubles as the unlock.

## 6. Accessibility & Legibility Floor

- **Text-only fidelity:** with images and audio disabled (settings toggle: "Classic Mode"), the game is *exactly* classic Zork — full text, full parser, status line. Art/audio are additive layers; the engine never gates progress on them.
- Log is a `role="log"` live region (screen readers announce responses); panels carry alt text (room name + one-line scene description); all controls keyboard-reachable; focus stays in the input by default.
- Contrast: body text ≥ 7:1 on its background; minimum 16px body on mobile; user font-size setting (S/M/L) persisted.
- `prefers-reduced-motion` honored (§2); captions/status never rely on color alone.
- Verbose/brief/superbrief behave exactly as original — presentation respects them (brief mode still shows the room panel; text follows original rules).
