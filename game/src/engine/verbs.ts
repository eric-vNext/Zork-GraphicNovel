// Default verb handlers and movement (ports gverbs.zil), with the ZIL dispatch
// order: room action -> object specials -> default handler.
import type { Ctx } from './ctx';
import { pickOne, YUKS, HO_HUM } from './ctx';
import { jigsUp } from './death';
import { objAction, roomAction, specialExit } from './specials';
import { describeRoom, listInventory, containerListing, cap } from './describe';
import { dynamicRoomDesc } from './specialDescs';
import { ITEM_ART } from '../data/presentation';
import {
  DATA, roomDef, objDef, fset, fclear, fset$, moveObj, removeObj, contents,
  inPlayer, roomOf, roomLit, reachable, loadWeight, objWeight, theName, aName,
  PLAYER, inventory,
} from './world';

const TREASURE_ROOM_SAFE = 'TREASURE-ROOM';

export function goTo(ctx: Ctx, dir: string): void {
  const { s, out } = ctx;
  // the final threshold: west/in from the barrow forecourt ends the game
  if (s.here === 'STONE-BARROW' && (dir === 'WEST' || dir === 'IN')) {
    ctx.winGame();
    return;
  }
  if (s.here === 'SLIDE-ROOM' && dir === 'DOWN') {
    out.emit({ type: 'panel', key: 'events/slide-ride' });
    out.emit({ type: 'sfx', name: 'slide-whoosh' });
  }
  const r = roomDef(s.here);
  let ex = r.exits[dir];
  // boat constraints
  if (s.gflags['IN-BOAT']) {
    if (dir === 'LAND' || (ex && ex.to && !String(s.here).startsWith('RIVER') && !['RESERVOIR', 'IN-STREAM'].includes(s.here))) {
      // allow landing via LAND exits; other movement from shore rooms while in boat:
    }
    if (!['RIVER-1', 'RIVER-2', 'RIVER-3', 'RIVER-4', 'RIVER-5', 'RESERVOIR', 'IN-STREAM'].includes(s.here)) {
      if (dir !== 'LAND') { out.tell('You will have to get out of the boat first (or say "launch").'); return; }
    }
  }
  if (!ex) {
    if (dir === 'LAND' && s.gflags['IN-BOAT']) { out.tell('There\'s no place to land here.'); return; }
    const CANT = ['You can\'t go that way.', 'There is no way to go in that direction.'];
    // helpful specifics from the original
    if ((dir === 'UP' || dir === 'DOWN') && r.flags.includes('RLANDBIT')) out.tell('You can\'t go that way.');
    else out.tell(pickOne(ctx, CANT));
    return;
  }
  if (ex.msg && !ex.to && !ex.per) { out.tell(ex.msg.replace(/\n/g, ' ')); return; }
  if (ex.per) {
    const dest = specialExit(ctx, ex.per);
    if (dest) enterRoom(ctx, dest);
    return;
  }
  if (ex.ifFlag) {
    // computed pseudo-flags from the source
    const val =
      ex.ifFlag === 'EMPTY-HANDED' ? inventory(s).length === 0 :
      ex.ifFlag === 'COFFIN-CURE' ? !inPlayer(s, 'COFFIN') :
      !!s.gflags[ex.ifFlag];
    if (!val) {
      if (ex.elseMsg) out.tell(ex.elseMsg.replace(/\n/g, ' '));
      else out.tell('You can\'t go that way.');
      return;
    }
  }
  if (ex.ifDoor && !fset$(s, ex.ifDoor, 'OPENBIT')) {
    out.tell(ex.elseMsg?.replace(/\n/g, ' ') ?? `The ${objDef(ex.ifDoor)?.desc ?? 'door'} is closed.`);
    return;
  }
  // reservoir crossing depends on tide
  if ((s.here === 'RESERVOIR-SOUTH' && dir === 'NORTH') || (s.here === 'RESERVOIR-NORTH' && dir === 'SOUTH')) {
    if (!s.gflags['LOW-TIDE'] && !s.gflags['IN-BOAT']) { out.tell('You would drown.'); return; }
  }
  const throughWindowToKitchen = ex.ifDoor === 'KITCHEN-WINDOW' && ex.to === 'KITCHEN';
  enterRoom(ctx, ex.to!);
  if (throughWindowToKitchen) out.emit({ type: 'panel', key: 'events/window-entry' });
}

