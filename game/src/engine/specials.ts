// Per-object and per-room behavior: the actual puzzles of Zork I,
// ported from the ACTION routines in 1actions.zil.
import type { Ctx } from './ctx';
import { prob, pickOne, YUKS } from './ctx';
import { jigsUp } from './death';
import { checkNowDark } from './daemons';
import { playerAttack, wakeThiefForGift } from './melee';
import {
  fset, fclear, fset$, moveObj, removeObj, contents, inPlayer, roomOf, roomLit,
  PLAYER, DATA, theName, objDef, inventory,
} from './world';

const FOREST_ROOMS = ['FOREST-1', 'FOREST-2', 'FOREST-3', 'PATH', 'UP-A-TREE', 'GRATING-CLEARING', 'CLEARING', 'MOUNTAINS'];

function openClose(ctx: Ctx, obj: string, openMsg: string, closeMsg: string): void {
  const { s, out } = ctx;
  if (ctx.verb === 'open') {
    if (fset$(s, obj, 'OPENBIT')) out.tell(pickOne(ctx, ['Look around.', 'It is already open.']));
    else { out.tell(openMsg); fset(s, obj, 'OPENBIT'); }
  } else {
    if (fset$(s, obj, 'OPENBIT')) { out.tell(closeMsg); fclear(s, obj, 'OPENBIT'); }
    else out.tell('It is already closed.');
  }
}

function hasFlame(s: import('./types').WorldState): string | null {
  for (const o of inventory(s)) {
    if (fset$(s, o, 'FLAMEBIT') && fset$(s, o, 'ONBIT')) return o;
  }
  return null;
}

// ============================ OBJECT ACTIONS =================================
type Handler = (ctx: Ctx) => boolean; // true = handled

