# Extended Asset & Presentation Plan (v2)

Continuation of `docs/asset-plan.md` (all Tier-1/Tier-2 items from that plan
are shipped — see `docs/generated-asset-review.md`). This plan catalogs
concrete next-round additions in three lanes: new sound effects, new
event-panel illustrations, and new animation techniques. Every item below
was found by reading the actual engine code (`game/src/engine/*.ts`), not
guessed — file:line references point at the exact `out.tell()` call each
proposal attaches to, so a future session can go straight to implementation
without re-deriving this.

**Note on the audio replacement work in progress:** `assets/audio/sfx/alternatives/`
(currently `troll-grunt`, `water-splash`, `window-open`) is the user's own
in-progress swap of synthesized SFX for real recorded clips. This plan does
not touch those three sounds and assumes they'll be wired in separately —
everything below is about *new* sound/art/motion, not replacing existing
synthesized SFX.

---

## 0. How to read this doc

- **Tier A** — wiring-only. The asset already exists on disk but isn't
  emitted anywhere, or an existing asset can be reused verbatim. Zero new
  generation needed; smallest, highest-value pass.
- **Tier B** — needs one new SFX (via `game/scripts/synth-audio.py`, the
  existing procedural DSP toolkit — no new tooling required).
- **Tier C** — needs one new event-panel illustration (via the media-gen
  nano-banana-pro pipeline, matching the "Storm-Lantern Ink" style already
  locked in `docs/asset-plan.md` §0).
- **Tier D** — animation/motion technique, CSS/Framer Motion only, no new
  assets at all.

Do Tier A first — it's free. Then B and C can interleave; D is independent
of the other three and can happen anytime.

---

## 1. Tier A — wire existing, currently-unused assets

Two image assets already exist in `game/public/art/events/` and are listed
in `EVENT_PANELS` (`game/src/data/presentation.ts`) but are **never emitted
by any code path** — pure oversights from an earlier session:

| Asset | Where it should fire |
|---|---|
| `events/egg-opened` | `specials.ts` `EGG` handler, `open` branch (~line 246) — the moment the egg is pried open and the damaged canary is revealed |
| `events/sword-glow` | `daemons.ts` `I-SWORD` daemon (~line 142) — already has `sfx: sword-glow`, just add the matching `panel:` emit for the "glow very brightly" case |

Also: `explosion.m4a` already exists and is used for the ODYSSEUS
cyclops-through-the-wall gag, but **`gasExplosion()`** (`specials.ts` ~line
856, fired by lighting a match/candle in the gas room, or just entering it
carelessly) has the `events/gas-explosion` panel wired but no sfx at all.
Add `{ type: 'sfx', name: 'explosion' }` there.

Total cost: three one-line `out.emit()` additions. Do this first.

---

## 2. Tier B — new sound effects

All buildable with the existing numpy DSP toolkit in `synth-audio.py`
(`sine`/`noise`/`bp`/`reverb`/`env_perc`/etc. — see the file's own comments
for the palette). Grouped by what they'd sound like.

### Impacts / breaks / collapses
- **`glass-shatter`** — `specials.ts` LAMP `throw` branch (~line 148, lamp
  smashed, light gone permanently) and BOTTLE `throw`/break (~line 329) and
  MIRROR `mung`/break (~line 795, "seven years' bad luck"). One sound, three
  reuse sites — sharp high-frequency noise burst + short reverb tail,
  similar construction to `sfx_sword()`'s clash noise but brighter/glassier.
- **`sand-collapse`** — SAND fifth dig attempt buries the player alive
  (`specials.ts` ~line 433, currently a silent `jigsUp` with no panel or
  sfx at all). Low rumble + falling-grit noise, like a compressed version
  of `bed_mine()`'s timber-groan texture.
- **`boat-puncture`** — INFLATED-BOAT punctured by a carried sharp weapon
  (`specials.ts` ~line 627, "hissing, sputtering, and cursing"). A
  deflating hiss — reuse the noise-burst-into-decay shape from
  `sfx_inflate()` but inverted (loud-to-quiet instead of quiet-to-loud).

### Supernatural / magic
- **`corpse-vanish`** — the "cloud of sinister black fog envelops him...
  the carcass has disappeared" beat shared by troll and thief death
  (`melee.ts` ~line 264, `villainResult`). A dark descending whoosh,
  reusing `sfx_hollow_voice()`'s formant-sweep technique pitched down and
  shortened.
- **`ghost-curse`** — BONES touched/moved/taken summons a ghost that curses
  the player's treasures away (`specials.ts` ~line 692, `BONES` handler —
  currently completely silent for a genuinely punishing hazard). An eerie
  rising formant, cousin to `sfx_hollow_voice()` but higher and more
  plaintive.