export function enterRoom(ctx: Ctx, room: string): void {
  const { s, out } = ctx;
  const wasLit = roomLit(s);
  const fromRoom = s.here;
  s.here = room;
  // grue check when stepping from dark to dark
  if (!wasLit && !roomLit(s)) {
    s.grueTurns += 1;
    if (s.grueTurns >= 2 && ctx.rng() < 0.5) {
      out.emit({ type: 'panel', key: 'events/grue-death' });
      jigsUp(ctx, 'Oh, no! You have walked into the slavering fangs of a lurking grue!', {});
      return;
    }
  } else {
    s.grueTurns = roomLit(s) ? 0 : s.grueTurns;
  }
  if (s.gflags['IN-BOAT'] && !['RIVER-1', 'RIVER-2', 'RIVER-3', 'RIVER-4', 'RIVER-5', 'RESERVOIR', 'IN-STREAM'].includes(room)) {
    // landing: step out of the boat automatically
    s.gflags['IN-BOAT'] = false;
    moveObj(s, 'INFLATED-BOAT', room);
    out.tell('The magic boat comes to a rest on the shore.');
    ctx.disable('I-RIVER');
  }
  if (roomAction(ctx, room, 'enter')) return;
  if (s.dead) return;
  // scoring for room entry
  const rd = roomDef(room);
  if (rd.value && !s.scoredRooms[room]) {
    s.scoredRooms[room] = true;
    s.counters.score += rd.value;
    out.emit({ type: 'score', score: s.counters.score, moves: s.counters.moves });
  }
  out.emit({ type: 'room', room });
  s.justArrived = true; // give the player one beat to see the room before combat can steal the panel
  if (!roomLit(s)) {
    out.emit({ type: 'panel', key: 'events/grue-warning' });
    out.emit({ type: 'sfx', name: 'grue-growl' });
    out.tell('It is pitch black. You are likely to be eaten by a grue.');
    s.touched[room] = true;
    return;
  }
  describeRoom(ctx.s, out, false);
  s.touched[room] = true;
}