export const OBJ_ACTIONS: Record<string, Handler> = {
  MAILBOX: (ctx) => {
    if (ctx.verb === 'take') { ctx.out.tell('It is securely anchored.'); return true; }
    if (ctx.verb === 'open' && !fset$(ctx.s, 'MAILBOX', 'OPENBIT')) {
      fset(ctx.s, 'MAILBOX', 'OPENBIT');
      ctx.out.tell('Opening the small mailbox reveals a leaflet.');
      ctx.out.emit({ type: 'sfx', name: 'mailbox' });
      ctx.out.emit({ type: 'panel', key: 'events/mailbox-open' });
      return true;
    }
    return false;
  },
  'KITCHEN-WINDOW': (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'open' || ctx.verb === 'close') {
      openClose(ctx, 'KITCHEN-WINDOW',
        'With great effort, you open the window far enough to allow entry.',
        'The window closes (more easily than it opened).');
      out.emit({ type: 'sfx', name: 'window-open' });
      return true;
    }
    if (ctx.verb === 'enter' || ctx.verb === 'climb' || (ctx.verb === 'walk' && ctx.prep === 'through')) {
      if (!fset$(s, 'KITCHEN-WINDOW', 'OPENBIT')) { out.tell('The window is closed.'); return true; }
      const dest = s.here === 'KITCHEN' ? 'EAST-OF-HOUSE' : 'KITCHEN';
      ctx.moveTo(dest, true);
      if (dest === 'KITCHEN') out.emit({ type: 'panel', key: 'events/window-entry' });
      return true;
    }
    if (ctx.verb === 'examine' || ctx.verb === 'look-in') {
      out.tell(s.here === 'KITCHEN'
        ? 'You can see a clear area leading towards a forest.'
        : 'You can see what appears to be a kitchen.');
      return true;
    }
    return false;
  },
  RUG: (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'move' || ctx.verb === 'pull' || ctx.verb === 'push') {
      if (s.gflags['RUG-MOVED']) { out.tell('Having moved the carpet previously, you find it impossible to move it again.'); return true; }
      s.gflags['RUG-MOVED'] = true;
      fclear(s, 'TRAP-DOOR', 'INVISIBLE');
      out.tell('With a great effort, the rug is moved to one side of the room, revealing the dusty cover of a closed trap door.');
      out.emit({ type: 'panel', key: 'rooms/living-room-trapdoor-closed' });
      return true;
    }
    if (ctx.verb === 'take') { out.tell('The rug is extremely heavy and cannot be carried.'); return true; }
    if (ctx.verb === 'look-under') {
      if (!s.gflags['RUG-MOVED'] && !fset$(s, 'TRAP-DOOR', 'OPENBIT')) {
        out.tell('Underneath the rug is a closed trap door. As you drop the corner of the rug, the trap door is once again concealed from view.');
        return true;
      }
    }
    return false;
  },
  'TRAP-DOOR': (ctx) => {
    const { s, out } = ctx;
    if (fset$(s, 'TRAP-DOOR', 'INVISIBLE')) { out.tell("You can't see any trap door here!"); return true; }
    if (s.here === 'LIVING-ROOM' && (ctx.verb === 'open' || ctx.verb === 'close')) {
      openClose(ctx, 'TRAP-DOOR',
        'The door reluctantly opens to reveal a rickety staircase descending into darkness.',
        'The door swings shut and closes.');
      out.emit({ type: 'sfx', name: 'door-creak' });
      out.emit({
        type: 'panel',
        key: fset$(s, 'TRAP-DOOR', 'OPENBIT') ? 'rooms/living-room-trapdoor-open' : 'rooms/living-room-trapdoor-closed',
      });
      return true;
    }
    if (s.here === 'CELLAR' && (ctx.verb === 'open' || ctx.verb === 'unlock')) {
      if (!fset$(s, 'TRAP-DOOR', 'OPENBIT')) { out.tell('The door is locked from above.'); return true; }
    }
    return false;
  },
  'TROPHY-CASE': (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'open' || ctx.verb === 'close') {
      openClose(ctx, 'TROPHY-CASE', 'Opened.', 'Closed.');
      return true;
    }
    if (ctx.verb === 'take') { out.tell('The trophy case is securely fastened to the wall.'); return true; }
    return false;
  },
  LAMP: (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'lamp-on' || ctx.verb === 'light') {
      if (fset$(s, 'LAMP', 'RMUNGBIT')) { out.tell("A burned-out lamp won't light."); return true; }
      if (fset$(s, 'LAMP', 'ONBIT')) { out.tell('It is already on.'); return true; }
      const wasDark = !roomLit(s);
      fset(s, 'LAMP', 'ONBIT');
      out.tell('The brass lantern is now on.');
      out.emit({ type: 'sfx', name: 'lamp-on' });
      const idx = s.counters.lampIdx;
      const ticksLeft = [100, 70, 15, 0][idx] || 0;
      if (ticksLeft > 0) ctx.queue('I-LANTERN', ticksLeft);
      if (wasDark) { out.emit({ type: 'panel', key: 'events/lamp-lit' }); ctx.perform('look'); }
      return true;
    }
    if (ctx.verb === 'lamp-off' || ctx.verb === 'extinguish') {
      if (fset$(s, 'LAMP', 'RMUNGBIT')) { out.tell('The lamp has already burned out.'); return true; }
      if (!fset$(s, 'LAMP', 'ONBIT')) { out.tell('It is already off.'); return true; }
      fclear(s, 'LAMP', 'ONBIT');
      ctx.disable('I-LANTERN');
      out.tell('The brass lantern is now off.');
      out.emit({ type: 'sfx', name: 'lamp-off' });
      checkNowDark(ctx);
      return true;
    }
    if (ctx.verb === 'examine') {
      out.tell(`The lamp ${fset$(s, 'LAMP', 'RMUNGBIT') ? 'has burned out.' : fset$(s, 'LAMP', 'ONBIT') ? 'is on.' : 'is turned off.'}`);
      return true;
    }
    if (ctx.verb === 'throw') {
      out.tell('The lamp has smashed into the floor, and the light has gone out.');
      ctx.disable('I-LANTERN');
      removeObj(s, 'LAMP');
      moveObj(s, 'BROKEN-LAMP', s.here);
      checkNowDark(ctx);
      return true;
    }
    return false;
  },
  MATCH: (ctx) => {
    const { s, out } = ctx;
    if ((ctx.verb === 'light' || ctx.verb === 'burn' || ctx.verb === 'lamp-on') && ctx.dobj === 'MATCH') {
      if (s.counters.matches <= 0) { out.tell('I\'m afraid that you have run out of matches.'); return true; }
      if (s.here === 'GAS-ROOM') { gasExplosion(ctx); return true; }
      s.counters.matches -= 1;
      fset(s, 'MATCH', 'ONBIT'); fset(s, 'MATCH', 'FLAMEBIT');
      out.tell('One of the matches starts to burn.');
      out.emit({ type: 'sfx', name: 'match-strike' });
      ctx.queue('I-MATCH', 2);
      return true;
    }
    if (ctx.verb === 'extinguish') {
      fclear(s, 'MATCH', 'ONBIT'); fclear(s, 'MATCH', 'FLAMEBIT');
      out.tell('The match is out.');
      ctx.disable('I-MATCH');
      return true;
    }
    if (ctx.verb === 'count') { out.tell(`You have ${s.counters.matches} matches.`); return true; }
    return false;
  },
  CANDLES: (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'light' || ctx.verb === 'burn' || ctx.verb === 'lamp-on') {
      if (fset$(s, 'CANDLES', 'RMUNGBIT')) { out.tell("Alas, there's not much left of the candles. Certainly not enough to burn."); return true; }
      if (fset$(s, 'CANDLES', 'ONBIT')) { out.tell('The candles are already lit.'); return true; }
      if (s.here === 'GAS-ROOM') { gasExplosion(ctx); return true; }
      const flame = hasFlame(s);
      if (!flame && ctx.iobj !== 'MATCH') { out.tell('You should light a match first.'); return true; }
      if (ctx.iobj === 'MATCH' && !fset$(s, 'MATCH', 'ONBIT')) { out.tell('With an unlit match?!?'); return true; }
      fset(s, 'CANDLES', 'ONBIT'); fset(s, 'CANDLES', 'FLAMEBIT');
      out.tell('The candles are lit.');
      const ticksLeft = [20, 10, 5, 0][s.counters.candleIdx] || 0;
      if (ticksLeft > 0) ctx.queue('I-CANDLES', ticksLeft);
      if (s.here === 'ENTRANCE-TO-HADES' && s.gflags['XB']) {
        s.gflags['XC'] = true;
        ctx.queue('I-XC', 3);
        out.tell('The flames flicker low and the spirits cower at your unearthly power.');
      }
      return true;
    }
    if (ctx.verb === 'extinguish') {
      if (!fset$(s, 'CANDLES', 'ONBIT')) { out.tell('The candles are not lighted.'); return true; }
      fclear(s, 'CANDLES', 'ONBIT'); fclear(s, 'CANDLES', 'FLAMEBIT');
      ctx.disable('I-CANDLES');
      out.tell('The flame is extinguished.');
      checkNowDark(ctx);
      return true;
    }
    return false;
  },
  TORCH: (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'extinguish') { out.tell('You nearly burn your hand trying to extinguish the flame.'); return true; }
    if (ctx.verb === 'take' && s.here === 'TORCH-ROOM' && !s.fdescGone['TORCH']) return false;
    return false;
  },
  ROPE: (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'tie') {
      if (s.here === 'DOME-ROOM' && (ctx.iobj === 'RAILING' || !ctx.iobj)) {
        if (s.gflags['DOME-FLAG']) { out.tell('The rope is already tied to it.'); return true; }
        s.gflags['DOME-FLAG'] = true;
        moveObj(s, 'ROPE', 'DOME-ROOM');
        fset(s, 'ROPE', 'NDESCBIT');
        out.tell('The rope drops over the side and comes within ten feet of the floor.');
        return true;
      }
      out.tell('You can\'t tie the rope to that.');
      return true;
    }
    if (ctx.verb === 'untie') {
      if (s.gflags['DOME-FLAG']) { s.gflags['DOME-FLAG'] = false; fclear(s, 'ROPE', 'NDESCBIT'); out.tell('The rope is now untied.'); }
      else out.tell('It is not tied to anything.');
      return true;
    }
    if (ctx.verb === 'take' && s.gflags['DOME-FLAG']) { out.tell('The rope is tied to the railing.'); return true; }
    if ((ctx.verb === 'climb' || ctx.verb === 'climb-down') && s.here === 'DOME-ROOM') {
      if (s.gflags['DOME-FLAG']) { ctx.moveTo('TORCH-ROOM', true); return true; }
      out.tell('You cannot climb down without fracturing many of your favorite bones.');
      return true;
    }
    return false;
  },
  EGG: (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'open' && !fset$(s, 'EGG', 'OPENBIT')) {
      if (ctx.iobj && ['SWORD', 'KNIFE', 'AXE', 'SCREWDRIVER'].includes(ctx.iobj)) {
        fset(s, 'EGG', 'OPENBIT');
        moveObj(s, 'BROKEN-CANARY', 'EGG');
        out.tell('The egg is now open, but the clumsiness of your attempt has seriously compromised its esthetic appeal. There is a golden clockwork canary nestled in the egg. It seems to have recently had a bad experience. The mountings for its jewel-like eyes are empty, and its silver beak is crumpled. Through a cracked crystal window below its left wing you can see the remains of intricate machinery. It is not clear what result winding it would have, as the mainspring seems sprung.');
        return true;
      }
      out.tell('You have neither the tools nor the expertise.');
      return true;
    }
    return false;
  },
  CANARY: (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'wind') {
      if (FOREST_ROOMS.includes(s.here) && !s.gflags['SING-SONG']) {
        s.gflags['SING-SONG'] = true;
        moveObj(s, 'BAUBLE', s.here);
        out.tell('The canary chirps, slightly off-key, an aria from a forgotten opera. From out of the greenery flies a lovely songbird. It perches on a limb just over your head and opens its beak to sing. As it does so a beautiful brass bauble drops from its mouth, bounces off the top of your head, and lands glimmering in the grass. As the canary winds down, the songbird flies away.');
        out.emit({ type: 'sfx', name: 'treasure-chime' });
        return true;
      }
      out.tell('The canary chirps blithely, if somewhat tinnily, for a short time.');
      return true;
    }
    return false;
  },
  GRATE: (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'unlock') {
      if (s.here === 'GRATING-ROOM' && ctx.iobj === 'KEYS') {
        s.gflags['GRUNLOCK'] = true;
        out.tell('The grate is unlocked.');
        return true;
      }
      if (s.here === 'GRATING-CLEARING') { out.tell('You can\'t reach the lock from here.'); return true; }
      out.tell('Can you unlock a grating with that?');
      return true;
    }
    if (ctx.verb === 'lock') { s.gflags['GRUNLOCK'] = false; out.tell('The grate is locked.'); return true; }
    if (ctx.verb === 'open' || ctx.verb === 'close') {
      if (!s.gflags['GRUNLOCK'] && ctx.verb === 'open') { out.tell('The grating is locked.'); return true; }
      if (ctx.verb === 'open' && !fset$(s, 'GRATE', 'OPENBIT')) {
        fset(s, 'GRATE', 'OPENBIT');
        if (s.here === 'GRATING-ROOM' && !s.gflags['GRATE-REVEALED']) {
          s.gflags['GRATE-REVEALED'] = true;
          out.tell('A pile of leaves falls onto your head and to the ground.');
          moveObj(s, 'LEAVES', 'GRATING-ROOM');
        } else out.tell('The grating opens.');
        if (s.here === 'GRATING-CLEARING') out.tell('The grating opens to reveal trees above you.');
        out.emit({ type: 'sfx', name: 'door-creak' });
        return true;
      }
      if (ctx.verb === 'close') { fclear(s, 'GRATE', 'OPENBIT'); out.tell('The grating is closed.'); return true; }
      out.tell('It is already open.');
      return true;
    }
    return false;
  },
  LEAVES: (ctx) => {
    const { s, out } = ctx;
    if (['move', 'take', 'count', 'burn', 'look-under'].includes(ctx.verb)) {
      if (ctx.verb === 'count') { out.tell('There are 69,105 leaves here.'); return true; }
      if (ctx.verb === 'burn') {
        const flame = hasFlame(s);
        if (!flame) { out.tell('You should light a match first.'); return true; }
        removeObj(s, 'LEAVES');
        if (!s.gflags['GRATE-REVEALED'] && s.here === 'GRATING-CLEARING') {
          s.gflags['GRATE-REVEALED'] = true; fclear(s, 'GRATE', 'INVISIBLE');
        }
        out.tell('The leaves burn, and so do you, seeing as you were standing on top of them. In the ensuing conflagration, you are burned to a crisp.');
        jigsUp(ctx, 'It seems burning leaves while standing on them was unwise.', {});
        return true;
      }
      if (s.here === 'GRATING-CLEARING' && !s.gflags['GRATE-REVEALED']) {
        s.gflags['GRATE-REVEALED'] = true;
        fclear(s, 'GRATE', 'INVISIBLE');
        out.tell('In disturbing the pile of leaves, a grating is revealed.');
        out.emit({ type: 'panel', key: 'rooms/grating-clearing' });
        if (ctx.verb === 'take') { moveObj(s, 'LEAVES', PLAYER); out.tell('Taken.'); }
        return true;
      }
    }
    return false;
  },
  BOTTLE: (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'throw' || ctx.verb === 'break') {
      removeObj(s, 'BOTTLE');
      if (roomOf(s, 'WATER') || inPlayer(s, 'WATER')) removeObj(s, 'WATER');
      out.tell('The bottle hits the far wall and shatters.');
      return true;
    }
    return false;
  },
  WATER: waterHandler,
  'GLOBAL-WATER': waterHandler,
  AXE: (ctx) => weaponFunction(ctx, 'AXE', 'TROLL', () => ctx.s.gflags['TROLL-FLAG']),
  STILETTO: (ctx) => weaponFunction(ctx, 'STILETTO', 'THIEF', () => ctx.s.gflags['THIEF-DEAD']),
  GARLIC: (ctx) => {
    if (ctx.verb === 'eat') {
      ctx.out.tell('What the heck! You won\'t make friends this way, but nobody around here is too friendly anyhow. Gulp!');
      removeObj(ctx.s, 'GARLIC');
      return true;
    }
    return false;
  },
  LUNCH: (ctx) => {
    if (ctx.verb === 'eat') {
      ctx.out.tell('Thank you very much. It really hit the spot.');
      removeObj(ctx.s, 'LUNCH');
      return true;
    }
    return false;
  },
  BELL: (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'ring') {
      if (s.here === 'ENTRANCE-TO-HADES' && s.gflags['LLD-UNSTARTED'] !== false) {
        s.gflags['XB'] = true;
        removeObj(s, 'BELL');
        moveObj(s, 'HOT-BELL', 'ENTRANCE-TO-HADES');
        out.tell('The bell suddenly becomes red hot and falls to the ground. The wraiths, as if paralyzed, stop their jeering and slowly turn to face you. On their ashen faces, the expression of a long-forgotten terror takes shape.');
        if (inPlayer(s, 'CANDLES')) {
          moveObj(s, 'CANDLES', s.here);
          fclear(s, 'CANDLES', 'ONBIT');
          fclear(s, 'CANDLES', 'FLAMEBIT');
          out.tell('In your confusion, the candles drop to the ground (and they are out).');
        }
        out.emit({ type: 'sfx', name: 'bell' });
        out.emit({ type: 'panel', key: 'events/exorcism' });
        ctx.queue('I-XB', 6);
        return true;
      }
      out.tell('Ding, dong.');
      out.emit({ type: 'sfx', name: 'bell' });
      return true;
    }
    return false;
  },
  'HOT-BELL': (ctx) => {
    if (ctx.verb === 'take' || ctx.verb === 'ring' || ctx.verb === 'touch') {
      ctx.out.tell('The bell is very hot and cannot be taken.');
      return true;
    }
    return false;
  },
  BOOK: (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'read') {
      if (s.here === 'ENTRANCE-TO-HADES' && s.gflags['XC']) {
        // the final act of the exorcism
        s.gflags['LLD-FLAG'] = true;
        s.gflags['XC'] = false;
        removeObj(s, 'GHOSTS');
        out.tell('Each word of the prayer reverberates through the hall in a deafening confusion. As the last word fades, a voice, loud and commanding, speaks: "Begone, fiends!" A heart-stopping scream fills the cavern, and the spirits, sensing a greater power, flee through the walls.');
        out.emit({ type: 'panel', key: 'rooms/hades-banished' });
        out.emit({ type: 'sfx', name: 'magic-shimmer' });
        return true;
      }
      out.tell('Commandment #12592\n\nOh ye who go about saying unto each: "Hello sailor":\nDost thou know the magnitude of thy sin before the gods?\nYea, verily, thou shalt be ground between two stones.\nShall the angry gods cast thy body into the whirlpool?\nSurely, thy eye shall be put out with a sharp stick!\nEven unto the ends of the earth shalt thou wander and\nUnto the land of the dead shalt thou be sent at last.\nSurely thou shalt repent of thy cunning.');
      return true;
    }
    if (ctx.verb === 'burn') { jigsUp(ctx, 'A booming voice says "Wrong, cretin!" and you notice that you have turned into a pile of dust. How, I can\'t imagine.', {}); return true; }
    return false;
  },
  GHOSTS: (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'attack' || ctx.verb === 'exorcise') {
      out.tell('How can you attack a spirit with material objects?');
      return true;
    }
    return false;
  },
  SHOVEL: (ctx) => false,
  SAND: (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'dig') {
      if (!inPlayer(s, 'SHOVEL') && ctx.iobj !== 'SHOVEL') { out.tell('Digging with your hands is slow and tedious.'); return true; }
      if (s.here !== 'SANDY-CAVE') { out.tell('The ground is too hard for digging here.'); return true; }
      const n = (s.counters.dug = (s.counters.dug ?? 0) + 1);
      if (n === 1) out.tell('You seem to be digging a hole here.');
      else if (n === 2) out.tell('The hole is getting deeper, but that\'s about it.');
      else if (n === 3) out.tell('You are surrounded by a wall of sand on all sides.');
      else if (n === 4) {
        fclear(s, 'SCARAB', 'INVISIBLE');
        moveObj(s, 'SCARAB', 'SANDY-CAVE');
        out.tell('You can see a scarab here in the sand.');
        out.emit({ type: 'sfx', name: 'treasure-chime' });
      } else {
        jigsUp(ctx, 'The hole collapses, smothering you.', {});
      }
      return true;
    }
    return false;
  },
  'YELLOW-BUTTON': buttonHandler('YELLOW'),
  'BLUE-BUTTON': buttonHandler('BLUE'),
  'RED-BUTTON': buttonHandler('RED'),
  'BROWN-BUTTON': buttonHandler('BROWN'),
  BOLT: (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'turn') {
      if (ctx.iobj !== 'WRENCH') { out.tell(`The bolt won't turn with your best effort.`); return true; }
      if (!s.gflags['GATE-FLAG']) { out.tell('The bolt won\'t turn using the wrench.'); return true; }
      if (s.gflags['LOW-TIDE']) {
        s.gflags['LOW-TIDE'] = false; // actually closing gates refills
        out.tell('The sluice gates close and water starts to collect behind the dam.');
        ctx.queue('I-RFILL', 8);
      } else {
        out.tell('The sluice gates open and water pours through the dam.');
        out.emit({ type: 'sfx', name: 'dam-machinery' });
        out.emit({ type: 'panel', key: 'rooms/dam-room' });
        ctx.queue('I-REMPTY', 8);
      }
      return true;
    }
    return false;
  },
  LEAK: (ctx) => {
    const { s, out } = ctx;
    if ((ctx.verb === 'put' && ctx.dobj === 'PUTTY') || ctx.verb === 'fix' || (ctx.verb === 'touch' && inPlayer(s, 'PUTTY'))) {
      return false;
    }
    return false;
  },
  PUTTY: (ctx) => {
    const { s, out } = ctx;
    if ((ctx.verb === 'put' && (ctx.iobj === 'LEAK' || ctx.iobj === 'MACHINE')) || (ctx.verb === 'squeeze' && ctx.iobj === 'LEAK')) {
      if (ctx.enabled('I-MAINT-ROOM')) {
        ctx.disable('I-MAINT-ROOM');
        out.tell('By some miracle of Zorkian technology, you have managed to stop the leak in the dam.');
        return true;
      }
    }
    return false;
  },
  MACHINE: (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'open') {
      if (fset$(s, 'MACHINE', 'OPENBIT')) { out.tell('It is already open.'); return true; }
      fset(s, 'MACHINE', 'OPENBIT');
      const inside = contents(s, 'MACHINE');
      out.tell(inside.length
        ? `The lid opens, revealing ${inside.map((o) => `a ${objDef(o).desc}`).join(', ')}.`
        : 'The lid opens.');
      return true;
    }
    if (ctx.verb === 'close') { fclear(s, 'MACHINE', 'OPENBIT'); out.tell('The lid closes.'); return true; }
    if (ctx.verb === 'lamp-on' || ctx.verb === 'turn') {
      out.tell('It\'s not clear how to turn it on with your bare hands.');
      return true;
    }
    return false;
  },
  'MACHINE-SWITCH': (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'turn') {
      if (ctx.iobj !== 'SCREWDRIVER') { out.tell('It seems that a screwdriver is required to turn the switch.'); return true; }
      if (fset$(s, 'MACHINE', 'OPENBIT')) { out.tell('The machine doesn\'t seem to want to do anything with the lid open.'); return true; }
      const inside = contents(s, 'MACHINE');
      if (inside.includes('COAL')) {
        removeObj(s, 'COAL');
        moveObj(s, 'DIAMOND', 'MACHINE');
        out.tell('The machine comes to life (figuratively) with a dazzling display of colored lights and bizarre noises. After a few moments, the excitement abates.');
        out.emit({ type: 'sfx', name: 'machine-diamond' });
        out.emit({ type: 'panel', key: 'events/machine-diamond' });
      } else if (inside.length) {
        for (const o of inside) { removeObj(s, o); }
        moveObj(s, 'GUNK', 'MACHINE');
        out.tell('The machine comes to life (figuratively) with a dazzling display of colored lights and bizarre noises. After a few moments, the excitement abates.');
      } else {
        out.tell('The machine emits a dull hum, but nothing else happens.');
      }
      return true;
    }
    return false;
  },
  'RAISED-BASKET': (ctx) => basketHandler(ctx, true),
  'LOWERED-BASKET': (ctx) => basketHandler(ctx, false),
  BAT: (ctx) => {
    if (['attack', 'take', 'examine'].includes(ctx.verb)) {
      ctx.out.tell('You can\'t reach him; he\'s on the ceiling.');
      return true;
    }
    return false;
  },
  TROLL: (ctx) => {
    const { s, out } = ctx;
    if (s.gflags['TROLL-DEAD']) return false;
    if (ctx.verb === 'attack') { playerAttack(ctx, 'TROLL', ctx.iobj); return true; }
    if (ctx.verb === 'give' || ctx.verb === 'throw') {
      const item = ctx.dobj === 'TROLL' ? ctx.iobj : ctx.dobj;
      if (item && item !== 'TROLL') {
        removeObj(s, item);
        out.tell(`The troll, who is remarkably coordinated, catches the ${objDef(item).desc}${item === 'AXE' ? ' and eyes it warily' : ''} and, being for the moment sated, throws it back. Fortunately, the troll has poor control, and the ${objDef(item).desc} falls to the floor. He does not look pleased.`);
        moveObj(s, item, 'TROLL-ROOM');
        return true;
      }
    }
    if (ctx.verb === 'talk' || ctx.verb === 'hello') {
      out.tell('The troll isn\'t much of a conversationalist.');
      return true;
    }
    return false;
  },
  THIEF: (ctx) => {
    const { s, out } = ctx;
    if (s.gflags['THIEF-DEAD']) return false;
    if (ctx.verb === 'attack') { playerAttack(ctx, 'THIEF', ctx.iobj); return true; }
    if (ctx.verb === 'give' || ctx.verb === 'throw') {
      const item = ctx.dobj === 'THIEF' ? ctx.iobj : ctx.dobj;
      if (!item || item === 'THIEF') return false;
      wakeThiefForGift(ctx);
      removeObj(s, item);
      moveObj(s, item, 'LARGE-BAG');
      if (item === 'EGG') {
        s.gflags['THIEF-HAS-EGG'] = true;
        out.tell('The thief is taken aback by your unexpected generosity, but accepts the egg and stops to admire its beauty.');
      } else if ((objDef(item).tvalue ?? 0) > 0) {
        out.tell(`The thief examines the ${objDef(item).desc} with obvious delight, and stashes it in his bag. He seems mollified — engrossed, even.`);
      } else {
        out.tell(`The thief places the ${objDef(item).desc} in his bag and thanks you politely.`);
      }
      s.thiefEngrossed = true;
      return true;
    }
    return false;
  },
  CYCLOPS: (ctx) => {
    const { s, out } = ctx;
    if (s.gflags['MAGIC-FLAG'] || s.gflags['CYCLOPS-FLAG']) return false;
    if (ctx.verb === 'give') {
      const item = ctx.dobj === 'CYCLOPS' ? ctx.iobj : ctx.dobj;
      if (item === 'LUNCH') {
        removeObj(s, 'LUNCH');
        s.gflags['CYCLOPS-ATE'] = true;
        out.tell('The cyclops says "Mmm Mmm. I love hot peppers! But oh, could I use a drink. Perhaps I could drink the blood of that thing." From the gleam in his eye, it could be surmised that you are "that thing".');
        return true;
      }
      if (item === 'BOTTLE' || item === 'WATER') {
        if (!s.gflags['CYCLOPS-ATE']) { out.tell('The cyclops apparently is not thirsty and refuses your generous offer.'); return true; }
        removeObj(s, 'WATER');
        s.gflags['CYCLOPS-FLAG'] = true;
        out.tell('The cyclops takes the bottle, checks that it\'s open, and drinks the water. A moment later, he lets out a yawn that nearly blows you over, and then falls fast asleep (what did you put in that drink, anyway?).');
        s.counters.cyclowrath = 0;
        return true;
      }
      out.tell('The cyclops is not so stupid as to eat THAT!');
      return true;
    }
    if (ctx.verb === 'attack') { playerAttack(ctx, 'CYCLOPS', ctx.iobj); return true; }
    return false;
  },
  BUOY: (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'open' && !fset$(s, 'BUOY', 'OPENBIT')) {
      fset(s, 'BUOY', 'OPENBIT');
      fclear(s, 'EMERALD', 'INVISIBLE');
      out.tell('Opening the red buoy reveals a large emerald.');
      out.emit({ type: 'sfx', name: 'treasure-chime' });
      return true;
    }
    return false;
  },
  'PUMP': (ctx) => false,
  'INFLATABLE-BOAT': (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'inflate') {
      if (!inPlayer(s, 'PUMP') && ctx.iobj !== 'PUMP') { out.tell('You don\'t have enough lung power to inflate it.'); return true; }
      removeObj(s, 'INFLATABLE-BOAT');
      moveObj(s, 'INFLATED-BOAT', s.here);
      out.tell('The boat inflates and appears seaworthy. A tan label is lying inside the boat.');
      moveObj(s, 'BOAT-LABEL', 'INFLATED-BOAT');
      out.emit({ type: 'sfx', name: 'boat-inflate' });
      return true;
    }
    return false;
  },
  'INFLATED-BOAT': (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'enter' || ctx.verb === 'board' || (ctx.verb === 'walk' && ctx.dobj === 'INFLATED-BOAT')) {
      const sharp = inventory(s).find((o) => ['SWORD', 'AXE', 'KNIFE', 'RUSTY-KNIFE', 'STILETTO', 'SCEPTRE'].includes(o));
      if (sharp) {
        out.tell(`Oops! Something sharp seems to have slipped and punctured the boat. The boat deflates to the sounds of hissing, sputtering, and cursing.`);
        removeObj(s, 'INFLATED-BOAT');
        moveObj(s, 'PUNCTURED-BOAT', s.here);
        return true;
      }
      s.gflags['IN-BOAT'] = true;
      out.tell('You are now in the magic boat.');
      return true;
    }
    if (ctx.verb === 'deflate') {
      if (s.gflags['IN-BOAT']) { out.tell('You can\'t deflate the boat while you\'re in it.'); return true; }
      removeObj(s, 'INFLATED-BOAT');
      moveObj(s, 'INFLATABLE-BOAT', s.here);
      out.tell('The boat deflates.');
      return true;
    }
    if (ctx.verb === 'launch') {
      if (!s.gflags['IN-BOAT']) { out.tell('You have to be in the boat to launch it.'); return true; }
      const LAUNCH: Record<string, string> = {
        'DAM-BASE': 'RIVER-1', 'WHITE-CLIFFS-NORTH': 'RIVER-3', 'WHITE-CLIFFS-SOUTH': 'RIVER-4',
        'SANDY-BEACH': 'RIVER-4', 'SHORE': 'RIVER-5',
      };
      const dest = LAUNCH[s.here];
      if (!dest) { out.tell('You can\'t launch it here.'); return true; }
      moveObj(s, 'INFLATED-BOAT', dest);
      out.emit({ type: 'sfx', name: 'water-splash' });
      ctx.moveTo(dest, true);
      out.emit({ type: 'panel', key: 'events/boat-launch' });
      ctx.queue('I-RIVER', 3);
      return true;
    }
    return false;
  },
  SCEPTRE: (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'wave') {
      if (s.here === 'ARAGAIN-FALLS' || s.here === 'END-OF-RAINBOW') {
        if (!s.gflags['RAINBOW-FLAG']) {
          s.gflags['RAINBOW-FLAG'] = true;
          out.tell('Suddenly, the rainbow appears to become solid and, I venture, walkable (I think the giveaway was the stairs and bannister).');
          out.emit({ type: 'panel', key: 'rooms/rainbow-solid' });
          out.emit({ type: 'sfx', name: 'magic-shimmer' });
          if (!s.gflags['POT-SEEN'] && s.here === 'END-OF-RAINBOW') {
            s.gflags['POT-SEEN'] = true;
            fclear(s, 'POT-OF-GOLD', 'INVISIBLE');
            out.tell('A shimmering pot of gold appears at the end of the rainbow.');
          }
        } else {
          s.gflags['RAINBOW-FLAG'] = false;
          out.tell('The rainbow seems to have become somewhat run-of-the-mill.');
        }
        return true;
      }
      if (s.here === 'ON-RAINBOW') {
        jigsUp(ctx, 'The structural integrity of the rainbow is severely compromised, leaving you hanging in mid-air, supported only by water vapor. Bye.', { panel: 'events/falls-death' });
        return true;
      }
      out.tell('A dazzling display of color briefly emanates from the sceptre.');
      return true;
    }
    return false;
  },
  'MIRROR-1': mirrorHandler,
  'MIRROR-2': mirrorHandler,
  BONES: (ctx) => {
    if (['touch', 'move', 'take', 'push'].includes(ctx.verb)) {
      const { s, out } = ctx;
      out.tell('A ghost appears in the room and is appalled at your desecration of the remains of a fellow adventurer. He casts a curse on your valuables and banishes them to the Land of the Living Dead. The ghost leaves, muttering obscenities.');
      for (const o of inventory(s)) {
        if ((objDef(o).tvalue ?? 0) > 0) moveObj(s, o, 'LAND-OF-LIVING-DEAD');
      }
      return true;
    }
    return false;
  },
  CHALICE: (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb === 'take' && s.here === 'TREASURE-ROOM' && !s.gflags['THIEF-DEAD'] &&
        !s.gflags['THIEF-UNCONSCIOUS'] && !s.thiefEngrossed) {
      out.tell('Realizing just in time that the thief is watching you, you relinquish your claim to the chalice.');
      return true;
    }
    return false;
  },
  MAP: (ctx) => {
    const { s } = ctx;
    if (ctx.verb === 'read' || ctx.verb === 'examine') {
      ctx.out.tell('The map shows a forest with three clearings. The largest clearing contains a house. Three paths leave the large clearing. One of these paths, leading southwest, is marked "To Stone Barrow".');
      return true;
    }
    return false;
  },
  BARROW: (ctx) => {
    if (ctx.verb === 'enter' || (ctx.verb === 'walk' && ctx.prep === 'in')) {
      ctx.winGame();
      return true;
    }
    return false;
  },
  'BOAT-LABEL': (ctx) => {
    if (ctx.verb === 'read') {
      ctx.out.tell('!!!!FROBOZZ MAGIC BOAT COMPANY!!!!\n\nHello, Sailor!\n\nInstructions for use:\n   To get into a body of water, say "Launch".\n   To get to shore, say "Land" or the direction in which you want to maneuver the boat.\n\nWarranty:\n  This boat is guaranteed against all defects for a period of 76 milliseconds from date of purchase or until first used, whichever comes first.\n\nWarning:\n   This boat is made of thin plastic.\n   Good Luck!');
      return true;
    }
    return false;
  },
  GRUE: (ctx) => {
    if (ctx.verb === 'examine') {
      ctx.out.tell('The grue is a sinister, lurking presence in the dark places of the earth. Its favorite diet is adventurers, but its insatiable appetite is tempered by its fear of light. No grue has ever been seen by the light of day, and few have survived its fearsome jaws to tell the tale.');
      return true;
    }
    return false;
  },
};

