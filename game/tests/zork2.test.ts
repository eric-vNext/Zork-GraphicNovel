// Zork II: the world data and presentation layer, before any specials exist.
import { describe, it, expect } from 'vitest';
import { Game } from '../src/engine/engine';
import { selectGame, activeGame } from '../src/data/games';
import { ROOM_PRES, roomArtFor } from '../src/data/zork2/presentation';
import { txt } from './testUtils';
import { Out } from '../src/engine/world';
import { SPELLS } from '../src/engine/spells';
import * as spellsMod from '../src/engine/spells';
import { jigsUp } from '../src/engine/death';

describe('Zork II world', () => {
  it('starts inside the barrow with the sword and lamp', () => {
    const g = new Game(2);
    expect(g.s.here).toBe('INSIDE-BARROW');
    const opening = txt(g, 'look');
    expect(opening).toContain('Inside the Barrow');
    expect(opening).toContain('sword');
    expect(opening).toContain('lantern');
    selectGame(1);
  });

  it('walks the barrow into the great cavern', () => {
    const g = new Game(2);
    txt(g, 's');
    expect(g.s.here).toBe('NARROW-TUNNEL');
    txt(g, 's');
    expect(g.s.here).toBe('FOOT-BRIDGE');
    txt(g, 's');
    expect(g.s.here).toBe('GREAT-CAVERN');
    selectGame(1);
  });

  it('scores out of 400 with its own rank ladder', () => {
    const g = new Game(2);
    expect(txt(g, 'score')).toContain('total of 400 points');
    g.s.counters.score = 361;
    expect(txt(g, 'score')).toContain('Wizard');
    g.s.counters.score = 360;
    expect(txt(g, 'score')).toContain('Master');
    selectGame(1);
  });
});

