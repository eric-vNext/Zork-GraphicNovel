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

describe('the Carousel Room', () => {
  function inCarousel(): Game {
    const g = new Game(2);
    g.s.here = 'CAROUSEL-ROOM';
    g.s.touched['CAROUSEL-ROOM'] = true;
    g.s.locs['LAMP'] = 'ADVENTURER';
    g.s.oflags['LAMP'] = { ...(g.s.oflags['LAMP'] ?? {}), ONBIT: true };
    return g;
  }

  it('scrambles compass moves while it turns', () => {
    const g = inCarousel();
    const said = txt(g, 'n');
    expect(said).toContain('not sure which direction is which');
    selectGame(1);
  });

  // EIGHT-DIRECTIONS omits west, and a westward move is always scrambled, so
  // the one exit that matters is unreachable until the carousel is stopped.
  it('never lets you west while it turns', () => {
    const g = inCarousel();
    let reachedRoom8 = false;
    for (let i = 0; i < 200; i++) {
      g.s.here = 'CAROUSEL-ROOM';
      g.execute('w');
      if (g.s.here === 'ROOM-8') { reachedRoom8 = true; break; }
    }
    expect(reachedRoom8, 'west must be impossible while spinning').toBe(false);
    selectGame(1);
  });

  it('lets you walk normally once it is stopped', () => {
    const g = inCarousel();
    g.s.gflags['CAROUSEL-FLIP-FLAG'] = true;
    const said = txt(g, 'w');
    expect(said).not.toContain('not sure which direction');
    expect(g.s.here).toBe('ROOM-8');
    selectGame(1);
  });

  it('leaves up and down alone even while turning', () => {
    const g = inCarousel();
    const said = txt(g, 'u');
    expect(said).not.toContain('not sure which direction');
    selectGame(1);
  });
});

// ---------------------------------------------------------------------------
// Action routines (2actions.zil). Each of these is a puzzle whose flag also
// gates a room description and a panel, so a break here shows up three ways.

/** A game standing in `room` with a lit lamp in hand. */
function at(room: string): Game {
  const g = new Game(2);
  g.s.here = room;
  g.s.touched[room] = true;
  g.s.locs['LAMP'] = 'ADVENTURER';
  g.s.oflags['LAMP'] = { ...(g.s.oflags['LAMP'] ?? {}), ONBIT: true };
  return g;
}

describe('the volcano', () => {
  it('refuses to melt the glacier by hand', () => {
    const g = at('GLACIER-ROOM');
    expect(txt(g, 'melt glacier')).toContain("you'll need a lot of heat");
    selectGame(1);
  });

  it('describes the rusty box the way its flag says', () => {
    const g = at('SAFE-ROOM');
    expect(txt(g, 'take box')).toContain('imbedded in the wall');
    expect(txt(g, 'open box')).toContain('rusted and will not open');
    g.s.gflags['SAFE-FLAG'] = true;
    expect(txt(g, 'open box')).toContain('has no door');
    selectGame(1);
  });

  // The whole chain: light the fuse, walk out, and the blast takes the box's
  // door off. Five turns later the room falls in; eight after that, the ledge.
  it('blows the safe open, then brings the room and the ledge down', () => {
    const g = at('SAFE-ROOM');
    g.s.locs['BRICK'] = 'ADVENTURER';
    g.s.locs['FUSE'] = 'ADVENTURER';
    g.s.locs['MATCH'] = 'ADVENTURER';
    g.s.oflags['MATCH'] = { ...(g.s.oflags['MATCH'] ?? {}), FLAMEBIT: true, ONBIT: true };

    expect(txt(g, 'put brick in hole')).toContain('Done');
    expect(txt(g, 'put string in brick')).toContain('Done');
    expect(txt(g, 'burn string')).toContain('The string starts to burn');

    // Two turns on the fuse, so the blast lands as you step onto the ledge.
    const boom = txt(g, 'north') + txt(g, 'wait');
    expect(g.s.here).toBe('LEDGE-2');
    expect(boom).toContain('There is an explosion nearby');
    expect(g.s.gflags['SAFE-FLAG']).toBe(true);
    expect(g.s.oflags['SAFE']?.OPENBIT).toBe(true);
    expect(g.s.locs['BRICK']).toBe(null);

    // The dusty room collapses five turns after the blast.
    let rumble = '';
    for (let i = 0; i < 8 && !rumble; i++) {
      const said = txt(g, 'wait');
      if (said.includes('ominous rumbling')) rumble = said;
    }
    expect(rumble, 'the room should collapse').toContain('ominous rumbling');
    expect(txt(g, 'south')).toContain('blocked by debris');
    expect(g.s.here).toBe('LEDGE-2');

    // And the ledge itself goes eight turns after that, taking you with it.
    for (let i = 0; i < 20 && !g.s.dead; i++) txt(g, 'wait');
    expect(g.s.dead || g.s.here !== 'LEDGE-2').toBe(true);
    selectGame(1);
  });

  it('kills you if you light the brick in your hands', () => {
    const g = at('SAFE-ROOM');
    g.s.locs['BRICK'] = 'ADVENTURER';
    g.s.locs['MATCH'] = 'ADVENTURER';
    g.s.oflags['MATCH'] = { ...(g.s.oflags['MATCH'] ?? {}), FLAMEBIT: true, ONBIT: true };
    expect(txt(g, 'burn brick')).toContain('blow you to smithereens');
    selectGame(1);
  });

  // PRE-BURN is a preaction, so it fires before BRICK-FCN ever sees the verb.
  it('will not light the brick with nothing to light it with', () => {
    const g = at('SAFE-ROOM');
    g.s.locs['BRICK'] = 'ADVENTURER';
    const said = txt(g, 'burn brick');
    expect(said).toContain('light a match first');
    expect(said).not.toContain('smithereens');
    selectGame(1);
  });
});