function waterHandler(ctx: Ctx): boolean {
  const { s, out } = ctx;
  if (ctx.verb === 'drink') {
    if (inPlayer(s, 'BOTTLE') && s.locs['WATER'] === 'BOTTLE') {
      if (!fset$(s, 'BOTTLE', 'OPENBIT')) { out.tell('You\'ll have to open the bottle first.'); return true; }
      removeObj(s, 'WATER');
      out.tell('Thank you very much. I was rather thirsty (from all this talking, probably).');
      return true;
    }
    out.tell('Thank you very much. I was rather thirsty (from all this talking, probably).');
    return true;
  }
  if (ctx.verb === 'pour' || ctx.verb === 'empty') {
    if (s.locs['WATER'] === 'BOTTLE') {
      removeObj(s, 'WATER');
      out.tell('The water spills to the floor and evaporates.');
      return true;
    }
  }
  if (ctx.verb === 'take') {
    if (s.locs['WATER'] === 'BOTTLE') {
      out.tell("It's in the bottle. Perhaps you should take that instead.");
    } else {
      out.tell('The water slips through your fingers.');
    }
    return true;
  }
  return false;
}

/** Ports WEAPON-FUNCTION: a villain's held weapon can't be taken/attacked-with while he's alive and holds it. */
function weaponFunction(ctx: Ctx, weapon: string, villain: string, defeated: () => boolean): boolean {
  const { s, out } = ctx;
  if (defeated()) return false; // weapon is free once the villain is dead/fled
  if (roomOf(s, villain) !== s.here) return false; // villain not here: no guard
  if (ctx.verb !== 'take') return false;
  if (s.locs[weapon] === villain) {
    out.tell(`The ${objDef(villain).desc} swings it out of your reach.`);
  } else {
    out.tell(`The ${objDef(weapon).desc} seems white-hot. You can't hold on to it.`);
  }
  return true;
}

