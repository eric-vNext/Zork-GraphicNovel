// Regression tests for docs/asset-plan-v2.md Tier D signals computed in
// src/state/store.ts: shake pulses, score/health-loss pulses, the wound/death
// vignette, and travel-direction tracking for directional panel transitions.
// Mocks Howler the same way tests/audioRegion.test.ts does.
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

describe('Tier D store signals', () => {
  beforeEach(() => { vi.resetModules(); });

  it('tracks travelDir from a directional room event', async () => {
    const { useStore } = await import('../src/state/store');
    const store = useStore.getState();
    store.applyEvents([{ type: 'room', room: 'NORTH-OF-HOUSE', dir: 'NORTH' }]);
    expect(useStore.getState().travelDir).toBe('NORTH');
    store.applyEvents([{ type: 'panel', key: 'events/xyzzy' }]); // non-room event: dir persists
    expect(useStore.getState().travelDir).toBe('NORTH');
  });

  it('bumps shakeSeq on a shake event, and only on a shake event', async () => {
    const { useStore } = await import('../src/state/store');
    const store = useStore.getState();
    expect(useStore.getState().shakeSeq).toBe(0);
    store.applyEvents([{ type: 'text', text: 'nothing dramatic' }]);
    expect(useStore.getState().shakeSeq).toBe(0);
    store.applyEvents([{ type: 'shake' }]);
    expect(useStore.getState().shakeSeq).toBe(1);
    store.applyEvents([{ type: 'shake' }, { type: 'shake' }]); // multiple in one turn still bump once
    expect(useStore.getState().shakeSeq).toBe(2);
  });

  it('bumps scorePulseSeq only when score increases', async () => {
    const { useStore } = await import('../src/state/store');
    const store = useStore.getState();
    store.game.s.counters.score = 10;
    store.applyEvents([{ type: 'score', score: 10, moves: 1 }]);
    expect(useStore.getState().score).toBe(10);
    expect(useStore.getState().scorePulseSeq).toBe(1);
    // same score again: no pulse
    store.applyEvents([{ type: 'score', score: 10, moves: 2 }]);
    expect(useStore.getState().scorePulseSeq).toBe(1);
  });

  it('bumps healthLostSeq and sets a wound vignette when health drops', async () => {
    const { useStore } = await import('../src/state/store');
    const store = useStore.getState();
    store.game.s.counters.wounds = 1;
    store.applyEvents([{ type: 'score', score: 0, moves: 1 }]);
    expect(useStore.getState().health).toBe(2);
    expect(useStore.getState().healthLostSeq).toBe(1);
    expect(useStore.getState().vignette).toBe('wound');
  });

  it('sets a death vignette on a temporary (resurrection) death, not screen=death', async () => {
    const { useStore } = await import('../src/state/store');
    const store = useStore.getState();
    store.applyEvents([{ type: 'death', permanent: false }]);
    expect(useStore.getState().vignette).toBe('death');
    expect(useStore.getState().screen).not.toBe('death'); // resurrection keeps play going
  });

  it('sets screen=death on a permanent death', async () => {
    const { useStore } = await import('../src/state/store');
    const store = useStore.getState();
    store.applyEvents([{ type: 'death', permanent: true }]);
    expect(useStore.getState().screen).toBe('death');
  });
});