describe("the Wizard's door", () => {
  it('is guarded until the lizard is fed', () => {
    const g = at('GUARDIAN-ROOM');
    expect(txt(g, 'open door')).toContain('snaps at you');
    g.s.locs['CANDY'] = 'ADVENTURER';
    delete g.s.oflags['CANDY']?.INVISIBLE;
    const fed = txt(g, 'give candy to lizard');
    expect(fed).toContain('greedily wolfs down the candy');
    expect(g.s.gflags['GUARDIAN-FED']).toBe(true);
    expect(g.s.locs['CANDY']).toBe(null);
    expect(txt(g, 'wake lizard')).toContain("can't wake it");
    selectGame(1);
  });

  it('needs the gold key even once the guardian sleeps', () => {
    const g = at('GUARDIAN-ROOM');
    g.s.gflags['GUARDIAN-FED'] = true;
    expect(txt(g, 'open door')).toContain('The door is locked!');
    g.s.locs['GOLD-KEY'] = 'ADVENTURER';
    expect(txt(g, 'unlock door with key')).toContain('the bolt clicks');
    expect(txt(g, 'open door')).toContain('The door creaks open');
    expect(g.s.oflags['WIZ-DOOR']?.OPENBIT).toBe(true);
    delete g.s.touched['GUARDIAN-ROOM'];
    expect(txt(g, 'look')).toContain('The door is open.');
    selectGame(1);
  });

  it('spits a sphere back out rather than swallowing it', () => {
    const g = at('GUARDIAN-ROOM');
    g.s.locs['PALANTIR-1'] = 'ADVENTURER';
    expect(txt(g, 'give sphere to lizard')).toContain('spits it on the ground');
    expect(g.s.locs['PALANTIR-1']).toBe('GUARDIAN-ROOM');
    selectGame(1);
  });
});

describe('the crypt', () => {
  // You have to put the light out to see the door marked "F" — and the room
  // keeps its own ONBIT so the dark never eats you while you look.
  it('shows the secret door only when the lamp goes out', () => {
    const g = at('CRYPT-ROOM');
    expect(txt(g, 'look')).toContain('earthly remains of the mighty Flatheads');
    expect(g.s.oflags['DIM-DOOR']?.INVISIBLE).toBe(true);

    const dark = txt(g, 'turn off lamp');
    expect(dark).toContain('faintly glowing letter');
    expect(g.s.oflags['DIM-DOOR']?.INVISIBLE).toBeUndefined();
    expect(txt(g, 'look')).toContain('faint outline of a rectangle');

    expect(txt(g, 'open secret door')).toContain('opens noiselessly');
    expect(g.s.gflags['DIM-DOOR-FLAG']).toBe(true);
    selectGame(1);
  });

  it('squeaks its own door open and closed', () => {
    const g = at('CRYPT-ANTEROOM');
    expect(txt(g, 'open crypt door')).toContain('squeaks open');
    expect(txt(g, 'close crypt door')).toContain('squeaks closed');
    selectGame(1);
  });
});

