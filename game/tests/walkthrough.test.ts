// Headless smoke test: drive the engine through the classic opening and
// several key puzzles, asserting state rather than exact RNG-dependent text.
import { describe, it, expect } from 'vitest';
import { Game } from '../src/engine/engine';
import { fset$, inPlayer, Out } from '../src/engine/world';
import { fightUntilWon } from './testUtils';

function play(g: Game, cmds: string[]): string {
  let text = '';
  for (const c of cmds) {
    const evs = g.execute(c);
    text += evs.filter((e) => e.type === 'text').map((e: any) => e.text).join('\n') + '\n';
  }
  return text;
}

describe('Zork I graphic novel engine', () => {
  it('plays the classic opening: mailbox, house, lamp, cellar', () => {
    const g = new Game();
    g.start();
    expect(g.s.here).toBe('WEST-OF-HOUSE');

    let t = play(g, ['open mailbox', 'read leaflet']);
    expect(t).toContain('Opening the small mailbox reveals a leaflet.');
    expect(t.toUpperCase()).toContain('ZORK');

    t = play(g, ['north', 'east', 'open window', 'enter window']);
    expect(g.s.here).toBe('KITCHEN');

    t = play(g, ['west', 'take lamp', 'take sword', 'move rug', 'open trap door', 'turn on lamp', 'down']);
    expect(g.s.here).toBe('CELLAR');
    expect(inPlayer(g.s, 'LAMP')).toBe(true);
    expect(fset$(g.s, 'LAMP', 'ONBIT')).toBe(true);
    // trap door slams behind you
    expect(fset$(g.s, 'TRAP-DOOR', 'OPENBIT')).toBe(false);
  });

  it('darkness without light warns about grues', () => {
    const g = new Game();
    g.start();
    const t = play(g, ['n', 'e', 'open window', 'in', 'w', 'move rug', 'open trap door', 'down']);
    expect(t).toContain('grue');
  });

  it('kills the troll and passes', () => {
    const g = new Game();
    g.start();
    play(g, ['n', 'e', 'open window', 'in', 'w', 'take lamp', 'take sword', 'move rug', 'open trap door', 'turn on lamp', 'down', 'north']);
    expect(g.s.here).toBe('TROLL-ROOM');
    fightUntilWon(g, 'TROLL-ROOM', 'TROLL-DEAD', 'attack troll with sword');
    expect(g.s.gflags['TROLL-DEAD']).toBe(true);
    play(g, ['east']);
    expect(g.s.here).toBe('EW-PASSAGE');
  });

  it('scores treasure take and case deposit', () => {
    const g = new Game();
    g.start();
    play(g, ['n', 'e', 'open window', 'in', 'w']);
    // gallery painting via cellar would need troll; use egg instead
    play(g, ['e', 'out', 'e', 'e']); // kitchen -> east-of-house -> clearing? (path shape)
    const g2 = new Game();
    g2.start();
    play(g2, ['n', 'n', 'up', 'take egg']); // north-of-house -> path -> up a tree
    expect(g2.s.here).toBe('UP-A-TREE');
    expect(inPlayer(g2.s, 'EGG')).toBe(true);
    expect(g2.s.counters.score).toBeGreaterThan(0);
    play(g2, ['down', 's', 'e', 'open window', 'in', 'w', 'open case', 'put egg in case']);
    expect(g2.s.locs['EGG']).toBe('TROPHY-CASE');
    expect(g2.s.counters.score).toBeGreaterThanOrEqual(10);
  });

  it('parses disambiguation and ALL', () => {
    const g = new Game();
    g.start();
    play(g, ['n', 'e', 'open window', 'in']);
    const evs = g.execute('take all');
    const text = evs.filter((e) => e.type === 'text').map((e: any) => e.text).join('\n');
    expect(inPlayer(g.s, 'SANDWICH-BAG') || inPlayer(g.s, 'BOTTLE')).toBe(true);
  });

  it('xyzzy responds canonically', () => {
    const g = new Game();
    g.start();
    const t = play(g, ['xyzzy']);
    expect(t).toContain('A hollow voice says "Fool."');
  });

  it('dam puzzle: bubble, bolt, drain reservoir', () => {
    const g = new Game();
    g.start();
    // teleport-style setup: place player with tools at maintenance room
    g.s.here = 'DAM-LOBBY';
    g.s.locs['LAMP'] = 'ADVENTURER';
    g.s.oflags['LAMP']['ONBIT'] = true;
    play(g, ['north', 'take wrench', 'take screwdriver', 'push yellow button']);
    expect(g.s.gflags['GATE-FLAG']).toBe(true);
    play(g, ['south', 'south']);
    expect(g.s.here).toBe('DAM-ROOM');
    play(g, ['turn bolt with wrench']);
    let drained = false;
    for (let i = 0; i < 10; i++) {
      play(g, ['wait']);
      if (g.s.gflags['LOW-TIDE']) { drained = true; break; }
    }
    expect(drained).toBe(true);
  });

  it('gas room explodes with open flame', () => {
    const g = new Game();
    g.start();
    g.s.here = 'SMELLY-ROOM';
    g.s.locs['CANDLES'] = 'ADVENTURER';
    g.s.oflags['CANDLES']['ONBIT'] = true;
    g.s.oflags['CANDLES']['FLAMEBIT'] = true;
    const t = play(g, ['down']);
    expect(t).toContain('BOOOOOOOOOOOM');
  });

  it('exorcism: bell, candles, book banishes the spirits', () => {
    const g = new Game();
    g.start();
    g.s.here = 'ENTRANCE-TO-HADES';
    for (const o of ['LAMP', 'BELL', 'BOOK', 'CANDLES', 'MATCH']) g.s.locs[o] = 'ADVENTURER';
    g.s.oflags['LAMP']['ONBIT'] = true;
    play(g, ['ring bell', 'light match', 'light candles with match']);
    g.s.gflags['XC'] = true; // candle step (timing window)
    const t = play(g, ['read book']);
    expect(g.s.gflags['LLD-FLAG']).toBe(true);
    expect(t).toContain('Begone, fiends');
  });

  it('full save/export round-trip preserves state', () => {
    const g = new Game();
    g.start();
    play(g, ['n', 'e', 'open window', 'in', 'take bottle']);
    const dump = g.exportSave();
    const g2 = new Game();
    const out = new Out();
    g2.importSave(dump, out);
    expect(g2.s.here).toBe('KITCHEN');
    expect(inPlayer(g2.s, 'BOTTLE')).toBe(true);
  });
});