// ----------------------------------------------------------------------------
export function perform(ctx: Ctx): void {
  const { s, out, verb } = ctx;
  const d = ctx.dobj;

  // darkness gates most object interaction
  const DARK_OK = new Set(['walk', 'look', 'inventory', 'take', 'drop', 'lamp-on', 'light', 'wait', 'again',
    'score', 'diagnose', 'save', 'restore', 'restart', 'quit', 'verbose', 'brief', 'superbrief', 'version', 'help', 'pray', 'echo', 'shout', 'curse']);
  if (!roomLit(s) && !DARK_OK.has(verb)) {
    out.tell('It\'s too dark to see!');
    return;
  }

  // object-special dispatch (indirect first, then direct), like ZIL
  if (ctx.iobj && objAction(ctx, ctx.iobj) === true && verb !== 'put') { /* handled */ return; }
  if (d && objAction(ctx, d)) return;

  switch (verb) {
    case 'walk': return; // handled earlier via goTo
    case 'look': describeRoom(s, out, true); return;
    case 'examine': {
      if (!d) { out.tell('Examine what?'); return; }
      if (ITEM_ART[d]) out.emit({ type: 'panel', key: `items/${ITEM_ART[d]}` });
      const od = objDef(d);
      if (od?.text) { out.tell(od.text.replace(/\n/g, ' ')); return; }
      if (fset$(s, d, 'CONTBIT') || fset$(s, d, 'DOORBIT')) {
        if (fset$(s, d, 'DOORBIT')) { out.tell(`The ${od.desc} is ${fset$(s, d, 'OPENBIT') ? 'open' : 'closed'}.`); return; }
        const listing = containerListing(s, d, 0);
        if (fset$(s, d, 'OPENBIT') || fset$(s, d, 'TRANSBIT')) {
          out.tell(listing ?? `The ${od.desc} is empty.`);
        } else out.tell(`The ${od.desc} is closed.`);
        return;
      }
      out.tell(`There's nothing special about the ${od?.desc ?? 'that'}.`);
      return;
    }
    case 'read': {
      if (!d) { out.tell('Read what?'); return; }
      const od = objDef(d);
      if (!fset$(s, d, 'READBIT') && !od?.text) { out.tell(`How does one read a ${od?.desc ?? 'thing'}?`); return; }
      out.tell(od.text ? od.text.replace(/\\n/g, '\n') : `There's nothing written on it.`);
      return;
    }
    case 'look-in': {
      if (!d) return;
      const listing = containerListing(s, d, 0);
      if (fset$(s, d, 'OPENBIT') || fset$(s, d, 'TRANSBIT')) out.tell(listing ?? `The ${objDef(d).desc} is empty.`);
      else out.tell(`The ${objDef(d).desc} is closed.`);
      return;
    }
    case 'look-under':
    case 'look-behind':
      out.tell('There is nothing but dust there.');
      return;
    case 'take': return doTake(ctx);
    case 'drop': return doDrop(ctx);
    case 'put': return doPut(ctx);
    case 'open': return doOpen(ctx);
    case 'close': return doClose(ctx);
    case 'inventory': listInventory(s, out); return;
    // 'wait' is handled entirely in Game.execute() (ports V-WAIT's OPTIONAL NUM,
    // looping CLOCKER up to N times) — never reaches here.
    case 'jump': out.tell(pickOne(ctx, ['Are you proud of yourself?', 'Wheeeeeeeeee!!!!!', 'Do you expect me to applaud?'])); return;
    case 'pray':
      if (s.here === 'SOUTH-TEMPLE') {
        out.tell('From the distance the sound of a lone trumpet is heard. The room becomes very bright and you feel disembodied. In a moment, the brightness fades and you find yourself rising as if from a long sleep, deep in the woods. In the distance you can faintly see a songbird and the beginnings of a path.');
        out.emit({ type: 'sfx', name: 'magic-shimmer' });
        ctx.moveTo('FOREST-1', true);
        out.emit({ type: 'panel', key: 'events/prayer-teleport' });
        return;
      }
      out.tell('If you pray enough, your prayers may be answered.');
      return;
    case 'xyzzy':
    case 'plugh':
      out.tell('A hollow voice says "Fool."');
      out.emit({ type: 'sfx', name: 'hollow-voice' });
      out.emit({ type: 'panel', key: 'events/xyzzy' });
      return;
    case 'zork': out.tell('At your service!'); return;
    case 'echo':
      if (s.here === 'LOUD-ROOM' && !s.gflags['ECHO-FLAG']) {
        s.gflags['ECHO-FLAG'] = true;
        fclear(s, 'BAR', 'SACREDBIT');
        out.tell('The acoustics of the room change subtly.');
        out.emit({ type: 'sfx', name: 'echo' });
        out.emit({ type: 'panel', key: 'events/echo' });
        return;
      }
      out.tell(s.here === 'LOUD-ROOM' ? 'echo echo ...' : 'There is no echo here.');
      return;
    case 'odysseus':
      if (s.here === 'CYCLOPS-ROOM' && !s.gflags['MAGIC-FLAG']) {
        s.gflags['MAGIC-FLAG'] = true;
        s.gflags['CYCLOPS-FLAG'] = true; // the stairs are no longer blocked
        removeObj(s, 'CYCLOPS');
        out.tell('The cyclops, hearing the name of his father\'s deadly nemesis, flees the room by knocking down the wall on the east of the room.');
        out.emit({ type: 'panel', key: 'events/cyclops-odysseus' });
        out.emit({ type: 'sfx', name: 'explosion' });
        return;
      }
      out.tell('Wasn\'t he a sailor?');
      return;
    case 'hello':
      if (d === 'THIEF') { out.tell('The thief nods a curt greeting.'); return; }
      out.tell(pickOne(ctx, ['Hello.', 'Good day.', 'Nice weather we\'ve been having lately.']));
      return;
    case 'attack': {
      if (!d) { out.tell('Attack what?'); return; }
      out.tell(`I've known strange people, but fighting ${aName(d).replace(/^an? /, 'a ')}?`);
      return;
    }
    case 'throw': {
      if (!d) return;
      if (!inPlayer(s, d)) { out.tell(`You don't have ${theName(d)}.`); return; }
      moveObj(s, d, s.here);
      out.tell('Thrown.');
      return;
    }
    case 'give': {
      if (!d || !ctx.iobj) { out.tell('Give what to whom?'); return; }
      out.tell(`You can't give ${theName(d)} to that.`);
      return;
    }
    case 'move':
    case 'push':
    case 'pull':
      if (!d) return;
      out.tell(`Moving the ${objDef(d)?.desc ?? 'that'}${pickOne(ctx, HO_HUM)}`);
      return;
    case 'climb':
    case 'climb-down': {
      if (d === 'TREE' && s.here === 'PATH') { enterRoom(ctx, 'UP-A-TREE'); return; }
      if (s.here === 'UP-A-TREE') { enterRoom(ctx, 'PATH'); return; }
      if (d && fset$(s, d, 'CLIMBBIT')) { goTo(ctx, verb === 'climb' ? 'UP' : 'DOWN'); return; }
      out.tell('You can\'t climb that.');
      return;
    }
    case 'enter': {
      if (d === 'WHITE-HOUSE') {
        if (['WEST-OF-HOUSE', 'NORTH-OF-HOUSE', 'SOUTH-OF-HOUSE'].includes(s.here)) { out.tell('The door is boarded and you can\'t remove the boards.'); return; }
        if (s.here === 'EAST-OF-HOUSE') { ctx.perform('enter', 'KITCHEN-WINDOW'); return; }
      }
      goTo(ctx, 'IN');
      return;
    }
    case 'exit': goTo(ctx, 'OUT'); return;
    case 'cross': {
      if (s.here === 'ARAGAIN-FALLS' || s.here === 'END-OF-RAINBOW') {
        if (!s.gflags['RAINBOW-FLAG']) { out.tell('You can walk on water vapor, can you?'); return; }
        goTo(ctx, s.here === 'ARAGAIN-FALLS' ? 'WEST' : 'EAST');
        return;
      }
      if (s.here === 'ON-RAINBOW') { goTo(ctx, 'WEST'); return; }
      out.tell('You can\'t cross that!');
      return;
    }
    case 'launch': {
      if (s.gflags['IN-BOAT']) {
        const sub = { ...ctx, dobj: 'INFLATED-BOAT' };
        if (objAction(sub as typeof ctx, 'INFLATED-BOAT')) return;
      }
      out.tell(s.gflags['IN-BOAT'] ? 'You can\'t launch it here.' : 'You have to be in the boat to launch it.');
      return;
    }
    case 'land': goTo(ctx, 'LAND'); return;
    case 'eat':
      if (!d) return;
      if (fset$(s, d, 'FOODBIT')) { removeObj(s, d); out.tell('Thank you very much. It really hit the spot.'); return; }
      out.tell(`I don't think that the ${objDef(d)?.desc ?? 'thing'} would agree with you.`);
      return;
    case 'drink':
      out.tell('You can\'t drink that!');
      return;
    case 'smell':
      if (s.here === 'GAS-ROOM' || s.here === 'SMELLY-ROOM') { out.tell('It smells like coal gas in here.'); return; }
      out.tell(`It smells like ${aName(d ?? 'GRUE').replace(/^an? /, 'a ')} to me.`);
      return;
    case 'listen':
      out.tell(s.here.startsWith('RIVER') ? 'The river rushes by.' : 'You hear nothing unusual.');
      return;
    case 'count':
      if (d === 'LEAVES') { out.tell('There are 69,105 leaves here.'); return; }
      out.tell('You have lost your mind.');
      return;
    case 'search': out.tell('You find nothing unusual.'); return;
    case 'kiss': out.tell('I\'d sooner kiss a grue.'); return;
    case 'burn': {
      if (!d) return;
      if (!hasFlameCarried(ctx)) { out.tell('You should light a match first.'); return; }
      if (fset$(s, d, 'BURNBIT')) {
        removeObj(s, d);
        out.tell(`The ${objDef(d).desc} catches fire and is consumed.`);
        return;
      }
      out.tell(`You can't burn ${theName(d)}.`);
      return;
    }
    case 'cut':
      out.tell(pickOne(ctx, YUKS));
      return;
    case 'break':
      if (!d) return;
      out.tell(pickOne(ctx, ['Nice try.', 'Not likely.', pickOne(ctx, YUKS)]));
      return;
    case 'shake':
      if (d && fset$(s, d, 'CONTBIT') && !fset$(s, d, 'OPENBIT')) { out.tell(`It sounds like there is something inside the ${objDef(d).desc}.`); return; }
      out.tell('Shaken.');
      return;
    case 'squeeze': out.tell('How singularly useless.'); return;
    case 'wear': out.tell('You can\'t wear that.'); return;
    case 'tie': out.tell(d ? `You can't tie the ${objDef(d)?.desc ?? 'that'} to anything.` : 'Tie what?'); return;
    case 'untie': out.tell('It is not tied to anything.'); return;
    case 'wave': out.tell(`Waving the ${objDef(d ?? '')?.desc ?? 'thing'}${pickOne(ctx, HO_HUM)}`); return;
    case 'wind': out.tell('You cannot wind that up.'); return;
    case 'ring': out.tell('How, exactly, does one ring that?'); return;
    case 'dig': out.tell(d === 'SAND' ? 'The ground is too hard for digging here.' : 'Digging here is quite pointless.'); return;
    case 'touch': out.tell('Fiddling with that isn\'t helpful.'); return;
    case 'fill': out.tell('There is nothing to fill it with here.'); return;
    case 'pour': out.tell('You can\'t pour that.'); return;
    case 'lock': out.tell('There is no lock on it.'); return;
    case 'unlock': out.tell('It doesn\'t seem to be locked.'); return;
    case 'inflate': out.tell('How can you inflate that?'); return;
    case 'deflate': out.tell('Come on, now!'); return;
    case 'lower':
    case 'raise':
      out.tell(`Playing in this way with the ${objDef(d ?? '')?.desc ?? 'thing'} has no effect.`);
      return;
    case 'lamp-on': out.tell(d ? `You can't turn that on.` : 'Turn on what?'); return;
    case 'lamp-off': out.tell(d ? `You can't turn that off.` : 'Turn off what?'); return;
    case 'light': out.tell(d ? `You can't light that.` : 'Light what?'); return;
    case 'extinguish': out.tell('That wasn\'t lit.'); return;
    case 'turn': out.tell('You can\'t turn that.'); return;
    case 'knock': out.tell(d === 'FRONT-DOOR' || d === 'WHITE-HOUSE' ? 'Nobody\'s home.' : 'Why knock on that?'); return;
    case 'swim': out.tell('Swimming isn\'t usually allowed in the dungeon.'); return;
    case 'sleep': out.tell('There\'s nothing to sleep on, and besides, adventurers don\'t sleep.'); return;
    case 'curse': out.tell('Such language in a high-class establishment like this!'); return;
    case 'shout': out.tell('Yaaaaarrrrggghhh!'); return;
    case 'yes': out.tell('You sound rather positive.'); return;
    case 'no': out.tell('You sound rather negative.'); return;
    case 'follow': out.tell('You\'re nuts!'); return;
    case 'say': out.tell('Talking to yourself is a sign of impending mental collapse.'); return;
    default:
      out.tell(pickOne(ctx, YUKS));
  }
}

