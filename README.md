# Zork I: The Great Underground Empire — Graphic Novel Edition

A parser-first, illustrated browser port of the 1980 Infocom classic, built from the
open-source [historical ZIL source release](https://github.com/historicalsource/zork1).
The original room graph, objects, puzzles, deaths, scoring (350 points), and text are
ported faithfully; every room and major event is illustrated with an original
AI-generated graphic-novel panel, backed by original synthesized ambient music and SFX.

**Play it:** https://eric-vnext.github.io/Zork-GraphicNovel/

## Highlights

- Native TypeScript reimplementation of the Zork I engine — world data extracted
  mechanically from `1dungeon.zil`, verbatim text, ZIL-order action dispatch, all
  daemons/timers (lamp fuel, thief AI, combat, flood, exorcism…)
- Classic parser: disambiguation, `ALL`/`AND`, `IT`, `AGAIN`, abbreviations —
  with disambiguation answers offered as tappable chips on mobile
- 116 original illustrated panels with comic fade/fly-in transitions (Framer Motion)
- 10 original synthesized region music beds with crossfades + 33 SFX (Howler.js)
- Save/restore (localStorage + JSON export), score/moves/health UI, help panel
- Proven completable: CI runs a full 350/350-point automated playthrough

## Development

```bash
cd game
npm install
npm run dev      # http://localhost:5173
npm test         # engine tests incl. the full 350-point run
npm run build    # static build in game/dist
```

Docs: [research](docs/research-report.md) · [presentation concept](docs/presentation-concept.md) ·
[region design](docs/region-design.md) · [asset plan](docs/asset-plan.md) ·
[asset review](docs/generated-asset-review.md) · [final build report](docs/final-build-report.md)

Art/audio masters are not committed (large); delivery copies live in `game/public/`.
Masters are regenerable via `docs/asset-plan.md` prompts and `game/scripts/synth-audio.py`.

A personal, non-commercial project. Zork is a trademark of Activision; the ZIL source was
released for historical/educational study, and this port reuses its text and logic in that
spirit. All artwork and audio here are original.
