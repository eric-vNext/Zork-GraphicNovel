// Main play screen: panel (Framer Motion transitions) + log + command bar.
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../state/store';
import { audio } from '../audio/audioManager';

// Ambient decoration per region — dust motes underground/in the house,
// fireflies above ground and at the endgame, embers near the dam/mine,
// drifting spores in the temple. Purely cosmetic, no new art needed.
const PARTICLE_FLAVOR: Record<string, 'dust' | 'firefly' | 'ember' | 'spore' | 'none'> = {
  above: 'firefly', house: 'dust', underground: 'dust', maze: 'dust',
  temple: 'spore', dam: 'ember', mine: 'ember', endgame: 'firefly',
};

const QUICK_CHIPS = ['look', 'up', 'down', 'inventory', 'take all', 'open', 'examine', 'read', 'wait', 'save'];

export function GameScreen({ onHelp }: { onHelp: () => void }) {
  // Pin the app to the visual viewport so the soft keyboard overlays instead of
  // scrolling the page: the panel stays put and only the log compresses.
  useEffect(() => {
    const vv = window.visualViewport;
    const app = document.querySelector<HTMLElement>('.app');
    if (!vv || !app) return;
    // On Android, vv fires resize on nearly every keystroke (the predictive-text
    // bar changes height), so this must coalesce bursts into one frame and skip
    // writes when nothing changed — otherwise every keystroke forces a reflow
    // and a scrollTo, which reads as screen flicker while typing.
    let raf = 0;
    let lastHeight = -1;
    let lastTop = -1;
    const sync = () => {
      raf = 0;
      const height = Math.round(vv.height);
      const top = Math.round(vv.offsetTop);
      if (height !== lastHeight) { app.style.height = `${height}px`; lastHeight = height; }
      if (top !== lastTop) { app.style.transform = top ? `translateY(${top}px)` : ''; lastTop = top; }
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };
    const onViewportChange = () => {
      if (!raf) raf = requestAnimationFrame(sync);
    };
    sync();
    vv.addEventListener('resize', onViewportChange);
    vv.addEventListener('scroll', onViewportChange);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      vv.removeEventListener('resize', onViewportChange);
      vv.removeEventListener('scroll', onViewportChange);
      app.style.height = '';
      app.style.transform = '';
    };
  }, []);
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

const REDUCED_MOTION = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Slow idle Ken Burns drift once a panel has settled: a gentle mirrored
// zoom/pan loop so static illustrations feel a little alive between turns.
// Keyed per-panel so each art variant gets its own drift direction/pace
// rather than every panel repeating an identical motion.
const IDLE_DRIFT = [
  { scale: [1, 1.045], x: [0, -10], y: [0, 6] },
  { scale: [1, 1.05], x: [0, 8], y: [0, -8] },
  { scale: [1, 1.04], x: [0, 6], y: [0, 8] },
];

// Directional panel entrance: the new panel flies in from the compass side
// the player just walked toward, instead of always the same fixed corner —
// reinforces spatial orientation for free. Falls back to the old generic
// offset for non-directional transitions (teleports, event panels, etc.).
const DIR_OFFSET: Record<string, { x: number; y: number }> = {
  NORTH: { x: 0, y: -40 }, SOUTH: { x: 0, y: 40 },
  EAST: { x: 40, y: 0 }, WEST: { x: -40, y: 0 },
  NE: { x: 30, y: -30 }, NW: { x: -30, y: -30 },
  SE: { x: 30, y: 30 }, SW: { x: -30, y: 30 },
  UP: { x: 0, y: 34 }, DOWN: { x: 0, y: -34 },
};