function hasFlameCarried(ctx: Ctx): boolean {
  return inventory(ctx.s).some((o) => fset$(ctx.s, o, 'FLAMEBIT') && fset$(ctx.s, o, 'ONBIT'));
}

// ---------------- take/drop/put/open/close ----------------
function doTake(ctx: Ctx): void {
  const { s, out } = ctx;
  const d = ctx.dobj!;
  if (!d) { out.tell('Take what?'); return; }
  if (s.locs[d] === PLAYER) { out.tell('You already have that!'); return; }
  // nested in something you carry: lift it out
  const od = objDef(d);
  if (!od) { out.tell('You can\'t take that.'); return; }
  if (fset$(s, d, 'SACREDBIT') && s.here === 'LOUD-ROOM' && !s.gflags['ECHO-FLAG'] && d === 'BAR') {
    echoRoomFail(ctx); return;
  }
  if (!fset$(s, d, 'TAKEBIT') && !fset$(s, d, 'TRYTAKEBIT')) {
    out.tell(pickOne(ctx, ['What a concept!', 'You can\'t be serious.', 'An interesting idea...']));
    return;
  }
  if (!reachable(s, d)) { out.tell(`You can't reach ${theName(d)}.`); return; }
  if (loadWeight(s) + objWeight(s, d) > 100) {
    out.tell('Your load is too heavy' + (loadWeight(s) > 85 ? '.' : ', especially in light of your condition.'));
    return;
  }
  moveObj(s, d, PLAYER);
  s.fdescGone[d] = true;
  s.itRef = d;
  // scoring on first take
  if ((od.value ?? 0) > 0 && !s.scoredTakes[d]) {
    s.scoredTakes[d] = true;
    s.counters.score += od.value!;
    out.emit({ type: 'score', score: s.counters.score, moves: s.counters.moves });
    out.emit({ type: 'sfx', name: 'treasure-chime' });
    out.emit({ type: 'panel', key: 'events/treasure-gleam' });
  } else {
    out.emit({ type: 'sfx', name: 'take' });
  }
  out.tell('Taken.');
}

