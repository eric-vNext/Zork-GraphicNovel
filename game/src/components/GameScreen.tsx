// Main play screen: panel (Framer Motion transitions) + log + command bar.
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../state/store';
import { audio } from '../audio/audioManager';

const QUICK_CHIPS = ['look', 'inventory', 'take all', 'open', 'examine', 'read', 'wait', 'save'];

export function GameScreen({ onHelp }: { onHelp: () => void }) {
  return (
    <div className="game">
      <Stage />
      <div className="right-col">
        <StatusBar onHelp={onHelp} />
        <LogView />
        <CommandBar />
      </div>
    </div>
  );
}

function Stage() {
  const panel = useStore((s) => s.panel);
  const seq = useStore((s) => s.panelSeq);
  const isEvent = useStore((s) => s.panelIsEvent);
  const roomName = useStore((s) => s.roomName);
  const submit = useStore((s) => s.submit);

  const fly = isEvent ? 36 : 24;
  const dur = isEvent ? 0.6 : 0.42;

  return (
    <div className="stage">
      <AnimatePresence mode="sync">
        <motion.img
          key={seq}
          className="panel-img"
          src={`./art/${panel}.webp`}
          alt={roomName}
          initial={{ opacity: 0, x: fly, y: -12, scale: 1.035 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.26 } }}
          transition={{ duration: dur, ease: [0.22, 1, 0.36, 1] }}
        />
      </AnimatePresence>
      <img className="panel-frame" src="./art/ui/panel-frame.webp" alt="" />
      {roomName && <div className="room-caption">{roomName}</div>}
      <div className="updown">
        <button onPointerDown={(e) => { e.preventDefault(); submit('up'); }}>▲</button>
        <button onPointerDown={(e) => { e.preventDefault(); submit('down'); }}>▼</button>
      </div>
      <div className="compass">
        <img src="./art/ui/compass-rose.webp" alt="compass" />
        {(['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const).map((d) => (
          <button
            key={d}
            className={`c-${d}`}
            aria-label={`go ${d}`}
            onPointerDown={(e) => { e.preventDefault(); submit(d); }}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatusBar({ onHelp }: { onHelp: () => void }) {
  const score = useStore((s) => s.score);
  const moves = useStore((s) => s.moves);
  const health = useStore((s) => s.health);
  const submit = useStore((s) => s.submit);
  const inv = useStore((s) => s.inventoryList);
  const [muted, setMuted] = useState(audio.muted);
  const [showInv, setShowInv] = useState(false);

  return (
    <div className="status">
      <span>Score: {score}</span>
      <span>Moves: {moves}</span>
      <span className="health" title="Health">
        {[0, 1, 2].map((i) => <span key={i} className={i < health ? 'lit' : ''} />)}
      </span>
      <span className="spacer" />
      <button onClick={() => setShowInv(!showInv)}>Inventory</button>
      <button onClick={() => submit('save')}>Save</button>
      <button onClick={() => submit('restore')}>Restore</button>
      <button onClick={() => { audio.setMuted(!muted); setMuted(!muted); }}>{muted ? 'Unmute' : 'Mute'}</button>
      <button onClick={onHelp}>Help</button>
      {showInv && (
        <div style={{ flexBasis: '100%', fontFamily: 'Source Serif 4, serif', color: '#e8e2d5', fontSize: 14 }}>
          {inv.length ? `Carrying: ${inv.join(', ')}` : 'You are empty-handed.'}
        </div>
      )}
    </div>
  );
}

function LogView() {
  const log = useStore((s) => s.log);
  const ref = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    const el = ref.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [log]);

  return (
    <div
      className="log"
      ref={ref}
      role="log"
      aria-live="polite"
      onScroll={(e) => {
        const el = e.currentTarget;
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
      }}
    >
      {log.map((l) => (
        <p key={l.id} className={`line ${l.cls}`}>{l.text}</p>
      ))}
    </div>
  );
}

function CommandBar() {
  const submit = useStore((s) => s.submit);
  const chips = useStore((s) => s.chips);
  const [value, setValue] = useState('');
  const [hist, setHist] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const send = (text: string) => {
    if (!text.trim()) return;
    submit(text);
    setHist((h) => [...h, text].slice(-50));
    setHistIdx(-1);
    setValue('');
    // keep keyboard open on mobile: never blur
    inputRef.current?.focus();
  };

  const chipSend = (text: string) => (e: React.PointerEvent) => {
    e.preventDefault(); // don't steal focus -> keyboard stays put
    send(text);
  };

  return (
    <>
      <div className="chips">
        {chips.map((c) => (
          <button key={c} className="chip ask" onPointerDown={chipSend(c)}>{c}</button>
        ))}
        {QUICK_CHIPS.map((c) => (
          <button key={c} className="chip" onPointerDown={chipSend(c)}>{c}</button>
        ))}
      </div>
      <form
        className="cmdbar"
        onSubmit={(e) => { e.preventDefault(); send(value); }}
      >
        <span className="prompt">&gt;</span>
        <input
          ref={inputRef}
          value={value}
          placeholder="What do you do?"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
          autoFocus
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              const idx = histIdx < 0 ? hist.length - 1 : Math.max(0, histIdx - 1);
              if (hist[idx] !== undefined) { setHistIdx(idx); setValue(hist[idx]); }
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (histIdx >= 0) {
                const idx = histIdx + 1;
                if (idx >= hist.length) { setHistIdx(-1); setValue(''); }
                else { setHistIdx(idx); setValue(hist[idx]); }
              }
            }
          }}
        />
        <button type="submit" onPointerDown={(e) => { e.preventDefault(); send(value); }}>Go</button>
      </form>
    </>
  );
}