function Stage() {
  const panel = useStore((s) => s.panel);
  const seq = useStore((s) => s.panelSeq);
  const isEvent = useStore((s) => s.panelIsEvent);
  const roomName = useStore((s) => s.roomName);
  const submit = useStore((s) => s.submit);
  const travelDir = useStore((s) => s.travelDir);
  const shakeSeq = useStore((s) => s.shakeSeq);

  const dur = isEvent ? 0.6 : 0.42;
  const drift = IDLE_DRIFT[seq % IDLE_DRIFT.length];
  const offset = !isEvent && travelDir && DIR_OFFSET[travelDir]
    ? DIR_OFFSET[travelDir]
    : { x: isEvent ? 36 : 24, y: -12 };

  return (
    <div className="stage">
      <ShakeWrap seq={shakeSeq}>
        <AnimatePresence mode="sync">
          <PanelImage
            key={seq}
            src={`./art/${panel}.webp`}
            alt={roomName}
            offset={offset}
            dur={dur}
            drift={drift}
          />
        </AnimatePresence>
      </ShakeWrap>
      <Particles />
      <Vignette />
      {roomName && <div className="room-caption">{roomName}</div>}
      <button
        className="compass"
        aria-label="compass: tap toward a direction to walk"
        onPointerDown={(e) => {
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          const dx = e.clientX - rect.left - rect.width / 2;
          const dy = e.clientY - rect.top - rect.height / 2;
          if (Math.hypot(dx, dy) < rect.width * 0.1) return; // dead center
          const deg = (Math.atan2(dx, -dy) * 180) / Math.PI; // 0 = north, clockwise
          const octant = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
          submit(['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'][octant]);
        }}
      >
        <img src="./art/ui/compass-rose.webp" alt="" draggable={false} />
      </button>
    </div>
  );
}

