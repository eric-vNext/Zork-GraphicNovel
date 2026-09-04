# Vendored ZIL sources

Historical source releases from the `historicalsource` GitHub organization, kept
verbatim for reference and for the world-data extractor (`utils/extract-world.py`).

| Directory | Upstream | Pinned commit |
|---|---|---|
| `zork1-source/` | https://github.com/historicalsource/zork1 | (vendored 2026-07-10) |
| `zork2-source/` | https://github.com/historicalsource/zork2 | `3da9661` (2025-11-21) |
| `zork3-source/` | https://github.com/historicalsource/zork3 | `3ec9ed4` (2025-11-21) |

Vendored complete except `.git`. Note that zork2/zork3 upstream also ship the
generated `.zap` / `.xzap` assembly listings, which zork1 upstream does not; they
are kept for completeness and are not inputs to anything we build.

## What actually compiles

Each game's top-level `zorkN.zil` `INSERT-FILE`s seven shared modules plus exactly
two game-specific files:

```
gmacros · gsyntax · gglobals · gclock · gmain · gparser · gverbs   (shared)
Ndungeon.zil · Nactions.zil                                        (per game)
```

The seven shared modules are **byte-identical between Zork II and Zork III**, and
differ from Zork I's copies only in commented-out (`;<...>`) dead code. Per-game
variation is resolved at compile time by `,ZORK-NUMBER`. See
`docs/trilogy-expansion-brief.md` §2.

## Caution: zork3 carries pre-"renovation" duplicates

`zork3-source/` also contains an older generation of the same game that is **not**
in the build and must not be ported from:

```
actions.zil  dungeon.zil  shadow.zil  tm.zil  parser.zil
verbs.zil    syntax.zil   macros.zil  main.zil  clock.zil  demons.zil
```

`shadow.zil` and `tm.zil` were folded into `3actions.zil`. Port only what
`zork3.zil` inserts.