function mirrorHandler(ctx: Ctx): boolean {
    const { s, out } = ctx;
    if (ctx.verb === 'touch' || ctx.verb === 'rub') {
      if (s.here === 'MIRROR-ROOM-1') { ctx.moveTo('MIRROR-ROOM-2', false); out.tell('There is a rumble from deep within the earth and the room shakes.'); ctx.perform('look'); return true; }
      if (s.here === 'MIRROR-ROOM-2') { ctx.moveTo('MIRROR-ROOM-1', false); out.tell('There is a rumble from deep within the earth and the room shakes.'); ctx.perform('look'); return true; }
      return false;
    }
    if (ctx.verb === 'break') {
      s.gflags['MIRROR-MUNG'] = true;
      out.tell('You have broken the mirror. I hope you have a seven years\' supply of good luck handy.');
      return true;
    }
    if (ctx.verb === 'examine' || ctx.verb === 'look-in') {
      out.tell('There is an ugly person staring back at you.');
      return true;
    }
    return false;
}

function buttonHandler(color: string): Handler {
  return (ctx) => {
    const { s, out } = ctx;
    if (ctx.verb !== 'push') return false;
    out.emit({ type: 'sfx', name: 'ui-click' });
    if (color === 'YELLOW') {
      if (!s.gflags['GATE-FLAG']) { s.gflags['GATE-FLAG'] = true; out.tell('Click.'); }
      else out.tell('Click.');
      out.emit({ type: 'panel', key: 'events/dam-button' });
      return true;
    }
    if (color === 'BROWN') { s.gflags['GATE-FLAG'] = false; out.tell('Click.'); return true; }
    if (color === 'RED') {
      const lit = s.gflags['MAINT-LIGHTS'] = !s.gflags['MAINT-LIGHTS'];
      out.tell(lit ? 'The lights within the room come on.' : 'The lights within the room shut off.');
      return true;
    }
    if (color === 'BLUE') {
      if (s.gflags['MAINT-FLOODED'] || ctx.enabled('I-MAINT-ROOM')) { out.tell('The blue button appears to be jammed.'); return true; }
      out.tell('There is a rumbling sound and a stream of water appears to burst from the east wall of the room (apparently, a leak has occurred in a pipe).');
      out.emit({ type: 'sfx', name: 'flood-rising' });
      out.emit({ type: 'panel', key: 'rooms/maintenance-flooding' });
      ctx.queue('I-MAINT-ROOM', -1);
      return true;
    }
    return false;
  };
}

