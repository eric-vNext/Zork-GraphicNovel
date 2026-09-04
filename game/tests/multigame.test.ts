// Regression tests for the multi-game refactor (Phase 0 of the trilogy work).
import { describe, it, expect } from 'vitest';
import { Game } from '../src/engine/engine';
import { activeGame, gameNumber, selectGame } from '../src/data/games';
import { DATA } from '../src/engine/world';
import { Out } from '../src/engine/world';
import { txt } from './testUtils';

describe('world data', () => {
  it('extracts Zork I at full size', () => {
    expect(Object.keys(DATA.rooms)).toHaveLength(110);
    expect(Object.keys(DATA.objects).length).toBeGreaterThan(130);
  });

  // The previous extractor read every room's `(IN ROOMS)` containment
  // declaration as an IN *direction*, giving 105 of 110 rooms an empty IN
  // exit. An empty exit object is truthy, so `IN` walked the player into
  // `undefined` and threw. Nothing may reintroduce an exit with no
  // destination, message or routine.
  it('has no destination-less exits', () => {
    const bad: string[] = [];
    for (const [id, room] of Object.entries(DATA.rooms)) {
      for (const [dir, ex] of Object.entries(room.exits)) {
        if (!ex.to && !ex.msg && !ex.per) bad.push(`${id}.${dir}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('answers IN in an ordinary room instead of crashing', () => {
    const g = new Game();
    g.execute('n'); g.execute('e'); g.execute('open window'); g.execute('w');
    expect(g.s.here).toBe('KITCHEN');
    expect(txt(g, 'in')).toBe("You can't go that way.");
    expect(g.s.here).toBe('KITCHEN');
  });
});

describe('game registry', () => {
  it('defaults to Zork I', () => {
    const g = new Game();
    expect(g.s.game).toBe(1);
    expect(gameNumber()).toBe(1);
    expect(activeGame().scoring.max).toBe(350);
  });

  it('refuses a game that is not in the build yet', () => {
    expect(() => selectGame(2)).toThrow(/not part of this build/);
  });

  it('reports the score with the active game rank ladder', () => {
    const g = new Game();
    expect(txt(g, 'score')).toContain('total of 350 points');
    expect(txt(g, 'score')).toContain('Beginner');
  });
});

describe('save migration', () => {
  it('brings a pre-trilogy save up to the current shape', () => {
    const g = new Game();
    const legacy = JSON.parse(g.exportSave());
    // Recreate a save as written before the refactor.
    legacy.thiefRoom = 'MAZE-5';
    legacy.thiefEngrossed = true;
    delete legacy.actorRooms;
    delete legacy.actorFlags;
    delete legacy.saveVersion;
    delete legacy.game;

    const g2 = new Game();
    expect(g2.importSave(JSON.stringify(legacy), new Out())).toBe(true);
    expect(g2.s.game).toBe(1);
    expect(g2.s.saveVersion).toBe(1);
    expect(g2.s.actorRooms.THIEF).toBe('MAZE-5');
    expect(g2.s.actorFlags.THIEF_ENGROSSED).toBe(true);
  });

  it('round-trips a current save', () => {
    const g = new Game();
    g.execute('n'); g.execute('n');
    const json = g.exportSave();
    const g2 = new Game();
    expect(g2.importSave(json, new Out())).toBe(true);
    expect(g2.s.here).toBe(g.s.here);
    expect(g2.s.saveVersion).toBe(1);
  });
});
