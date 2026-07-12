// Multi-slot save/load menu backed by IndexedDB (docs/handoff-2026-07-11.md
// item 6). Additive to the classic single-slot SAVE/RESTORE verbs, which
// still work unchanged via localStorage in engine.ts.
import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { Out } from '../engine/world';
import { DATA } from '../engine/world';
import {
  SAVE_SLOT_COUNT,
  listSaveSlots,
  writeSaveSlot,
  deleteSaveSlot,
  type SaveSlotRecord,
} from '../engine/idbSaves';

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function SaveLoadModal({ onClose }: { onClose: () => void }) {
  const game = useStore((s) => s.game);
  const screen = useStore((s) => s.screen);
  const begin = useStore((s) => s.begin);
  const applyEvents = useStore((s) => s.applyEvents);

  const [slots, setSlots] = useState<(SaveSlotRecord | null)[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');

  const refresh = () => {
    listSaveSlots().then(setSlots).catch(() => setError('Could not read save slots on this device.'));
  };

  useEffect(refresh, []);

  const canSave = screen === 'play' || screen === 'death';

  const handleSave = async (slot: number) => {
    setBusy(slot);
    setError('');
    try {
      const json = game.exportSave();
      const state = JSON.parse(json);
      await writeSaveSlot({
        slot,
        json,
        roomName: DATA.rooms[state.here]?.desc ?? state.here,
        score: state.counters?.score ?? 0,
        moves: state.counters?.moves ?? 0,
        timestamp: Date.now(),
      });
      refresh();
    } catch {
      setError('Save failed.');
    } finally {
      setBusy(null);
    }
  };

  const handleLoad = async (record: SaveSlotRecord) => {
    setBusy(record.slot);
    setError('');
    try {
      if (screen !== 'play') begin();
      const out = new Out();
      const ok = game.importSave(record.json, out);
      if (ok) {
        applyEvents(out.events);
        onClose();
      } else {
        setError('That save slot is corrupted.');
      }
    } catch {
      setError('Load failed.');
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (slot: number) => {
    setBusy(slot);
    setError('');
    try {
      await deleteSaveSlot(slot);
      refresh();
    } catch {
      setError('Delete failed.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="modal-wrap" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Save Slots</h3>
        <p>
          These live in this browser's local storage (IndexedDB), separate from the classic
          <code> save</code>/<code>restore</code> commands. Three slots, on this device only.
        </p>
        {error && <p style={{ color: '#e08a8a' }}>{error}</p>}
        <div className="save-slots">
          {(slots ?? Array.from({ length: SAVE_SLOT_COUNT }, () => null)).map((record, i) => {
            const slot = i + 1;
            const isBusy = busy === slot;
            return (
              <div key={slot} className="save-slot">
                <div className="save-slot-info">
                  <strong>Slot {slot}</strong>
                  {record ? (
                    <span>
                      {record.roomName} — Score {record.score}, {record.moves} moves
                      <br />
                      <em>{formatTimestamp(record.timestamp)}</em>
                    </span>
                  ) : (
                    <span>Empty</span>
                  )}
                </div>
                <div className="save-slot-actions">
                  <button disabled={!canSave || isBusy} onClick={() => handleSave(slot)}>
                    Save
                  </button>
                  <button disabled={!record || isBusy} onClick={() => record && handleLoad(record)}>
                    Load
                  </button>
                  <button disabled={!record || isBusy} onClick={() => handleDelete(slot)}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="btns" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ background: '#241f14', color: '#e9dfa8', border: '1px solid #c8a24a', padding: '6px 18px', cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
