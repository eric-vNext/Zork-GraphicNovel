// IndexedDB-backed save slots, additive to the single-slot localStorage
// SAVE/RESTORE verbs in engine.ts (docs/handoff-2026-07-11.md item 6).
// Each slot stores the same JSON produced by Game.exportSave() plus display
// metadata so the UI can list slots without deserializing the full state.
// Slots are namespaced per game, so all three games have their own three.
import type { GameNumber } from './types';

const DB_NAME = 'zork-gn-saves';
// v2 namespaces slots per game: the key becomes `${gameId}:${slot}` so all
// three games get their own three slots. v1 records (Zork I, keyed by a bare
// slot number) are rewritten in place during the upgrade.
const DB_VERSION = 2;
const STORE = 'slots';

export const SAVE_SLOT_COUNT = 3;

export interface SaveSlotRecord {
  /** `${gameId}:${slot}` — the store's key path. */
  key: string;
  game: GameNumber;
  slot: number;
  json: string;
  roomName: string;
  score: number;
  moves: number;
  timestamp: number;
}

export function slotKey(game: GameNumber, slot: number): string {
  return `zork${game}:${slot}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
        return;
      }
      if ((event.oldVersion ?? 0) < 2) {
        // Re-key the v1 slots (all Zork I) into the namespaced store, keeping
        // the player's existing saves.
        const old = req.transaction!.objectStore(STORE);
        const all = old.getAll();
        all.onsuccess = () => {
          const rows: SaveSlotRecord[] = all.result ?? [];
          db.deleteObjectStore(STORE);
          const next = db.createObjectStore(STORE, { keyPath: 'key' });
          for (const row of rows) {
            if (typeof row.slot !== 'number') continue;
            next.put({ ...row, game: 1, key: slotKey(1, row.slot) });
          }
        };
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listSaveSlots(
  game: GameNumber,
  count = SAVE_SLOT_COUNT,
): Promise<(SaveSlotRecord | null)[]> {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readonly');
  const store = tx.objectStore(STORE);
  const results: (SaveSlotRecord | null)[] = new Array(count).fill(null);
  await Promise.all(
    Array.from({ length: count }, (_, i) => i + 1).map(
      (slot) =>
        new Promise<void>((resolve, reject) => {
          const req = store.get(slotKey(game, slot));
          req.onsuccess = () => { results[slot - 1] = req.result ?? null; resolve(); };
          req.onerror = () => reject(req.error);
        }),
    ),
  );
  db.close();
  return results;
}

export async function readSaveSlot(game: GameNumber, slot: number): Promise<SaveSlotRecord | null> {
  const db = await openDb();
  const record = await new Promise<SaveSlotRecord | null>((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(slotKey(game, slot));
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return record;
}

export async function writeSaveSlot(record: Omit<SaveSlotRecord, 'key'>): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ ...record, key: slotKey(record.game, record.slot) });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function deleteSaveSlot(game: GameNumber, slot: number): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(slotKey(game, slot));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

// One-time migration from the pre-slots localStorage save (key 'zork-gn-save',
// removed 2026-07-12 when SAVE/RESTORE were unified onto the slots). Imports it
// as slot 1 if slot 1 is empty, then deletes the key — idempotent, so React
// StrictMode's double-invoked effects are harmless. Returns the migrated slot
// number, or null if there was nothing to migrate.
export async function migrateLegacySave(
  describe: (state: unknown) => { roomName: string; score: number; moves: number },
): Promise<number | null> {
  const LEGACY_KEY = 'zork-gn-save';
  const json = localStorage.getItem(LEGACY_KEY);
  if (!json) return null;
  try {
    const existing = await readSaveSlot(1, 1);
    if (!existing) {
      const meta = describe(JSON.parse(json));
      await writeSaveSlot({ game: 1, slot: 1, json, ...meta, timestamp: Date.now() });
    }
    localStorage.removeItem(LEGACY_KEY);
    return existing ? null : 1;
  } catch {
    return null; // corrupt legacy save: leave the key for manual inspection
  }
}
