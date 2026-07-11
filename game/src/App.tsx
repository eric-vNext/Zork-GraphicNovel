import { useState } from 'react';
import { useStore } from './state/store';
import { GameScreen } from './components/GameScreen';
import { Out } from './engine/world';

export default function App() {
  const screen = useStore((s) => s.screen);
  const [help, setHelp] = useState(false);
  return (
    <div className="app">
      {screen === 'play' && <GameScreen onHelp={() => setHelp(true)} />}
      {screen === 'title' && <TitleScreen onHelp={() => setHelp(true)} />}
      {screen === 'death' && <DeathScreen />}
      {screen === 'victory' && <VictoryScreen />}
      {help && <HelpModal onClose={() => setHelp(false)} />}
    </div>
  );
}

function TitleScreen({ onHelp }: { onHelp: () => void }) {
  const begin = useStore((s) => s.begin);
  const game = useStore((s) => s.game);
  const applyEvents = useStore((s) => s.applyEvents);

  const restore = () => {
    begin();
    const out = new Out();
    game.restore(out);
    applyEvents(out.events);
  };

  return (
    <div className="screen">
      <img className="bg" src="./art/ui/title-screen.webp" alt="" />
      <div className="content">
        <img className="logo" src="./art/ui/logotype.webp" alt="ZORK" />
        <h2>The Great Underground Empire<br />— Graphic Novel Edition —</h2>
        <div className="btns">
          <button onClick={begin}>New Game</button>
          <button onClick={restore}>Restore</button>
          <button onClick={onHelp}>How to Play</button>
        </div>
        <p className="fine">
          A parser-first illustrated port of the 1980 Infocom classic, built from the
          open-source historical ZIL release. Type commands — or tap the compass and chips.
          All artwork and audio are original.
        </p>
      </div>
    </div>
  );
}

function DeathScreen() {
  const restartGame = useStore((s) => s.restartGame);
  const game = useStore((s) => s.game);
  const begin = useStore((s) => s.begin);
  const applyEvents = useStore((s) => s.applyEvents);
  const score = useStore((s) => s.score);
  const moves = useStore((s) => s.moves);
  return (
    <div className="screen">
      <img className="bg" src="./art/ui/death-screen.webp" alt="" />
      <div className="content">
        <h2>Your adventuring days are over.<br />Score: {score} in {moves} moves.</h2>
        <div className="btns">
          <button onClick={restartGame}>Restart</button>
          <button
            onClick={() => {
              begin();
              const out = new Out();
              game.restore(out);
              applyEvents(out.events);
            }}
          >
            Restore
          </button>
        </div>
      </div>
    </div>
  );
}

function VictoryScreen() {
  const restartGame = useStore((s) => s.restartGame);
  const score = useStore((s) => s.score);
  const moves = useStore((s) => s.moves);
  return (
    <div className="screen">
      <img className="bg" src="./art/ui/victory-screen.webp" alt="" />
      <div className="content">
        <img className="logo" src="./art/ui/logotype.webp" alt="ZORK" />
        <h2>
          Master Adventurer — {score} points in {moves} moves.<br />
          The Great Underground Empire awaits your return... in Zork II.
        </h2>
        <div className="btns">
          <button onClick={restartGame}>Play Again</button>
        </div>
      </div>
    </div>
  );
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-wrap" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>How to Play</h3>
        <p>
          Zork is a classic parser adventure: type what you want to do, in plain imperative
          English, then press Enter.
        </p>
        <p>
          <code>open mailbox</code> · <code>go north</code> (or <code>n</code>) ·{' '}
          <code>take lamp</code> · <code>turn on lamp</code> · <code>attack troll with sword</code> ·{' '}
          <code>put painting in case</code> · <code>take all</code>
        </p>
        <p>
          Shortcuts: <code>l</code> look · <code>x</code> examine · <code>i</code> inventory ·{' '}
          <code>z</code> wait · <code>g</code> again · <code>↑</code>/<code>↓</code> command history.
        </p>
        <p>
          System: <code>score</code> · <code>diagnose</code> · <code>save</code> ·{' '}
          <code>restore</code> · <code>verbose</code> / <code>brief</code>.
        </p>
        <p>
          On touch screens, the compass and quick-command chips let you play many turns without
          the keyboard. When the game asks a clarifying question ("Which nail do you mean...?"),
          answer chips appear above the input.
        </p>
        <p style={{ fontStyle: 'italic' }}>
          Advice: the house holds tools and a trophy case. It is dark down there — carry light,
          or you will be eaten by a grue. The thief is not your friend. Save often.
        </p>
        <div className="btns" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: '#241f14', color: '#e9dfa8', border: '1px solid #c8a24a', padding: '6px 18px', cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  );
}