function echoRoomFail(ctx: Ctx): void {
  ctx.out.tell('The bar vibrates greatly when you touch it, and the resultant echoing is deafening... bar ... bar ...');
}

function doDrop(ctx: Ctx): void {
  const { s, out } = ctx;
  const d = ctx.dobj!;
  if (!inPlayer(s, d)) { out.tell(`You don't have ${theName(d)}.`); return; }
  moveObj(s, d, s.here);
  out.tell('Dropped.');
  out.emit({ type: 'sfx', name: 'drop' });
}

function doPut(ctx: Ctx): void {
  const { s, out } = ctx;
  const d = ctx.dobj!;
  const i = ctx.iobj;
  if (!i) { out.tell(`Where do you want to put ${theName(d)}?`); return; }
  if (!inPlayer(s, d)) { out.tell(`You don't have ${theName(d)}.`); return; }
  if (!fset$(s, i, 'CONTBIT') && !fset$(s, i, 'SURFACEBIT')) { out.tell(`You can't put anything in the ${objDef(i)?.desc ?? 'that'}.`); return; }
  if (!fset$(s, i, 'OPENBIT') && !fset$(s, i, 'SURFACEBIT')) { out.tell(`The ${objDef(i).desc} isn't open.`); return; }
  const cap = objDef(i).capacity ?? 100;
  const used = contents(s, i).reduce((sum, o) => sum + objWeight(s, o), 0);
  if (used + objWeight(s, d) > cap) { out.tell(`There's no room.`); return; }
  moveObj(s, d, i);
  out.tell('Done.');
  // trophy case scoring (OTVAL-FROB counts nested contents too)
  if (i === 'TROPHY-CASE') {
    const scoreTree = (obj: string): number => {
      let pts = 0;
      const od2 = objDef(obj);
      if ((od2?.tvalue ?? 0) > 0 && !s.scoredCase[obj]) {
        s.scoredCase[obj] = true;
        pts += od2.tvalue!;
      }
      for (const c of contents(s, obj)) pts += scoreTree(c);
      return pts;
    };
    const gained = scoreTree(d);
    if (gained > 0) {
      s.counters.score += gained;
      out.emit({ type: 'score', score: s.counters.score, moves: s.counters.moves });
      out.emit({ type: 'sfx', name: 'case-fanfare' });
      out.emit({ type: 'panel', key: 'events/case-deposit' });
    }
    checkEndgame(ctx);
  }
}