describe('Zork II presentation', () => {
  it('maps every room to a panel and a region', () => {
    const world = activeGame().number === 2 ? activeGame() : selectGame(2);
    const rooms = Object.keys(world.world.rooms);
    const unmapped = rooms.filter((r) => !ROOM_PRES[r]);
    expect(unmapped).toEqual([]);
    selectGame(1);
  });

  it('selects state variants from world flags', () => {
    const no = () => false;
    expect(roomArtFor('GLACIER-ROOM', {}, no)).toBe('z2-ice-room');
    expect(roomArtFor('GLACIER-ROOM', { 'ICE-MELTED': true }, no)).toBe('z2-ice-room-melted');
    expect(roomArtFor('POOL-ROOM', { EVAPORATED: true }, no)).toBe('z2-pool-room-drained');
    expect(roomArtFor('POOL-ROOM', { EVAPORATED: true, 'MUD-FLAG': true }, no)).toBe('z2-pool-room-muddy');
    expect(roomArtFor('MENHIR-ROOM', { 'MENHIR-TILTED': true }, no)).toBe('z2-menhir-room-tilted');
    expect(roomArtFor('MENHIR-ROOM', { 'MENHIR-MOVED': true }, no)).toBe('z2-menhir-room-moved');
  });

  it('every panel it can select exists on disk', async () => {
    const { readdirSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const have = new Set(
      readdirSync(resolve(__dirname, '../../assets/rooms'))
        .filter((f) => f.startsWith('z2-') && f.endsWith('.png'))
        .map((f) => f.slice(0, -4)),
    );
    const missing = Object.values(ROOM_PRES).map((p) => p.art).filter((a) => !have.has(a));
    expect([...new Set(missing)]).toEqual([]);
  });
});

describe('the Wizard of Frobozz', () => {
  // WAIT always prints "Time passes..." first, so look for the wizard's own
  // words inside the turn's text rather than treating any output as a signal.
  const WIZARD_SPEAKS = /Wizard|strange little man|outrush of air|muttering/;

  function untilWizardActs(g: Game, maxTurns = 400): string {
    for (let i = 0; i < maxTurns; i++) {
      const out = txt(g, 'wait');
      if (WIZARD_SPEAKS.test(out)) return out;
    }
    return '';
  }

  it('is queued from turn one and eventually appears', () => {
    const g = new Game(2);
    expect(g.s.daemons['I-WIZARD']?.enabled).toBe(true);
    const said = untilWizardActs(g);
    expect(said).toMatch(WIZARD_SPEAKS);
    selectGame(1);
  });

  it('a cast spell becomes active and later expires', () => {
    const g = new Game(2);
    let cast = false;
    for (let i = 0; i < 800 && !cast; i++) {
      txt(g, 'wait');
      if (g.s.gflags['SPELL-ACTIVE']) cast = true;
    }
    expect(cast, 'the wizard should cast within 800 turns').toBe(true);
    const spell = g.s.spell?.active;
    expect(SPELLS).toContain(spell as any);

    for (let i = 0; i < 200 && g.s.gflags['SPELL-ACTIVE']; i++) txt(g, 'wait');
    expect(g.s.gflags['SPELL-ACTIVE'], 'the spell should expire').toBeFalsy();
    selectGame(1);
  });

  it('Feeble halves carry capacity and hands it back on expiry', () => {
    const g = new Game(2);
    const ctx: any = { s: g.s, out: new Out(), rng: () => 0.5 };
    g.s.counters.loadAllowed = 100;
    // Land the spell directly rather than waiting for a 1-in-many roll.
    g.s.spell = { active: 'FEEBLE' };
    g.s.gflags['SPELL-ACTIVE'] = true;
    g.s.counters.loadAllowed = 50;
    expect(spellsMod.loadAllowed(g.s, 100)).toBe(50);
    // Expiry runs through the daemon.
    g.s.daemons['I-WIZARD'] = { tick: 1, enabled: true };
    txt(g, 'wait');
    expect(g.s.gflags['SPELL-ACTIVE']).toBeFalsy();
    expect(g.s.counters.loadAllowed).toBe(100);
    selectGame(1);
  });

  it('Float over a void kills you when it wears off', () => {
    const g = new Game(2);
    g.s.here = 'VAIR-1';                     // NONLANDBIT, not a safe landing
    g.s.spell = { active: 'FLOAT' };
    g.s.gflags['SPELL-ACTIVE'] = true;
    g.s.daemons['I-WIZARD'] = { tick: 1, enabled: true };
    txt(g, 'wait');
    // Zork II's JIGS-UP has no death limit, so this kills and resurrects
    // rather than ending the game.
    expect(g.s.counters.deaths).toBe(1);
    expect(g.s.here).toBe('DEAD-PALANTIR-1');
    expect(g.s.dead).toBe(false);
    selectGame(1);
  });

  it('resurrects into the Room of Red Mist, not Zork I\'s forest', () => {
    const g = new Game(2);
    g.s.locs['LAMP'] = 'ADVENTURER';
    g.s.here = 'GREAT-CAVERN';
    const ctx: any = { s: g.s, out: new Out(), rng: () => 0.5 };
    jigsUp(ctx, 'Testing.', {});
    expect(g.s.here).toBe('DEAD-PALANTIR-1');
    expect(g.s.locs['LAMP']).toBe('INSIDE-BARROW');
    selectGame(1);
  });
});

describe('Zork II dynamic room descriptions', () => {
  // Most of these rooms are genuinely dark in Zork II, so the player needs a
  // lit lamp before LOOK says anything but "pitch black".
  function look(g: Game, room: string): string {
    g.s.locs['LAMP'] = 'ADVENTURER';
    g.s.oflags['LAMP'] = { ...(g.s.oflags['LAMP'] ?? {}), ONBIT: true };
    g.s.here = room;
    delete g.s.touched[room];
    return txt(g, 'look');
  }

  it('the glacier room gains its steaming passage only once melted', () => {
    const g = new Game(2);
    expect(look(g, 'GLACIER-ROOM')).not.toContain('still partly full of steam');
    g.s.gflags['ICE-MELTED'] = true;
    expect(look(g, 'GLACIER-ROOM')).toContain('still partly full of steam');
    selectGame(1);
  });

  it('the safe is chipped before the blast and blown after', () => {
    const g = new Game(2);
    expect(look(g, 'SAFE-ROOM')).toContain('oblong hole has been chipped');
    g.s.gflags['SAFE-FLAG'] = true;
    const after = look(g, 'SAFE-ROOM');
    expect(after).toContain('whose door has been blown off');
    expect(after).not.toContain('oblong hole');
    selectGame(1);
  });

  it('the carousel only whirrs while it is turning', () => {
    const g = new Game(2);
    expect(look(g, 'CAROUSEL-ROOM')).toContain('loud whirring sound');
    g.s.gflags['CAROUSEL-FLIP-FLAG'] = true;
    expect(look(g, 'CAROUSEL-ROOM')).not.toContain('loud whirring sound');
    selectGame(1);
  });

  it('the lizard watches, then sniffs the candy, then sleeps', () => {
    const g = new Game(2);
    expect(look(g, 'GUARDIAN-ROOM')).toContain('eyes move to watch you');
    g.s.locs['CANDY'] = 'ADVENTURER';
    expect(look(g, 'GUARDIAN-ROOM')).toContain('lizard is sniffing at you');
    g.s.gflags['GUARDIAN-FED'] = true;
    expect(look(g, 'GUARDIAN-ROOM')).toContain('sleepy-looking lizard head');
    selectGame(1);
  });

  it('the crypt reports its door and reveals the secret one', () => {
    const g = new Game(2);
    expect(look(g, 'CRYPT-ROOM')).toContain('The door is closed.');
    g.s.oflags['CRYPT-DOOR'] = { ...(g.s.oflags['CRYPT-DOOR'] ?? {}), OPENBIT: true };
    expect(look(g, 'CRYPT-ROOM')).toContain('The door is open.');
    delete g.s.oflags['DIM-DOOR']?.INVISIBLE;
    expect(look(g, 'CRYPT-ROOM')).toContain('dim outline of a secret door');
    selectGame(1);
  });

  // Prose and art are gated by the same flag, so they cannot disagree.
  it('description state and panel state move together', () => {
    const g = new Game(2);
    const no = () => false;
    expect(look(g, 'SAFE-ROOM')).toContain('chipped');
    expect(roomArtFor('SAFE-ROOM', g.s.gflags, no)).toBe('z2-dusty-room');
    g.s.gflags['SAFE-FLAG'] = true;
    expect(look(g, 'SAFE-ROOM')).toContain('blown off');
    expect(roomArtFor('SAFE-ROOM', g.s.gflags, no)).toBe('z2-dusty-room-blown');
    selectGame(1);
  });
});