function basketHandler(ctx: Ctx, raised: boolean): boolean {
  const { s, out } = ctx;
  const basketAtTop = s.locs['RAISED-BASKET'] === 'SHAFT-ROOM';
  if (ctx.verb === 'lower') {
    if (s.here !== 'SHAFT-ROOM' || !basketAtTop) { out.tell('You can\'t lower it from here.'); return true; }
    moveObj(s, 'RAISED-BASKET', 'LOWER-SHAFT');
    moveObj(s, 'LOWERED-BASKET', 'SHAFT-ROOM');
    out.tell('The basket is lowered to the bottom of the shaft.');
    return true;
  }
  if (ctx.verb === 'raise') {
    if (s.here !== 'SHAFT-ROOM' || basketAtTop) { out.tell('It\'s already up here.'); return true; }
    moveObj(s, 'RAISED-BASKET', 'SHAFT-ROOM');
    moveObj(s, 'LOWERED-BASKET', 'LOWER-SHAFT');
    out.tell('The basket is raised to the top of the shaft.');
    return true;
  }
  if (ctx.verb === 'take') { out.tell('The cage is securely fastened to the iron chain.'); return true; }
  return false;
}

function gasExplosion(ctx: Ctx): void {
  jigsUp(ctx,
    'Oh dear. It appears that the smell coming from this room was coal gas. I would have thought twice about carrying flaming objects in here.\n\n     ** BOOOOOOOOOOOM **',
    { panel: 'events/gas-explosion' });
}