describe('the quarry and the workshop', () => {
  it('will not be shifted, and reads its one letter', () => {
    const g = at('MENHIR-ROOM');
    expect(txt(g, 'read menhir')).toContain('"F"');
    expect(txt(g, 'take menhir')).toContain('weighs many tons');
    expect(txt(g, 'look behind menhir')).toContain('sizeable room in there');
    selectGame(1);
  });

  it('merges the three spheres into the black one', () => {
    const g = at('WORKBENCH-ROOM');
    g.s.locs['PALANTIR-1'] = 'ADVENTURER';
    g.s.locs['PALANTIR-2'] = 'ADVENTURER';
    g.s.locs['PALANTIR-3'] = 'ADVENTURER';
    txt(g, 'put red sphere in ruby stand');
    txt(g, 'put blue sphere in sapphire stand');
    const merged = txt(g, 'put clear sphere in diamond stand');
    expect(merged).toContain('strange black sphere');
    expect(g.s.locs['PALANTIR-1']).toBe(null);
    expect(g.s.locs['STAND-4']).toBe('WORKBENCH');
    selectGame(1);
  });

  it('shocks you for touching the trophies', () => {
    const g = at('TROPHY-ROOM');
    expect(txt(g, 'take degree')).toContain('nasty shock');
    selectGame(1);
  });
});

describe('the dragon', () => {
  function angry(): Game {
    const g = at('DRAGON-ROOM');
    txt(g, 'attack dragon');      // bare hands: noticed, but not hurt
    return g;
  }

  it('cannot be hurt, only annoyed', () => {
    const g = at('DRAGON-ROOM');
    expect(txt(g, 'attack dragon')).toContain('bare hands');
    expect(g.s.counters.dragonAnger).toBeGreaterThan(0);
    expect(txt(g, 'examine dragon')).toContain("cat's eyes");
    selectGame(1);
  });

  // Anger is the leash: an angry dragon follows you room to room, and the one
  // room you want him in is the glacier's.
  it('follows you to the glacier and melts it', () => {
    const g = angry();
    g.s.counters.dragonAnger = 6;
    g.s.here = 'GLACIER-ROOM';
    const said = txt(g, 'wait');
    expect(said).toContain('sees his reflection');
    expect(g.s.gflags['ICE-MELTED']).toBe(true);
    expect(g.s.locs['DRAGON']).toBe(null);
    expect(g.s.locs['DEAD-DRAGON']).toBe('DEEP-FORD');
    expect(g.s.counters.score).toBe(5);
    // Prose, exits and art all move with the same flag.
    delete g.s.touched['GLACIER-ROOM'];
    expect(txt(g, 'look')).toContain('still partly full of steam');
    selectGame(1);
  });

  it('incinerates you once you have pushed him too far', () => {
    const g = at('FRESCO-ROOM');       // not his room, so he cannot charge you
    g.s.locs['DRAGON'] = 'FRESCO-ROOM';
    g.s.counters.dragonAnger = 9;
    g.s.daemons['I-DRAGON'] = { tick: -1, enabled: true };
    const said = txt(g, 'wait');
    expect(said).toContain('tires of this game');
    expect(g.s.dead || said.includes('white-hot dragon fire')).toBe(true);
    selectGame(1);
  });

  it('takes a treasure as tribute and puts it in his chest', () => {
    const g = at('DRAGON-ROOM');
    g.s.locs['VIOLIN'] = 'ADVENTURER';
    expect(txt(g, 'give violin to dragon')).toContain('pleased by your gift');
    expect(g.s.locs['VIOLIN']).toBe('CHEST');
    selectGame(1);
  });
});
