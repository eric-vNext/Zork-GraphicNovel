// Regression tests for reported bugs: kitchen take-all/water, troll's axe
// guard, and thief robbery messaging.
import { describe, it, expect } from 'vitest';
import { Game } from '../src/engine/engine';
import { inPlayer, Out } from '../src/engine/world';
import { HERO_MELEE } from '../src/engine/combatText';
import { txt, fightUntilWon } from './testUtils';

describe('bug fixes', () => {
  it('take all in the kitchen never reaches into the bottle for the water', () => {
    const g = new Game();
    g.start();
    g.s.here = 'KITCHEN';
    g.s.locs['LAMP'] = 'ADVENTURER';
    g.s.oflags['LAMP']['ONBIT'] = true;
    const t = txt(g, 'take all');
    // take-all only sweeps loose items and open-surface contents (sack, bottle) —
    // it must not even attempt (and print a line for) the water sealed inside the bottle
    expect(t).not.toMatch(/water/i);
    expect(g.s.locs['WATER']).toBe('BOTTLE');
    // but a direct, explicit "take water" still resolves with the correct redirect
    const t2 = txt(g, 'take water');
    expect(t2).toContain("It's in the bottle. Perhaps you should take that instead.");
    expect(g.s.locs['WATER']).toBe('BOTTLE');
  });

  it('cannot take the axe out of the live troll\'s hands', () => {
    const g = new Game();
    g.start();
    g.s.here = 'TROLL-ROOM';
    g.s.locs['LAMP'] = 'ADVENTURER';
    g.s.oflags['LAMP']['ONBIT'] = true;
    const t = txt(g, 'take axe');
    expect(t).toContain("swings it out of your reach");
    expect(inPlayer(g.s, 'AXE')).toBe(false);
    expect(g.s.locs['AXE']).toBe('TROLL');
  });

  it('does not print "troll contains axe" during room look', () => {
    const g = new Game();
    g.start();
    g.s.here = 'TROLL-ROOM';
    g.s.locs['LAMP'] = 'ADVENTURER';
    g.s.oflags['LAMP']['ONBIT'] = true;
    const t = txt(g, 'look');
    expect(t).not.toMatch(/contains/i);
  });

  it('axe is free and takable once the troll is dead', () => {
    const g = new Game();
    g.start();
    g.s.here = 'TROLL-ROOM';
    g.s.locs['LAMP'] = 'ADVENTURER'; g.s.oflags['LAMP']['ONBIT'] = true;
    g.s.locs['SWORD'] = 'ADVENTURER';
    fightUntilWon(g, 'TROLL-ROOM', 'TROLL-DEAD', 'attack troll with sword');
    expect(g.s.gflags['TROLL-DEAD']).toBe(true);
    const t = txt(g, 'take axe');
    expect(t).toBe('Taken.');
    expect(inPlayer(g.s, 'AXE')).toBe(true);
  });

  it('thief robbery message matches what actually happened', () => {
    const g = new Game();
    g.start();
    g.s.here = 'CELLAR'; // not sacred, not the house — a room the thief can occupy
    g.s.locs['LAMP'] = 'ADVENTURER'; g.s.oflags['LAMP']['ONBIT'] = true;
    g.s.gflags['THIEF-HERE'] = true;
    g.s.locs['THIEF'] = 'CELLAR';
    // no treasures present anywhere -> must say "nothing of value"
    const t1 = txt(g, 'wait');
    expect(t1).toContain('finding nothing of value, left disgusted');
    expect(t1).not.toContain('robbed you blind');

    const g2 = new Game();
    g2.start();
    g2.s.here = 'CELLAR';
    g2.s.locs['LAMP'] = 'ADVENTURER'; g2.s.oflags['LAMP']['ONBIT'] = true;
    g2.s.locs['EGG'] = 'ADVENTURER';
    g2.s.gflags['THIEF-HERE'] = true;
    g2.s.locs['THIEF'] = 'CELLAR';
    const t2 = txt(g2, 'wait');
    expect(t2).toContain('robbed you blind first');
    expect(t2).not.toContain('finding nothing of value');
    expect(g2.s.locs['EGG']).toBe('LARGE-BAG');
  });

  it('entering the troll room shows the establishing panel, not a mid-fight panel', () => {
    const g = new Game();
    g.start();
    g.s.here = 'CELLAR';
    g.s.locs['LAMP'] = 'ADVENTURER'; g.s.oflags['LAMP']['ONBIT'] = true;
    const evs = g.execute('north');
    const panels = evs.filter((e) => e.type === 'panel').map((e: any) => e.key);
    expect(panels).not.toContain('events/troll-fight');
    expect(g.s.here).toBe('TROLL-ROOM');
    // the reprieve is one-shot: a subsequent turn can still be struck
    let struck = false;
    for (let i = 0; i < 40 && !struck; i++) {
      struck = g.execute('wait').some((e) => e.type === 'panel' && (e as any).key === 'events/troll-fight');
    }
    expect(struck).toBe(true);
  });

  it('the troll never actually returns after death — a later visitor is the thief', () => {
    const g = new Game();
    g.start();
    g.s.here = 'TROLL-ROOM';
    g.s.gflags['TROLL-DEAD'] = true;
    g.s.gflags['TROLL-FLAG'] = true;
    g.s.locs['TROLL'] = null as any;
    g.s.locs['LAMP'] = 'ADVENTURER'; g.s.oflags['LAMP']['ONBIT'] = true;
    for (let i = 0; i < 200; i++) {
      txt(g, 'wait');
      expect(g.s.gflags['TROLL-DEAD']).toBe(true);
      expect(g.s.locs['TROLL']).toBeNull();
    }
  });

  it('a landed-but-not-killing blow uses an authentic, unambiguous troll-staggered line', () => {
    const g = new Game();
    g.start();
    g.s.here = 'CELLAR';
    g.s.locs['LAMP'] = 'ADVENTURER'; g.s.oflags['LAMP']['ONBIT'] = true;
    g.s.locs['SWORD'] = 'ADVENTURER';
    g.execute('north');
    const staggerLines = new Set(HERO_MELEE.STAGGER.map((l) => l.replace('{DEF}', 'troll')));
    let sawStagger = false;
    const snap = g.exportSave();
    for (let attempt = 0; attempt < 30 && !sawStagger && !g.s.gflags['TROLL-DEAD']; attempt++) {
      for (let i = 0; i < 30 && !g.s.gflags['TROLL-DEAD'] && !g.s.dead; i++) {
        const t = txt(g, 'attack troll with sword');
        // a landed, non-killing hit must be exactly one of the authentic
        // STAGGER lines — never the old invented "knocking you out" mashup
        const line = t.split('\n').find((l) => staggerLines.has(l));
        if (line) { sawStagger = true; break; }
        expect(t).not.toContain('knocking you out — no wait');
      }
      if (!sawStagger && !g.s.gflags['TROLL-DEAD']) g.importSave(snap, new Out());
    }
    expect(sawStagger).toBe(true);
  });
});