- **`mirror-warp`** — MIRROR-1/MIRROR-2 teleport ("a rumble from deep
  within the earth and the room shakes", `specials.ts` ~line 790-791). Low
  sub-bass rumble, similar construction to `sfx_dam()`'s grind+thump but
  shorter and with a pitch-bend swoop.
- **`cyclops-yawn`** — cyclops falls asleep after the drugged water
  (`specials.ts` ~line 588, a major two-step puzzle payoff that's currently
  completely silent). Slow descending sine sweep + a soft noise "breath"
  tail, distinct from `sfx_troll()`'s harsher growl construction.

### Environmental / mechanism
- **`rug-drag`** — RUG moved revealing the trap door (`specials.ts` ~line
  73-79, has a panel already but no sfx). Low-frequency filtered noise
  scrape, short.
- **`dam-gates-close`** — BOLT closing the sluice gates (`specials.ts`
  ~line 449-452, the un-produced mirror image of the fully-produced
  gates-open beat). Cheapest option: just reuse `dam-machinery.m4a`
  wholesale rather than author anything new — it's already the right
  texture, just currently gated to the open-only branch.
- **`putty-seal`** — PUTTY fixes the dam leak (`specials.ts` ~line 470-479,
  "miracle of Zorkian technology" — a genuine puzzle-solved moment,
  currently silent). A short wet squelch/seal sound.
- **`candle-burnout`** — parity fix: `daemons.ts` `I-LANTERN` burnout
  already gets `sfx: lamp-off`, but the parallel `I-CANDLES` burnout
  (~line 51-67) has no sfx at all. Doesn't need to be a *new* sound —
  reusing `lamp-off.m4a` (or a near-silent snuff variant) closes the gap.

### Priority within Tier B
Highest value first: `corpse-vanish` (fires constantly — every troll/thief
kill), `glass-shatter` (three reuse sites), `cyclops-yawn` and
`ghost-curse` (both gate genuinely dramatic, currently-silent story beats).

---

## 3. Tier C — new event-panel illustrations

Same "Storm-Lantern Ink" style block from `docs/asset-plan.md` §0 applies
verbatim to all of these. Suggested prompts are starting points, not final.

- **`events/cyclops-sleeps`** (~line 588 `specials.ts`) — the cyclops
  drugged-water puzzle payoff has zero art today, despite being one of the
  more memorable non-combat puzzle solutions in the game.
  *"The giant cyclops slumped against the cavern wall, jaw slack, mid-yawn,
  one huge hand still loosely gripping the empty bottle, low lantern light
  catching the slack folds of his sleeping face. [STYLE]"*
- **`events/ghost-curse`** (~line 692) — the bones-desecration hazard.
  *"A translucent, wailing spirit rising from a scattered adventurer's
  skeleton, one arm outstretched in accusation, sickly green-white light,
  the viewer's satchel of treasures dissolving into motes at the edge of
  frame. [STYLE]"*
- **`events/mirror-warp`** (~line 790-791) — shared by both mirror rooms
  in both directions.
  *"A cold stone chamber's massive wall mirror rippling like disturbed
  water, the room's own geometry doubling and smearing at the edges as if
  reality is briefly uncertain, dust shaken loose from the ceiling.
  [STYLE]"*
- **`events/lamp-smashed`** (~line 148) — the permanent-light-loss moment.
  *"A brass hurricane lantern shattered on stone flagstones, glass shards
  scattered, the wick guttering its last ember before absolute dark
  closes in from the frame's edges. [STYLE]"*
- **`events/villain-vanish`** (`melee.ts` ~line 264) — shared troll/thief
  death aftermath, distinct from the kill-blow panel a moment earlier.
  *"A cloud of sinister black fog dissipating in an empty stone chamber,
  the last wisps curling away into nothing, a dropped weapon the only
  evidence anyone was ever there. [STYLE]"*
- **`events/canary-song`** (`specials.ts` ~line 256-267, winding the canary
  in the forest) — currently has sfx but no dedicated art for what's a
  distinctly whimsical, magical beat.
  *"A golden clockwork canary mid-song on a gloved palm, a real songbird
  alighting on a branch overhead to answer it, a brass bauble caught
  mid-fall through dappled forest light. [STYLE]"*
- **`events/thief-gift`** (`specials.ts` ~line 554-568, peacefully giving
  the thief an item) — a calmer counterpart to the existing
  `events/thief-encounter` combat art, for the non-violent interaction path.
  *"The thief accepting an offered treasure with an exaggerated, mocking
  bow, stiletto still loosely in hand, more amused than grateful.
  [STYLE]"*

### Lower priority / consider bundling
- **`events/troll-disarmed`** (`melee.ts` ~line 417-418) — the disarmed
  troll "cowers in terror, pleading for his life" — a pathos beat distinct
  from the standard troll-fight art. Nice-to-have, not essential.
  Reasonable to defer since `characters/troll` and `events/troll-fight`
  already cover the room adequately.
- **`events/boat-puncture`** — comedic failure state; low priority, could
  ship with just the Tier B sfx and no dedicated art.

---

## 4. Tier D — animation techniques (no new assets)

Right now the only motion in the app is: the panel fly-in/crossfade on
scene change (`GameScreen.tsx` `PanelImage`) and the idle Ken Burns drift
added this session. `styles.css` has essentially no `@keyframes` at all —
everything else in the UI (health pips, score number, log lines, chips) is
static. That's a lot of cheap, asset-free headroom:

- **Screen shake on impact.** A short CSS-transform jitter on `.stage`
  (translate a few px, 2-3 oscillations, ~150ms) triggered on: a landing
  combat blow (`melee.ts` `HERO_MELEE`/villain-blow outcomes — could gate
  on `SERIOUS_WOUND`/`KILLED` specifically rather than every swing so it
  stays a *punctuation* mark, not noise), an explosion, the sand-collapse
  death, the mirror-warp rumble. Store-side: add a `shake: boolean` pulse
  to `GameEvent` or trigger off existing `sfx` names (`explosion`,
  `troll-grunt` on a wound, etc.) in `store.ts`'s `applyEvents`.
- **Damage/death vignette.** A full-screen radial-gradient overlay (CSS
  only, absolutely positioned over `.stage`) that pulses red briefly on a
  wound and fades to black more slowly on death — reads as pain without
  needing new art, and gives the health-pip loss some visual weight beyond
  the status-bar number changing.
- **Score-gain pulse.** The score number in `StatusBar` currently just
  updates instantly. A brief scale-and-glow pulse (CSS `@keyframes`, 300ms)
  when `score` increases turn-over-turn — cheap, and pairs naturally with
  the region-flavored treasure chime already shipped (same trigger moment).
- **Health-pip reactions.** Similarly, the lantern-segment health pips
  (`.health span.lit`) could get a brief shake+flash when a pip is lost,
  instead of silently swapping the `lit` class.
- **Directional panel transitions.** Right now every panel change uses the
  same fly-in offset (`fly = isEvent ? 36 : 24`, always from the same
  corner). Since `walk`/`goTo` already know the compass direction the
  player moved, the entering panel could slide in *from that direction*
  (north exit → panel enters from top, etc.) — reinforces spatial
  orientation and costs nothing new, just parameterizing the existing
  `initial={{x, y}}` by direction instead of a fixed constant.
- **Log text reveal for dramatic lines only.** Not a typewriter effect on
  every line (too slow for normal play) — but room-name headers and
  `death`-class lines could fade/rise in over ~200ms instead of appearing
  instantly, giving weight to the two moments that matter most without
  touching the pace of ordinary play.
- **Ambient particle overlays, per region.** Purely decorative,
  absolutely-positioned CSS-animated layers drifting slowly over the
  static panel image: dust motes underground/in the house, embers near the
  dam/mine, drifting spores in the temple, fireflies above ground at
  night. Region-flavored the same way the treasure chimes now are
  (`REGION_MUSIC`/`ROOM_PRES` already carries the region per room). This
  is the most involved Tier D item — still no new *image* assets, but it's
  meaningfully more CSS/motion design than the others on this list, closer
  to a half-day than an hour.
- **Theatrical death/victory screen transition.** `screen` currently swaps
  instantly between `play`/`death`/`victory`. A slow desaturate-and-zoom
  into the death/victory art (Framer Motion, reusing the Ken Burns
  primitives already built) would land harder than a hard cut.

### Explicitly out of scope for this plan
- **Parallax/multi-layer depth** would require re-generating art as
  separated foreground/background layers — real new production work, not
  a cheap CSS trick. Worth a future dedicated pass if the above lands well,
  not bundled here.
- **Sprite-based character animation** (the troll actually swinging, etc.)
  is a different medium entirely from this project's static-illustration
  style and would undercut the "graphic novel panel" identity the whole
  game is built around. Not recommended.

---

## 5. Suggested rollout order

1. **Tier A** (three `out.emit()` lines) — do this in the same session as
   anything else, it's free.
2. **Tier B**, prioritized: `corpse-vanish`, `glass-shatter`,
   `cyclops-yawn`, `ghost-curse`, then the rest.
3. **Tier D**'s cheapest wins in parallel with B, since neither blocks the
   other: score-gain pulse, health-pip reaction, directional panel
   transitions, dramatic-line reveal. These are CSS/store-logic only.
4. **Tier C** art generation as a dedicated media-gen pass once B/D land,
   since new art benefits from being reviewed against a more complete,
   more reactive UI rather than the current mostly-static one.
5. Ambient particle overlays and the death/victory transition last — both
   genuinely optional polish, not gap-filling.