// ============================ ROOM ACTIONS ===================================
type RoomHandler = (ctx: Ctx, phase: 'enter' | 'end') => boolean;

export const ROOM_ACTIONS: Record<string, RoomHandler> = {
  'CELLAR': (ctx, phase) => {
    const { s, out } = ctx;
    if (phase === 'enter' && fset$(s, 'TRAP-DOOR', 'OPENBIT') && !s.gflags['THIEF-DEAD'] && !s.gflags['TRAP-UNLOCKED']) {
      fclear(s, 'TRAP-DOOR', 'OPENBIT');
      out.tell('The trap door crashes shut, and you hear someone barring it.');
      out.emit({ type: 'sfx', name: 'trapdoor-slam' });
      out.emit({ type: 'panel', key: 'events/door-slam' });
    }
    return false;
  },
  'GAS-ROOM': (ctx, phase) => {
    if (phase === 'enter') {
      const flame = hasFlame(ctx.s);
      if (flame) { gasExplosion(ctx); return true; }
    }
    return false;
  },
  'BAT-ROOM': (ctx, phase) => {
    const { s, out } = ctx;
    if (phase === 'enter' && !inPlayer(s, 'GARLIC')) {
      out.tell('A large vampire bat, hanging from the ceiling, swoops down at you!\n\nFweep!\nFweep!\nFweep!\n\nThe bat grabs you by the scruff of your neck and lifts you away....');
      out.emit({ type: 'sfx', name: 'bat-screech' });
      const drop = pickOne(ctx, ['MINE-1', 'MINE-2', 'MINE-3', 'MINE-4', 'GAS-ROOM', 'COAL-MINE-DEAD-END']);
      ctx.moveTo(drop === 'COAL-MINE-DEAD-END' ? 'DEAD-END-5' : drop, true);
      out.emit({ type: 'panel', key: 'events/bat-abduction' });
      return true;
    }
    if (phase === 'enter' && inPlayer(s, 'GARLIC')) {
      out.tell('In the corner of the room on the ceiling is a large vampire bat who is obviously deranged and holding his nose.');
    }
    return false;
  },
  'LOUD-ROOM': (ctx, phase) => {
    const { s, out } = ctx;
    if (phase === 'enter' && !s.gflags['ECHO-FLAG'] && !s.gflags['LOW-TIDE']) {
      // echo effect handled on commands via engine
    }
    return false;
  },
  'TREASURE-ROOM': (ctx, phase) => {
    const { s, out } = ctx;
    if (phase === 'enter' && !s.gflags['THIEF-DEAD']) {
      moveObj(s, 'THIEF', 'TREASURE-ROOM');
      fclear(s, 'THIEF', 'INVISIBLE');
      fset(s, 'THIEF', 'FIGHTBIT'); // he rushes to its defense

      out.tell('You hear a scream of anguish as you violate the robber\'s hideaway. Using passages unknown to you, he rushes to its defense.');
      out.tell('The thief gestures mysteriously, and the treasures in the room suddenly vanish.');
      out.emit({ type: 'panel', key: 'characters/thief' });
      out.emit({ type: 'sfx', name: 'thief-snicker' });
    }
    return false;
  },
  'ARAGAIN-FALLS': () => false,
  'LOWER-SHAFT': (ctx, phase) => {
    const { s, out } = ctx;
    if (phase === 'enter' && roomLit(s) && !s.gflags['LIGHT-SHAFT-SCORED']) {
      s.gflags['LIGHT-SHAFT-SCORED'] = true;
      s.counters.score += 13;
      out.emit({ type: 'score', score: s.counters.score, moves: s.counters.moves });
    }
    return false;
  },
  'SLIDE-ROOM': () => false,
  'SHAFT-ROOM': () => false,
  'SMELLY-ROOM': (ctx, phase) => {
    if (phase === 'enter') ctx.out.tell('You smell a prodigious stench coming from below... it smells like coal gas down there.');
    return false;
  },
  'MAINTENANCE-ROOM': (ctx, phase) => {
    const { s } = ctx;
    if (phase === 'enter' && s.gflags['MAINT-FLOODED']) {
      ctx.out.tell('The room is full of water and cannot be entered.');
      return true;
    }
    return false;
  },
  'WEST-OF-HOUSE': (ctx, phase) => false,
  'SOUTH-TEMPLE': (ctx, phase) => false,
};

