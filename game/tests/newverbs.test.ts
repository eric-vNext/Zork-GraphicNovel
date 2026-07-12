// Regression tests for item 5 of docs/handoff-2026-07-11.md: OOPS, WAIT n,
// SCRIPT/UNSCRIPT, BUG, and a tightened Loud Room command gate.
import { describe, it, expect } from 'vitest';
import { Game } from '../src/engine/engine';
import { txt } from './testUtils';

describe('OOPS', () => {
  it('splices a corrected word into the failed command and re-runs it', () => {
    const g = new Game();
    g.start();
    const t1 = txt(g, 'take mailbocks');
    expect(t1).toContain('I don\'t know the word "mailbocks"');
    expect(g.s.counters.moves).toBe(0);
    const t2 = txt(g, 'oops mailbox');
    expect(t2).toContain('securely anchored');
    expect(g.s.counters.moves).toBe(1);
  });

  it('says I beg your pardon when there is nothing to correct', () => {
    const g = new Game();
    g.start();
    expect(txt(g, 'oops mailbox')).toContain('I beg your pardon');
  });
});

describe('WAIT n', () => {
  it('advances exactly n turns for a plain wait', () => {
    const g = new Game();
    g.start();
    txt(g, 'wait 5');
    expect(g.s.counters.moves).toBe(5);
  });

  it('bare WAIT defaults to 3 turns, matching V-WAIT\'s OPTIONAL NUM', () => {
    const g = new Game();
    g.start();
    txt(g, 'wait');
    expect(g.s.counters.moves).toBe(3);
  });
});

describe('BUG / SCRIPT / UNSCRIPT', () => {
  it('BUG prints the verbatim V-BUG line', () => {
    const g = new Game();
    g.start();
    expect(txt(g, 'bug')).toContain('Bug? Not in a flawless program like this!');
  });

  it('SCRIPT/UNSCRIPT accumulate a readable transcript', () => {
    const g = new Game();
    g.start();
    expect(g.isScripting()).toBe(false);
    txt(g, 'script');
    expect(g.isScripting()).toBe(true);
    txt(g, 'look');
    txt(g, 'unscript');
    expect(g.isScripting()).toBe(false);
    const transcript = g.getTranscript();
    expect(transcript).toContain('> script');
    expect(transcript).toContain('> look');
    expect(transcript).toContain('West of House');
    expect(transcript).toContain('> unscript');
  });
});

describe('thief room-graph pathing', () => {
  it('robs a visited room the player is not currently standing in', () => {
    // The old model only ever rolled a robbery chance against the player's
    // CURRENT room, so it could never do this — this is the point of the port.
    const g = new Game();
    g.start();
    g.s.here = 'CELLAR';
    g.s.locs['LAMP'] = 'ADVENTURER'; g.s.oflags['LAMP']['ONBIT'] = true;
    g.s.touched['GALLERY'] = true;
    g.s.locs['PAINTING'] = 'GALLERY';
    let robbed = false;
    for (let i = 0; i < 300 && !robbed; i++) {
      txt(g, 'wait 1');
      if (g.s.locs['PAINTING'] !== 'GALLERY') robbed = true;
    }
    expect(robbed).toBe(true);
    expect(g.s.locs['PAINTING']).toBe('LARGE-BAG');
  });

  it('never robs or occupies a SACREDBIT/above-ground room', () => {
    const g = new Game();
    g.start();
    g.s.here = 'CELLAR';
    g.s.locs['LAMP'] = 'ADVENTURER'; g.s.oflags['LAMP']['ONBIT'] = true;
    for (let i = 0; i < 200; i++) {
      txt(g, 'wait 1');
      expect(['LIVING-ROOM', 'KITCHEN', 'WEST-OF-HOUSE', 'ATTIC']).not.toContain(g.s.thiefRoom);
    }
  });

  it('leaves the thief dead and inert once killed, regardless of prior position', () => {
    const g = new Game();
    g.start();
    g.s.gflags['THIEF-DEAD'] = true;
    const before = g.s.thiefRoom;
    for (let i = 0; i < 50; i++) txt(g, 'wait 1');
    expect(g.s.thiefRoom).toBe(before); // daemon no-ops once dead
  });
});

describe('Loud Room command gate', () => {
  function setup() {
    const g = new Game();
    g.start();
    g.s.here = 'LOUD-ROOM';
    g.s.gflags['LOW-TIDE'] = false;
    g.s.locs['LAMP'] = 'ADVENTURER'; g.s.oflags['LAMP']['ONBIT'] = true;
    return g;
  }

  it('swallows commands outside the source\'s allowed word set', () => {
    const g = setup();
    // LOOK is not in the real game's loud-room allow-list either
    const t = txt(g, 'look');
    expect(t).toMatch(/^look look \.\.\.$/);
  });

  it('swallows directions other than west/east/up', () => {
    const g = setup();
    const t = txt(g, 'north');
    expect(t).toMatch(/^north north \.\.\.$/);
    expect(g.s.here).toBe('LOUD-ROOM');
  });

  it('lets west/east/up through', () => {
    const g = setup();
    const t = txt(g, 'west');
    expect(g.s.here).toBe('ROUND-ROOM');
    expect(t).not.toContain('...');
  });

  it('ECHO sets the flag and opens the room up permanently', () => {
    const g = setup();
    txt(g, 'echo');
    expect(g.s.gflags['ECHO-FLAG']).toBe(true);
    const t = txt(g, 'look');
    expect(t).not.toContain('...');
  });

  it('BUG gets through even before ECHO is spoken', () => {
    const g = setup();
    const t = txt(g, 'bug');
    expect(t).toContain('Bug? Not in a flawless program');
  });
});