export function checkEndgame(ctx: Ctx): void {
  const { s, out } = ctx;
  if (s.gflags['MAP-GIVEN']) return;
  // every treasure (or its damaged alternate) rests in the trophy case
  const inCaseTree = (id: string): boolean => {
    let p = s.locs[id];
    while (p) { if (p === 'TROPHY-CASE') return true; p = s.locs[p] ?? null; }
    return false;
  };
  const ALT: Record<string, string> = { EGG: 'BROKEN-EGG', CANARY: 'BROKEN-CANARY' };
  const need = Object.entries(DATA.objects)
    .filter(([id, o]) => (o.tvalue ?? 0) > 0 && !['BROKEN-EGG', 'BROKEN-CANARY'].includes(id))
    .map(([id]) => id);
  const inCase = need.every((id) => inCaseTree(id) || (ALT[id] && inCaseTree(ALT[id])));
  if (inCase) {
    s.gflags['MAP-GIVEN'] = true;
    s.gflags['WON-FLAG'] = true;
    moveObj(s, 'MAP', 'TROPHY-CASE');
    fclear(s, 'MAP', 'INVISIBLE');
    out.tell('An almost inaudible voice whispers in your ear, "Look to your treasures for the final secret."');
    out.tell('Suddenly, an ancient map appears in the trophy case!');
    out.emit({ type: 'panel', key: 'events/map-appears' });
    out.emit({ type: 'sfx', name: 'magic-shimmer' });
  }
}

