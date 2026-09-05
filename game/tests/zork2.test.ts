// Zork II: the world data and presentation layer, before any specials exist.
import { describe, it, expect } from 'vitest';
import { Game } from '../src/engine/engine';
import { selectGame, activeGame } from '../src/data/games';
import { ROOM_PRES, roomArtFor } from '../src/data/zork2/presentation';
import { txt } from './testUtils';

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
