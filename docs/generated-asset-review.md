# Generated Asset Review

**Phase 5 deliverable.** Status of all generated media as of 2026-07-10. Generation model: **nano-banana-pro** (text-to-image) and **nano-banana-pro/edit** (style-referenced) via media-gen/Fal.ai, per `docs/asset-plan.md`.

## Summary

| Category | Path | Generated | Status |
|---|---|---|---|
| Room panels | `assets/rooms/` | **74** | ✅ All Tier-1 present, QA'd |
| Event panels | `assets/events/` | **17** | ✅ All Tier-1 present, QA'd |
| Character panels | `assets/characters/` | **4** (troll, thief, cyclops, bat) | ✅ Ready |
| Item close-ups | `assets/items/` | **15** | ✅ Ready |
| UI & frontispiece | `assets/ui/` | **6** | ✅ Ready (3 with alpha transparency) |
| **Total images** | | **116** | **All Tier-1 assets ready** |
| Music beds | `assets/audio/music/` | 0 | ⏳ Deferred to build phase (see below) |
| SFX | `assets/audio/sfx/` | 0 | ⏳ Deferred to build phase (see below) |

Masters are ~2430×1620 PNG (~6–7 MB each, ~800 MB total). These are **source masters only** — the build phase converts to resized WebP (~300 KB desktop / ~90 KB mobile variants, ~30 MB shipped total, lazy-loaded per region).

## Style consistency

- Art direction locked via an 8-image anchor set before volume generation (west-of-house → style reference for all above-ground panels; troll-room + west-of-house for underground; brass-lantern for item plates).
- The "Storm-Lantern Ink" look (ink linework + gouache, muted earthy palette, chiaroscuro lantern light) held across all 116 images. Regional palette shifts came through as planned (green haze in the Gas Room, spirit-glow at Hades, chalk-white river cliffs, violet endgame dawn).
- Adventurer appears only as hands/back-of-shoulder (verified in lamp-lit, resurrection, mailbox-open, case-deposit, victory-barrow). The grue is never depicted beyond two dim eye-points in `grue-warning`.

## QA performed & issues fixed

1. **White "page margin" bands** (edit-model artifact echoing the reference's baked border): detected on 5 of the first 7 anchor images. Fixed by re-cropping the reference, adding an explicit full-bleed instruction to every prompt, and adding automated white-band detection with up to 2 retries to the batch driver. 12 automatic retries fired during the main run; final set is clean.
2. **Interior white-patch scan** across all 116 images flagged 9; visual review confirmed 6 as legitimate highlights (explosion flash, dawn sky, water spray, spirit glow) and 3 as defects — `living-room`, `river-upper`, `resurrection` — all regenerated and verified.
3. **`river-upper` content fix**: original showed two visible boaters, breaking the player-as-camera rule; regenerated as first-person empty boat.
4. **Transparency assets**: `logotype`, `panel-frame`, `compass-rose` generated on white and cut out via luminance keying with edge feathering (verified over dark background). The first `panel-frame` came back on gray gradient paper and was regenerated with a strict flat-white isolation prompt — now a clean hand-inked frame, 10% opaque coverage, transparent center and surround.

## Owner review round (2026-07-10) — all resolved

- **Cropped** (flat dark-bar defects, ~400–460 px, detected and trimmed programmatically, compositions verified intact): `characters/cyclops`, `items/crystal-trident`, `silver-chalice`, `sceptre`, `painting`, `ivory-torch`, `gold-coffin`, `brass-lantern`, `bell-book-candles`. Item plates re-squared to 1:1 after trim.
- **Regenerated per owner direction (12)**: `lamp-lit` (single hand, was three), `thief` + `thief-encounter` (redesigned: hooded cape, shadowed face with stubble, no background figures — the old background lantern-bearer is gone), `living-room` (empty trophy case; door carvings now wordless ornamental flourishes), `living-room-trapdoor` (open trap door on pure blackness — no stairs, per owner override of the source's "rickety staircase" line), `treasure-room` (stone staircase instead of rope ladder, per source text), `sandy-beach` (boat removed — it's a movable object, shovel is the focal point), `river-lower` + `white-cliffs` (consistent patched yellow inflatable, no engine, no wooden boats, bars fixed), `reservoir-drained`, `forest-dark`, `victory-barrow` (white-bar defects fixed).
- **Consistency fix**: `living-room-trapdoor` re-derived from `living-room.png` as an image-to-image edit so the two states show the identical room (same door, case, sword, table) with only the rug/trapdoor changed.

## Known nits (acceptable for v1)

- Titles/lettering the model painted diegetically (rune-carved barrow arch, engravings) is stylized gibberish — appropriate for background art, never used to convey information.
- Tier-2 variants from `asset-plan.md` (trophy-case-full, dam-gates-open, maintenance-flooding, hades-banished, grating-open ×2, cyclops-fled, rainbow-solid, west-of-house-won, plus 12 T2 events and 8 T2 items) are **not yet generated**; the engine will fall back to base panels. Generate on request or during polish.

## Raw generations

Every generation (including rejected attempts) is archived by the media-gen pipeline under `~/Documents/Media Gen/2026-07-10-zork-*/` with full prompt metadata (`prompt.md` per folder). Rejects were not copied into `assets/raw-generations/` to keep the repo lean; the folder remains as the designated location if curation is wanted.

## Audio plan status

**Not yet generated — by design.** The media-gen registry currently exposes image/video/upscale models only (no music model), so per `research-report.md` §6 the fallback method is locked in:

- **Music beds (10)**: composed offline via scriptable synthesis (Tone.js offline render / Node WebAudio script) during Phase 6 — dark ambient loops per region, 60–90 s seamless, OGG+M4A.
- **SFX (~29)**: hand-authored via the same offline synthesis script — full list in `asset-plan.md` §6.
- Nothing sampled or licensed; 100% original synthesis. Mix targets: beds ≈ -20 LUFS, SFX ≤ -14 LUFS peaks, < 4 MB total shipped audio.

## Review artifacts

- Contact sheet of all 116 assets: generated during review (scratchpad `contact-sheet.jpg`, shared in chat).
- Batch manifests + per-asset generation logs: scratchpad `anchors.json`, `main.json`, `fixes.json`, `*.log.jsonl`.