function doOpen(ctx: Ctx): void {
  const { s, out } = ctx;
  const d = ctx.dobj!;
  if (!d) { out.tell('Open what?'); return; }
  if (!fset$(s, d, 'CONTBIT') && !fset$(s, d, 'DOORBIT')) { out.tell(`You must tell me how to do that to a ${objDef(d)?.desc ?? 'thing'}.`); return; }
  if (fset$(s, d, 'OPENBIT')) { out.tell(pickOne(ctx, ['Look around.', 'It is already open.'])); return; }
  if (fset$(s, d, 'LOCKEDBIT')) { out.tell('It seems to be locked.'); return; }
  fset(s, d, 'OPENBIT');
  const inner = contents(s, d).filter((o) => !fset$(s, o, 'INVISIBLE'));
  if (inner.length) {
    out.tell(`Opening the ${objDef(d).desc} reveals ${inner.map((o) => aName(o)).join(' and ')}.`);
  } else out.tell('Opened.');
}

function doClose(ctx: Ctx): void {
  const { s, out } = ctx;
  const d = ctx.dobj!;
  if (!fset$(s, d, 'CONTBIT') && !fset$(s, d, 'DOORBIT')) { out.tell(`You cannot close that.`); return; }
  if (!fset$(s, d, 'OPENBIT')) { out.tell('It is already closed.'); return; }
  fclear(s, d, 'OPENBIT');
  out.tell('Closed.');
}
