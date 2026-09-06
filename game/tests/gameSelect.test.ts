// Choosing a game on the title screen. The chooser is the only way into Zork II,
// so the thing worth testing is that picking it really swaps the game — its
// world, its title plate, and the save slots Restore will read.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('howler', () => {
  class Howl {
    play() { return 1; }
    fade() { return this; }
    stop() { return this; }
    volume(v?: number) { return v === undefined ? 1 : this; }
    unload() {}
  }
  return { Howl, Howler: { autoUnlock: false, mute: () => {} } };
});

vi.mock('../src/audio/audioManager', () => ({
  audio: { unlock: () => {}, sfx: () => {}, playBed: () => {}, layerHades: () => {}, setMuted: () => {} },
}));

import { useStore } from '../src/state/store';
import { selectGame } from '../src/data/games';
import { Game } from '../src/engine/engine';

describe('the title-screen game chooser', () => {
  beforeEach(() => {
    useStore.setState({ game: new Game(1), chosenGame: 1, screen: 'title', log: [] });
    selectGame(1);
  });

  it('starts on Zork I', () => {
    expect(useStore.getState().chosenGame).toBe(1);
    expect(useStore.getState().game.s.game).toBe(1);
  });

  it('swaps the whole game when Zork II is chosen', () => {
    useStore.getState().chooseGame(2);
    const st = useStore.getState();
    expect(st.chosenGame).toBe(2);
    expect(st.game.s.game).toBe(2);
    expect(st.game.s.here, "Zork II starts in the barrow").toBe('INSIDE-BARROW');
    expect(st.panel, 'and shows its own title plate').toBe('ui/z2-title-screen');
  });

  it('will not choose a game that is not ported yet', () => {
    useStore.getState().chooseGame(3);
    expect(useStore.getState().chosenGame, 'Zork III is not playable').toBe(1);
  });

  it('begins the game that was chosen', () => {
    useStore.getState().chooseGame(2);
    useStore.getState().begin();
    const st = useStore.getState();
    expect(st.screen).toBe('play');
    expect(st.roomName).toBe('Inside the Barrow');
    expect(st.log.some((l) => l.text.includes('ZORK II'))).toBe(true);
    selectGame(1);
  });

  it('restarts the game you were playing, not Zork I', () => {
    useStore.getState().chooseGame(2);
    useStore.getState().begin();
    useStore.getState().restartGame();
    expect(useStore.getState().game.s.game).toBe(2);
    selectGame(1);
  });
});
