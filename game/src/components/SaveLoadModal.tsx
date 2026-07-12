// The save-slots panel — the one UI for all saving/loading (docs/saved-games.md).
// Typed SAVE/RESTORE act on the active slot and open this panel when there
// isn't one; the panel's own buttons go through the same store actions.
import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import {
  SAVE_SLOT_COUNT,
  listSaveSlots,
  deleteSaveSlot,
  type SaveSlotRecord,
} from '../engine/idbSaves';

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function SaveLoadModal() {
  const mode = useStore((s) => s.slotsOpen);
  const screen = useStore((s) => s.screen);
  const activeSlot = useStore((s) => s.activeSlot);
  const saveToSlot = useStore((s) => s.saveToSlot);
  const loadSlot = useStore((s) => s.loadSlot);
  const closeSlots = useStore((s) => s.closeSlots);

  const [slots, setSlots] = useState<(SaveSlotRecord | null)[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');

  const refresh = () => {
    listSaveSlots().then(setSlots).catch(() => setError('Could not read save slots on this device.'));
  };

  useEffect(refresh, []);

  const canSave = screen === 'play';

  const handleSave = async (slot: number) => {
    setBusy(slot);
    setError('');
    const ok = await saveToSlot(slot);
    if (!ok) setError('Save failed.');
    setBusy(null);
    if (ok) closeSlots();
  };

  const handleLoad = async (slot: number) => {
    setBusy(slot);
    setError('');
    const ok = await loadSlot(slot);
    if (!ok) setError('That save slot could not be loaded.');
    setBusy(null);
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
    <div className="modal-wrap" onClick={closeSlots}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{mode === 'save' ? 'Save Game' : 'Restore Game'}</h3>
        <p>
          {mode === 'save'
            ? 'Choose a slot to save to. '
            : 'Choose a save to restore. '}
          Typed <code>save</code>/<code>restore</code> use your last-used slot
          (marked ★). Saves live in this browser only.
        </p>
        {error && <p style={{ color: '#e08a8a' }}>{error}</p>}
        <div className="save-slots">
          {(slots ?? Array.from({ length: SAVE_SLOT_COUNT }, () => null)).map((record, i) => {
            const slot = i + 1;
            const isBusy = busy === slot;
            return (
              <div key={slot} className="save-slot">
                <div className="save-slot-info">
                  <strong>{activeSlot === slot ? '★ ' : ''}Slot {slot}</strong>
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
                  <button disabled={!record || isBusy} onClick={() => handleLoad(slot)}>
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
            onClick={closeSlots}
            style={{ background: '#241f14', color: '#e9dfa8', border: '1px solid #c8a24a', padding: '6px 18px', cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
