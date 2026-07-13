// Item 7 of docs/handoff-2026-07-11.md: region-flavored treasure-chime stinger.
// Mocks Howler so store.ts (which owns the presentation-layer remap) can run
// under plain vitest/node without a real audio context.
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

vi.mock('../src/audio/audioManager', () => {
  const calls: string[] = [];
  return {
    audio: {
      calls,
      unlock: () => {},
      sfx: (name: string) => { calls.push(name); },
      playBed: () => {},
      layerHades: () => {},
      setMuted: () => {},
    },
  };
});

describe('region-flavored treasure-chime remap', () => {
  beforeEach(() => { vi.resetModules(); });

  it('remaps treasure-chime per current region and leaves other sfx untouched', async () => {
    const { useStore } = await import('../src/state/store');
    const { audio } = await import('../src/audio/audioManager') as unknown as { audio: { calls: string[] } };

    const store = useStore.getState();
    // simulate arriving in the living room (region 'house'), then a treasure chime
    store.applyEvents([
      { type: 'room', room: 'LIVING-ROOM' },
      { type: 'sfx', name: 'treasure-chime' },
    ]);
    expect(audio.calls.at(-1)).toBe('treasure-chime-house');

    store.applyEvents([
      { type: 'room', room: 'NORTH-TEMPLE' },
      { type: 'sfx', name: 'treasure-chime' },
    ]);
    expect(audio.calls.at(-1)).toBe('treasure-chime-temple');

    store.applyEvents([
      { type: 'room', room: 'DAM-ROOM' },
      { type: 'sfx', name: 'treasure-chime' },
    ]);
    expect(audio.calls.at(-1)).toBe('treasure-chime-dam');

    store.applyEvents([
      { type: 'room', room: 'TROLL-ROOM' }, // region 'underground' -> no mapping, default stays
      { type: 'sfx', name: 'treasure-chime' },
    ]);
    expect(audio.calls.at(-1)).toBe('treasure-chime');

    store.applyEvents([{ type: 'sfx', name: 'sword-clash-1' }]);
    expect(audio.calls.at(-1)).toBe('sword-clash-1');
  });
});

describe('transition + water ambience sfx', () => {
  beforeEach(() => { vi.resetModules(); });

  it('plays a page-turn on panel change and water-flow when arriving at a watery room', async () => {
    const { useStore } = await import('../src/state/store');
    const { audio } = await import('../src/audio/audioManager') as unknown as { audio: { calls: string[] } };

    const store = useStore.getState();
    audio.calls.length = 0;
    useStore.setState({ screen: 'play' });

    // First room comes from the title panel — the page-turn is suppressed there.
    store.applyEvents([{ type: 'room', room: 'WEST-OF-HOUSE' }]);
    expect(audio.calls).not.toContain('page-turn');

    // Moving to a new room changes the panel -> page-turn whoosh.
    store.applyEvents([{ type: 'room', room: 'NORTH-OF-HOUSE' }]);
    expect(audio.calls).toContain('page-turn');

    // Arriving at a river room swells the water ambience.
    store.applyEvents([{ type: 'room', room: 'RIVER-2' }]);
    expect(audio.calls).toContain('water-flow');
  });

  it('does not play water-flow at the reservoir once it has been drained', async () => {
    const { useStore } = await import('../src/state/store');
    const { audio } = await import('../src/audio/audioManager') as unknown as { audio: { calls: string[] } };

    const store = useStore.getState();
    audio.calls.length = 0;
    useStore.setState({ screen: 'play' });
    store.game.s.gflags['LOW-TIDE'] = true; // dam drained -> reservoir bed is dry

    store.applyEvents([{ type: 'room', room: 'RESERVOIR' }]);
    expect(audio.calls).not.toContain('water-flow');
  });
});