// ============================ SPECIAL EXITS ==================================
/** Handle `PER` routine exits. Return destination room, or null if handled with a message. */
export function specialExit(ctx: Ctx, per: string): string | null {
  const { s, out } = ctx;
  switch (per) {
    case 'TRAP-DOOR-EXIT':
      if (fset$(s, 'TRAP-DOOR', 'INVISIBLE')) { out.tell('You can\'t go that way.'); return null; }
      if (!fset$(s, 'TRAP-DOOR', 'OPENBIT')) { out.tell('The trap door is closed.'); return null; }
      return 'CELLAR';
    case 'GRATING-EXIT':
      if (s.gflags['GRUNLOCK'] && fset$(s, 'GRATE', 'OPENBIT')) return 'GRATING-ROOM';
      if (!s.gflags['GRATE-REVEALED']) { out.tell('You can\'t go that way.'); return null; }
      out.tell('The grating is closed!');
      return null;
    case 'UP-CHIMNEY-FUNCTION': {
      const inv = inventory(s);
      if (inv.length > 2) { out.tell('You can\'t get up there with what you\'re carrying.'); return null; }
      if (!inv.includes('LAMP') && inv.length > 0 && !roomLit(s, 'KITCHEN')) { /* allow */ }
      out.tell('You gingerly ascend the chimney, coated with soot.');
      if (!fset$(s, 'KITCHEN-WINDOW', 'OPENBIT')) fset(s, 'KITCHEN-WINDOW', 'OPENBIT');
      return 'KITCHEN';
    }
    case 'MAZE-DIODES':
      return 'MAZE-4';
    case 'CHIMNEY-D':
      return 'STUDIO';
    default:
      out.tell('You can\'t go that way.');
      return null;
  }
}

// exported dispatcher used by verbs.ts
export function objAction(ctx: Ctx, obj?: string): boolean {
  if (!obj) return false;
  const h = OBJ_ACTIONS[obj];
  return h ? h(ctx) : false;
}
export function roomAction(ctx: Ctx, room: string, phase: 'enter' | 'end'): boolean {
  const h = ROOM_ACTIONS[room];
  return h ? h(ctx, phase) : false;
}
