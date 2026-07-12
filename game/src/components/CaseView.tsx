// "Inside the trophy case" museum inset: opens on EXAMINE CASE / LOOK IN CASE
// when at least one treasure is deposited. Each treasure gets a framed
// miniature of its dramatic item panel with a name plaque — inset panels on a
// comic page, not sprites pasted into the room painting (docs/handoff notes
// on why compositing onto the case art was rejected).
import { motion } from 'framer-motion';
import { useStore } from '../state/store';
import { ITEM_ART } from '../data/presentation';

const REDUCED_MOTION = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function CaseView() {
  const items = useStore((s) => s.caseView);
  const close = useStore((s) => s.closeCaseView);
  if (!items) return null;

  const total = items.reduce((sum, it) => sum + it.points, 0);
  return (
    <div className="modal-wrap" onClick={close}>
      <motion.div
        className="case-view"
        onClick={(e) => e.stopPropagation()}
        initial={REDUCED_MOTION ? false : { opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <h3>The Trophy Case</h3>
        <div className="case-cells">
          {items.map((it) => (
            <figure key={it.id} className="case-cell">
              {ITEM_ART[it.id] ? (
                <img src={`./art/items/${ITEM_ART[it.id]}.webp`} alt={it.name} loading="lazy" />
              ) : (
                <div className="case-cell-blank" aria-hidden="true">✦</div>
              )}
              <figcaption>
                {it.name}
                <span>{it.points} pts</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="case-total">
          {items.length} treasure{items.length === 1 ? '' : 's'} · {total} points on deposit
        </p>
        <div className="btns" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={close}
            style={{ background: '#241f14', color: '#e9dfa8', border: '1px solid #c8a24a', padding: '6px 18px', cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