// One-shot screen shake, keyed by shakeSeq so each occurrence gets a fresh
// mount (same proven-safe pattern as PanelImage's settled flag — no shared
// state to leak stale between triggers). No-op wrapper (seq===0) until the
// first shake ever fires, so it never touches layout otherwise.
function ShakeWrap({ seq, children }: { seq: number; children: React.ReactNode }) {
  if (seq === 0 || REDUCED_MOTION) return <>{children}</>;
  return (
    <motion.div
      key={seq}
      initial={{ x: 0, y: 0 }}
      animate={{ x: [0, -9, 8, -6, 5, -3, 2, 0], y: [0, 3, -3, 2, -2, 1, 0, 0] }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      style={{ width: '100%', height: '100%' }}
    >
      {children}
    </motion.div>
  );
}

// Full-screen radial pulse over the stage: a quick red flash for a wound, a
// slower black fade for a (survivable) death, before the resurrection panel
// takes over. Keyed by vignetteSeq for the same one-shot-remount reason as
// ShakeWrap; renders nothing once its animation finishes (kind stays set,
// but the seq no longer bumps, so no new element mounts).
function Vignette() {
  const vignette = useStore((s) => s.vignette);
  const seq = useStore((s) => s.vignetteSeq);
  if (vignette === 'none' || REDUCED_MOTION) return null;
  const isDeath = vignette === 'death';
  return (
    <motion.div
      key={seq}
      className={`vignette vignette-${vignette}`}
      initial={{ opacity: isDeath ? 0.92 : 0.6 }}
      animate={{ opacity: 0 }}
      transition={{ duration: isDeath ? 1.6 : 0.6, ease: 'easeOut' }}
    />
  );
}

// Re-randomized (not re-rendered) only when the region actually changes, via
// useMemo keyed on `region` — CSS custom properties per particle drive the
// @keyframes drift in styles.css; prefers-reduced-motion is already handled
// there (the blanket `animation: none` rule leaves particles at opacity 0).
function Particles() {
  const region = useStore((s) => s.region);
  const flavor = PARTICLE_FLAVOR[region] ?? 'none';
  const particles = useMemo(() => {
    if (flavor === 'none') return [];
    const n = 10;
    return Array.from({ length: n }, (_, i) => ({
      id: i,
      style: {
        '--px': `${Math.round(Math.random() * 100)}%`,
        '--psize': `${(2 + Math.random() * 2.5).toFixed(1)}px`,
        '--pdur': `${(10 + Math.random() * 10).toFixed(1)}s`,
        '--pdelay': `${(-Math.random() * 18).toFixed(1)}s`,
        '--psway': `${Math.round((Math.random() - 0.5) * 60)}px`,
        '--pop': flavor === 'firefly' ? 0.85 : flavor === 'ember' ? 0.8 : 0.4,
      } as React.CSSProperties,
    }));
  }, [flavor]);
  if (!particles.length) return null;
  return (
    <div className={`particles particles-${flavor}`}>
      {particles.map((p) => <span key={p.id} className="particle" style={p.style} />)}
    </div>
  );
}

interface DriftSpec { scale: number[]; x: number[]; y: number[] }
interface Offset { x: number; y: number }

// Owns its own `settled` flag, scoped to one panel image by React's `key`
// remount. Settled state living in the parent (Stage) instead of here was
// the bug behind the "fade takes 10 seconds" report: a fresh panel's first
// render would still see the *previous* panel's settled=true (React hasn't
// run the reset effect yet), so its entrance briefly picked up the 22s idle
// transition instead of the fast one. A remounted-per-key component can't
// carry that staleness — it always starts at settled=false.
function PanelImage({ src, alt, offset, dur, drift }: { src: string; alt: string; offset: Offset; dur: number; drift: DriftSpec }) {
  const [settled, setSettled] = useState(false);
  return (
    <motion.img
      className="panel-img"
      src={src}
      alt={alt}
      initial={{ opacity: 0, x: offset.x, y: offset.y, scale: 1.035 }}
      animate={
        REDUCED_MOTION
          ? { opacity: 1, x: 0, y: 0, scale: 1 }
          : settled
            ? { opacity: 1, ...drift }
            : { opacity: 1, x: 0, y: 0, scale: 1 }
      }
      exit={{ opacity: 0, transition: { duration: 0.26 } }}
      transition={
        settled
          ? { duration: 22, ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror' }
          : { duration: dur, ease: [0.22, 1, 0.36, 1] }
      }
      onAnimationComplete={() => { if (!settled) setSettled(true); }}
    />
  );
}

function StatusBar({ onHelp }: { onHelp: () => void }) {
  const score = useStore((s) => s.score);
  const moves = useStore((s) => s.moves);
  const health = useStore((s) => s.health);
  const scorePulseSeq = useStore((s) => s.scorePulseSeq);
  const healthLostSeq = useStore((s) => s.healthLostSeq);
  const submit = useStore((s) => s.submit);
  const inv = useStore((s) => s.inventoryList);
  const [muted, setMuted] = useState(audio.muted);
  const [showInv, setShowInv] = useState(false);

  return (
    <div className="status">
      <motion.span
        key={`score-${scorePulseSeq}`}
        animate={scorePulseSeq > 0 && !REDUCED_MOTION ? { scale: [1, 1.35, 1], color: ['#c8a24a', '#ffe9b0', '#c8a24a'] } : undefined}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ display: 'inline-block' }}
      >
        Score: {score}
      </motion.span>
      <span>Moves: {moves}</span>
      <motion.span
        key={`health-${healthLostSeq}`}
        className="health"
        title="Health"
        animate={healthLostSeq > 0 && !REDUCED_MOTION ? { x: [0, -4, 4, -2, 0] } : undefined}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        {[0, 1, 2].map((i) => <span key={i} className={i < health ? 'lit' : ''} />)}
      </motion.span>
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
      {log.map((l) => {
        // Give the two moments that matter most a little entrance weight —
        // not a typewriter effect on every line, that would just slow play.
        const dramatic = l.cls === 'room-name' || l.cls === 'death';
        if (dramatic && !REDUCED_MOTION) {
          return (
            <motion.p
              key={l.id}
              className={`line ${l.cls}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: 'easeOut' }}
            >
              {l.text}
            </motion.p>
          );
        }
        return <p key={l.id} className={`line ${l.cls}`}>{l.text}</p>;
      })}
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
