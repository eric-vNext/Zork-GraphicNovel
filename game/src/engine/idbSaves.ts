// IndexedDB-backed save slots, additive to the single-slot localStorage
// SAVE/RESTORE verbs in engine.ts (docs/handoff-2026-07-11.md item 6).
// Each slot stores the same JSON produced by Game.exportSave() plus display
// metadata so the UI can list slots without deserializing the full state.

const DB_NAME = 'zork-gn-saves';
const DB_VERSION = 1;
const STORE = 'slots';

export const SAVE_SLOT_COUNT = 3;

export interface SaveSlotRecord {
  slot: number;
  json: string;
  roomName: string;
  score: number;
  moves: number;
  timestamp: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'slot' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listSaveSlots(count = SAVE_SLOT_COUNT): Promise<(SaveSlotRecord | null)[]> {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readonly');
  const store = tx.objectStore(STORE);
  const results: (SaveSlotRecord | null)[] = new Array(count).fill(null);
  await Promise.all(
    Array.from({ length: count }, (_, i) => i + 1).map(
      (slot) =>
        new Promise<void>((resolve, reject) => {
          const req = store.get(slot);
          req.onsuccess = () => { results[slot - 1] = req.result ?? null; resolve(); };
          req.onerror = () => reject(req.error);
        }),
    ),
  );
  db.close();
  return results;
}

export async function writeSaveSlot(record: SaveSlotRecord): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function deleteSaveSlot(slot: number): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(slot);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
