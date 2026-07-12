# Saved games: unifying save/restore

Status: **approved and implemented** (2026-07-12). The "Recommended
approach" below is what shipped; section headings kept as written for the
approval record.

## The problem

The game currently has two unrelated save mechanisms:

| Path | Storage | Reached via |
|---|---|---|
| Classic `SAVE`/`RESTORE` verbs | one `localStorage` key (`zork-gn-save`) | typing the commands, HUD "Save"/"Restore" buttons, Title & Death screen "Restore" buttons |
| Save slots (added 2026-07-12) | IndexedDB, 3 slots with metadata | HUD "Slots" button, "Save Slots" on Title/Death screens |

They don't see each other's saves. The HUD carries three buttons (Save,
Restore, Slots) for what is conceptually one feature. Two adjacent bugs:

- Typed `RESTART` says "Use the menu (or reload) to restart" — no such
  menu exists.
- When dead, the engine prints "You are dead. RESTART or RESTORE a saved
  game." but then rejects **all** input, including RESTART and RESTORE
  ([engine.ts:117](../game/src/engine/engine.ts)).

## What the original game did

In the 1980s release, `V-SAVE` is just `<SAVE>` + "Ok."/"Failed."
(`gverbs.zil:78-82`). The **interpreter** — not the game — prompts for a
filename. So "typing SAVE brings up a file picker" is not a modern
compromise; it's exactly how Zork worked on real hardware. Interpreters
like dfrotz also default to the last filename used, so "re-save to where
I saved last time without re-picking" is period-authentic too.

`V-RESTART` (`gverbs.zil:63-69`) prints the score, asks **"Do you wish to
restart? (Y is affirmative):"**, and restarts on yes.

## Recommended approach: one store, active-slot verbs

**Single storage: the 3 IndexedDB slots. The localStorage path is deleted.**
The engine stays synchronous and storage-agnostic — it emits request
events; the store layer (which owns `idbSaves.ts`) fulfills them.

### Player-visible behavior

- **`SAVE`** (typed): if there's an *active slot*, overwrite it and print
  `Ok.` — otherwise open the slot panel in save mode. Picking a slot
  saves to it, marks it active, prints `Ok.`
- **`RESTORE`** (typed): if there's an active slot with a save, load it
  (`Ok.` + room description, as now) — otherwise open the panel in load
  mode.
- **Active slot** = the last slot the player saved to or loaded from,
  shown with a marker in the panel, persisted in `localStorage`
  (`zork-gn-active-slot`) so it survives reloads.
- **`RESTART`** (typed): faithful ZIL flow — report score, ask "Do you
  wish to restart? (Y is affirmative):" using the existing
  pending-question/chips machinery, restart on yes.
- **HUD**: the Save / Restore / Slots trio becomes one **"Saves"** button
  (opens the panel) plus a **"Restart"** button (asks the same Y/N
  question via the log rather than restarting instantly). Net: three
  buttons become two, and every path lands in the same panel.
- **Title screen**: "Restore" and "Save Slots" merge into one
  **"Restore"** button that opens the panel in load mode. **Death
  screen**: same, keeping "Restart".
- **Dead-state fix**: when dead, `restore` and `restart` (and `score`)
  are dispatched instead of swallowed, matching the message the game
  itself prints.

### Migration

On first boot, if legacy `zork-gn-save` exists in localStorage and slot 1
is empty: import it into slot 1, mark slot 1 active, delete the key.
Idempotent (second run finds no key), so React StrictMode double-effects
are harmless. Nobody loses an existing save.

### Engine/store contract (implementation sketch)

`Game.execute()` is synchronous; IndexedDB is async. So:

- New `GameEvent` variants: `{ type: 'save-request' }`,
  `{ type: 'restore-request' }`, `{ type: 'restart' }`.
- Engine's `save`/`restore` verb cases emit these instead of touching
  storage (Loud Room gating and dead-state rules stay in the engine,
  unchanged). `exportSave()`/`importSave()` remain the engine's whole
  storage surface.
- `store.applyEvents` handles them: perform the IndexedDB work, then
  append the result (`Ok.` / `Failed.` / room look) to the log and
  refresh HUD state. The slot panel component is reused for the
  no-active-slot case via a `mode: 'save' | 'load'` prop.

## Alternatives considered

**B. No active slot — always open the picker.** One less concept; every
SAVE costs a tap. Rejected because repeat-saving is the most common save
action in a long Zork session, and "default to last used" matches real
interpreter behavior anyway. (If active-slot ever feels confusing, this
is the easy fallback — same architecture, one `if` removed.)

**C. Single save slot, no picker.** Maximum simplicity: SAVE/RESTORE act
on one implicit save; delete the slots UI shipped yesterday. Rejected —
one save slot in a game with irreversible mistakes (burned leaves, eaten
garlic, dead thief) invites unrecoverable states; slots exist precisely
because players fork before risky sections.

**D. Autosave every turn + slots for manual saves.** Modern feel, but a
fidelity departure: Zork's risk economy assumes deliberate saves, and an
every-turn autosave makes death nearly meaningless. Rejected.

## Out of scope

- Quetzal-format saves (interop with real interpreters) — orthogonal;
  JSON snapshots stay.
- Cross-device sync — IndexedDB is per-browser by design here.
