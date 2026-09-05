# Zork I fidelity fixes, 2026-09-04

**For review before deploying.** Phase 0 of the trilogy expansion changed
seven things a Zork I player can see. Every one moves the port *toward* the
original, every one is covered by a test, and none of them is a presentation
choice — they are places where the shipped port and the ZIL disagreed.

They were found two ways: by working the `,ZORK-NUMBER` branch checklist
routine by routine, and by the new differential harness, which diffs our output
against the `COMPILED/zork1.z3` binary the historicalsource release ships.

The `before` column is commit `c31d101` (the shipped game); `after` is `HEAD`.
Both were driven with the same command script.

---

## 1. `IN` crashed the game in 105 of 110 rooms

The extractor that produced `world.gen.json` read every room's `(IN ROOMS)`
containment declaration as an `IN` *direction*. An empty exit object is truthy
in JavaScript, so `goTo` skipped its "you can't go that way" guard and called
`enterRoom(ctx, undefined)`.

```
> in
- !! THREW: Cannot read properties of undefined (reading 'flags')
+ You can't go that way.
```

Fixed by the rebuilt extractor (`utils/extract-world.py`), which distinguishes
`(IN ROOMS)` from `(IN TO ...)`. Pinned by `tests/multigame.test.ts`, which
asserts no room has an exit with no destination, message or routine.

## 2. The Kitchen silently dropped two objects

The bottle and the brown sack are `(IN KITCHEN-TABLE)`, and the table is
`NDESCBIT`. Our room description filtered `NDESCBIT` objects out of the loop
entirely, so the table's contents were never reached.

`PRINT-CONT` (`gverbs.zil:1751`) is a **two-pass** walk. The first pass prints
untouched objects' first-descriptions and recurses into anything you can see
inside; the second prints ordinary listings under a `FIRSTER` header.
`NDESCBIT` suppresses an object's *own* line but not the recursion into it.

```
  Kitchen
  You are in the kitchen of the white house. A table seems to have been used...
+ A bottle is sitting on the table.
+ The glass bottle contains:
+   A quantity of water
+ On the table is an elongated brown sack, smelling of hot peppers.
```

`describe.ts` is now a faithful port of `PRINT-CONT` / `DESCRIBE-OBJECT` /
`FIRSTER`. Verified against the original binary by `tests/differential.test.ts`.

## 3. Object listing order was reversed everywhere

ZIL builds each container's child list by pushing, so `FIRST?`/`NEXT?` yields
the object defined *last* in the source first. We listed in definition order.

```
  Living Room
  You are in the living room. There is a doorway to the east...
- A battery-powered brass lantern is on the trophy case.
  Above the trophy case hangs an elvish sword of great antiquity.
+ A battery-powered brass lantern is on the trophy case.
```

`contents()` now reverses. This affects every room description, every container
listing and the inventory — a broad change, but a one-line one, and the
differential harness confirms it against the original.

## 4. The trophy case had no header of its own

`FIRSTER` (`gverbs.zil:1819`) gives the Zork I trophy case its own line.

```
> look in case
- The trophy case contains:
+ Your collection of treasures consists of:
    A brass lantern
```

## 5. The rank ladder was off by one at every threshold

`V-SCORE` (`1actions.zil:4035`) tests `<G? ,SCORE 330>` — strictly greater. Our
ladder used `>=`, so every boundary score reported the rank above.

```
> score   (with SCORE = 330)
- This gives you the rank of Wizard.
+ This gives you the rank of Master.

> score   (with SCORE = 331)
  This gives you the rank of Wizard.
```

Thresholds are now 350 / 331 / 301 / 201 / 101 / 51 / 26.

## 6. Maze rooms never re-described themselves

`DESCRIBE-ROOM` clears `TOUCHBIT` on `MAZEBIT` rooms (`gverbs.zil:1653`), so
each maze room prints in full on every visit. Without it the maze read as a
list of bare room names, which removes the disorientation that *is* the puzzle.

## 7. The endgame map appeared too early

`SCORE-UPD` (`gverbs.zil:1854`) reveals the map at a **full 350**, which also
requires the four scored rooms and the Drafty Room light bonus. We revealed it
as soon as every treasure was in the case, which is reachable earlier.

---

## What is not a change

- The `in 9 moves` → `in 10 moves` difference in the probe transcript is the
  probe's own script gaining a `take lamp`, not a behaviour change.
- The troll's arrival-turn blow still lands a beat later than the original.
  That is the deliberate `justArrived` presentation choice documented in
  `engine/types.ts`, and it is recorded as a known diff in the harness.

## Verification

`tsc --noEmit` clean, `vite build` clean, **103 tests pass** including the full
350/350 BFS playthrough, and the app was driven in the browser through the
opening into the Kitchen with no console errors.

## Reproducing this comparison

```bash
git worktree add --detach /tmp/zork-before c31d101
```

then run the same command script through both `Game` classes. The probe used
for the transcripts above is not committed — it is six lines of vitest.
