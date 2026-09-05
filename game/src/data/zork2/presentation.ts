// Zork II: room -> panel art, region, and music bed mapping.
// Generated from docs/trilogy-region-design.md and the panel catalogue in
// docs/trilogy-asset-plan.md, then hand-checked. Every one of Zork II's 86
// rooms is mapped.
import type { PresentationDef } from '../presentation';

export type Region =
  | 'barrow' | 'carousel' | 'garden' | 'dragon' | 'volcano'
  | 'bank' | 'wonderland' | 'tomb' | 'wizard' | 'palantir';

export const REGION_MUSIC: Record<Region, string> = {
  barrow: 'z2-barrow', carousel: 'z2-carousel', garden: 'z2-garden',
  dragon: 'z2-dragon', volcano: 'z2-volcano', bank: 'z2-bank',
  wonderland: 'z2-wonderland', tomb: 'z2-wizard', wizard: 'z2-wizard',
  palantir: 'z2-carousel',
};

interface RoomPres { art: string; region: Region }
const R = (art: string, region: Region): RoomPres => ({ art, region });

export const ROOM_PRES: Record<string, RoomPres> = {
  'AQUARIUM-ROOM': R('z2-aquarium-room', 'wizard'),
  'BANK-ENTRANCE': R('z2-bank-entrance', 'bank'),
  'CAGE-ROOM': R('z2-machine-room', 'wonderland'),
  'CAROUSEL-ROOM': R('z2-carousel-room', 'carousel'),
  'CERBERUS-ROOM': R('z2-cerberus-room', 'tomb'),
  'COBWEBBY-CORRIDOR': R('z2-stairway', 'carousel'),
  'COOL-ROOM': R('z2-cool-room', 'carousel'),
  'CRYPT-ANTEROOM': R('z2-crypt-anteroom', 'tomb'),
  'CRYPT-ROOM': R('z2-crypt', 'tomb'),
  'DARK-TUNNEL': R('z2-cavern-stream', 'barrow'),
  'DEAD-PALANTIR-1': R('z2-mist-room', 'palantir'),
  'DEAD-PALANTIR-2': R('z2-mist-room', 'palantir'),
  'DEAD-PALANTIR-3': R('z2-mist-room', 'palantir'),
  'DEAD-PALANTIR-4': R('z2-mist-room', 'palantir'),
  'DEEP-FORD': R('z2-deep-ford', 'barrow'),
  'DEPOSITORY': R('z2-depository', 'bank'),
  'DIAMOND-1': R('z2-oddly-angled-room', 'tomb'),
  'DIAMOND-2': R('z2-oddly-angled-room', 'tomb'),
  'DIAMOND-3': R('z2-oddly-angled-room', 'tomb'),
  'DIAMOND-4': R('z2-oddly-angled-room', 'tomb'),
  'DIAMOND-5': R('z2-oddly-angled-room', 'tomb'),
  'DIAMOND-6': R('z2-oddly-angled-room', 'tomb'),
  'DIAMOND-7': R('z2-oddly-angled-room', 'tomb'),
  'DIAMOND-8': R('z2-oddly-angled-room', 'tomb'),
  'DIAMOND-9': R('z2-oddly-angled-room', 'tomb'),
  'DRAGON-LAIR': R('z2-dragon-lair', 'dragon'),
  'DRAGON-ROOM': R('z2-dragon-room', 'dragon'),
  'DREARY-ROOM': R('z2-dreary-room', 'wonderland'),
  'FOOT-BRIDGE': R('z2-foot-bridge', 'barrow'),
  'FORMAL-GARDEN': R('z2-formal-garden', 'garden'),
  'FRESCO-ROOM': R('z2-fresco-room', 'bank'),
  'GARDEN-NORTH': R('z2-garden-north', 'garden'),
  'GAZEBO-ROOM': R('z2-gazebo', 'garden'),
  'GLACIER-ROOM': R('z2-ice-room', 'dragon'),
  'GREAT-CAVERN': R('z2-great-cavern', 'barrow'),
  'GUARDIAN-ROOM': R('z2-guarded-room', 'wizard'),
  'IN-AQUARIUM': R('z2-murky-room', 'wizard'),
  'IN-CAGE': R('z2-in-cage', 'wonderland'),
  'INSIDE-BARROW': R('z2-inside-barrow', 'barrow'),
  'KENNEL': R('z2-kennel', 'carousel'),
  'LAVA-ROOM': R('z2-lava-room', 'dragon'),
  'LAVA-TUBE': R('z2-lava-tube', 'dragon'),
  'LEDGE-1': R('z2-narrow-ledge', 'volcano'),
  'LEDGE-2': R('z2-wide-ledge', 'volcano'),
  'LEDGE-TUNNEL': R('z2-ledge-tunnel', 'barrow'),
  'LIBRARY': R('z2-library', 'volcano'),
  'MACHINE-ROOM': R('z2-machine-room', 'wonderland'),
  'MAGNET-ROOM': R('z2-low-room', 'wonderland'),
  'MARBLE-HALL': R('z2-marble-hall', 'barrow'),
  'MENHIR-ROOM': R('z2-menhir-room', 'carousel'),
  'NARROW-TUNNEL': R('z2-narrow-tunnel', 'barrow'),
  'OFFICE': R('z2-chairmans-office', 'bank'),
  'PEARL-ROOM': R('z2-pearl-room', 'carousel'),
  'PENTAGRAM-ROOM': R('z2-pentagram-room', 'wizard'),
  'POOL-ROOM': R('z2-pool-room', 'wonderland'),
  'POSTS-ROOM': R('z2-posts-room', 'wonderland'),
  'RAVINE-LEDGE': R('z2-ravine-ledge', 'barrow'),
  'RIDDLE-ROOM': R('z2-riddle-room', 'carousel'),
  'ROOM-8': R('z2-room-8', 'carousel'),
  'SAFE-ROOM': R('z2-dusty-room', 'volcano'),
  'SHALLOW-FORD': R('z2-cavern-stream', 'barrow'),
  'SMALL-ROOM': R('z2-small-room', 'bank'),
  'STAIRWAY-TOP': R('z2-stairway', 'carousel'),
  'STONE-BRIDGE': R('z2-stone-bridge', 'dragon'),
  'STREAM-PATH': R('z2-cavern-stream', 'barrow'),
  'TEA-ROOM': R('z2-tea-room', 'wonderland'),
  'TELLER-EAST': R('z2-tellers-room', 'bank'),
  'TELLER-WEST': R('z2-tellers-room', 'bank'),
  'TINY-ROOM': R('z2-tiny-room', 'wonderland'),
  'TOPIARY-ROOM': R('z2-topiary', 'garden'),
  'TROPHY-ROOM': R('z2-trophy-room', 'wizard'),
  'VAIR-1': R('z2-balloon-flight', 'volcano'),
  'VAIR-2': R('z2-balloon-flight', 'volcano'),
  'VAIR-3': R('z2-balloon-flight', 'volcano'),
  'VAIR-4': R('z2-balloon-flight', 'volcano'),
  'VAULT': R('z2-vault', 'bank'),
  'VIEWING-EAST': R('z2-viewing-room', 'bank'),
  'VIEWING-WEST': R('z2-viewing-room', 'bank'),
  'VOLCANO-BOTTOM': R('z2-volcano-bottom', 'volcano'),
  'VOLCANO-VIEW': R('z2-volcano-view', 'volcano'),
  'WELL-BOTTOM': R('z2-well-bottom', 'carousel'),
  'WELL-TOP': R('z2-top-of-well', 'wonderland'),
  'WIZARDS-QUARTERS': R('z2-wizards-quarters', 'wizard'),
  'WIZARDS-WORKSHOP': R('z2-wizards-workshop', 'wizard'),
  'WORKBENCH-ROOM': R('z2-wizards-workroom', 'wizard'),
  'ZORK3': R('z2-landing', 'tomb'),
};

/** Flag-gated state variants (docs/trilogy-asset-plan.md §4). */
export function roomArtFor(
  room: string,
  gflags: Record<string, boolean>,
  oflags: (o: string, f: string) => boolean,
): string {
  if (room === 'GLACIER-ROOM' && gflags['ICE-MELTED']) return 'z2-ice-room-melted';
  if (room === 'SAFE-ROOM' && gflags['SAFE-FLAG']) return 'z2-dusty-room-blown';
  if (room === 'MENHIR-ROOM') {
    const p = gflags['MENHIR-MOVED'] ? 'moved' : gflags['MENHIR-TILTED'] ? 'tilted' : null;
    if (p) return `z2-menhir-room-${p}`;
  }
  if (room === 'CAROUSEL-ROOM' && gflags['CAROUSEL-FLIP-FLAG']) return 'z2-carousel-room-stopped';
  if (room === 'AQUARIUM-ROOM' && gflags['AQ-FLAG']) return 'z2-aquarium-room-broken';
  if (room === 'POOL-ROOM') {
    if (gflags['MUD-FLAG']) return 'z2-pool-room-muddy';
    if (gflags['EVAPORATED']) return 'z2-pool-room-drained';
  }
  if (room === 'MACHINE-ROOM' && gflags['CAGE-SOLVE-FLAG']) return 'z2-machine-room-cage-open';
  if (room === 'MAGNET-ROOM' && gflags['CAROUSEL-FLIP-FLAG']) return 'z2-low-room-quiet';
  if (room === 'TOPIARY-ROOM' && gflags['TOPIARY-MOVED']) return 'z2-topiary-moved';
  if (room === 'DRAGON-LAIR') {
    if (gflags['PRINCESS-IN-LAIR']) return 'z2-dragon-lair-princess';
    if (gflags['DRAGON-GONE']) return 'z2-dragon-lair-empty';
  }
  if (room === 'CERBERUS-ROOM') {
    if (gflags['GUARDIAN-FED']) return 'z2-cerberus-room-calm';
    if (gflags['CERBERUS-LEASHED']) return 'z2-cerberus-room-collared';
  }
  if (room === 'GUARDIAN-ROOM') {
    const open = oflags('WIZ-DOOR', 'OPENBIT');
    if (gflags['GUARDIAN-FED']) return open ? 'z2-guarded-room-sleepy-open' : 'z2-guarded-room-sleepy';
    if (open) return 'z2-guarded-room-alert-open';
    if (gflags['LIZARD-SNIFFING']) return 'z2-guarded-room-sniffing';
  }
  if (room === 'CRYPT-ROOM') {
    if (!gflags['CRYPT-LIT']) return 'z2-crypt-dark';
    if (!oflags('DIM-DOOR', 'INVISIBLE')) return 'z2-crypt-dim-door';
    if (oflags('CRYPT-DOOR', 'OPENBIT')) return 'z2-crypt-door-open';
  }
  if (room === 'DREARY-ROOM') {
    if (gflags['PLOOK-FLAG']) return 'z2-dreary-room-lid-lifted';
    if (gflags['PUNLOCK-FLAG']) return 'z2-dreary-room-unlocked';
  }
  if (room === 'FORMAL-GARDEN') {
    if (gflags['UNICORN-FRIGHTENED']) return 'z2-formal-garden-unicorn-fled';
    if (gflags['UNICORN-HERE']) return 'z2-formal-garden-unicorn';
  }
  if (room === 'GAZEBO-ROOM' && gflags['PRINCESS-AWAKE']) return 'z2-gazebo-princess-awake';
  if (room === 'WIZARDS-WORKSHOP' && gflags['WIZARD-HERE']) return 'z2-wizards-workshop-wizard';
  if (room === 'DEPOSITORY' && gflags['SCOL-ACTIVE']) {
    const wall = gflags['SCOL-NORTH'] ? 'north' : gflags['SCOL-EAST'] ? 'east'
      : gflags['SCOL-SOUTH'] ? 'south' : 'west';
    return `z2-depository-curtain-${wall}`;
  }
  if (room.startsWith('DIAMOND-')) {
    const n = Number(gflags['DIAMOND-COUNT-3'] ? 3 : gflags['DIAMOND-COUNT-2'] ? 2 : gflags['DIAMOND-COUNT-1'] ? 1 : 0);
    if (gflags['DIAMOND-SOLVE']) return 'z2-oddly-angled-room-home';
    if (n) return `z2-oddly-angled-room-${n}`;
  }
  return ROOM_PRES[room]?.art ?? 'z2-cavern-stream';
}

/** Object id -> item plate, for the EXAMINE inset. */
export const ITEM_ART: Record<string, string> = {
  'BALLOON': 'balloon',
  'BRICK': 'brick',
  'CANDY': 'candy',
  'COLLAR': 'collar',
  'CROWN': 'crown',
  'EAT-ME-CAKE': 'cake-eatme',
  'FLASK': 'flask',
  'KEY': 'key',
  'LAMP': 'lantern',
  'LETTER-OPENER': 'letter-opener',
  'MATCH': 'match',
  'PALANTIR-1': 'palantir',
  'PALANTIR-2': 'palantir',
  'PALANTIR-3': 'palantir',
  'PEARL': 'pearls',
  'PORTRAIT': 'portrait',
  'PURPLE-BOOK': 'purple-book',
  'ROBOT': 'robot',
  'RUBY': 'ruby',
  'VIOLIN': 'violin',
  'WAND': 'wand',
  'ZORKMID': 'zorkmid',
};

/** Panels that exist on disk; anything else falls back to the room panel. */
export const EVENT_PANELS = new Set([
  'events/z2-ev-balloon-launch',
  'events/z2-ev-cake-shrink',
  'events/z2-ev-death-bucket',
  'events/z2-ev-death-curtain',
  'events/z2-ev-death-dragon',
  'events/z2-ev-death-generic',
  'events/z2-ev-death-menhir',
  'events/z2-ev-death-volcano',
  'events/z2-ev-demon-summoned',
  'events/z2-ev-glacier-melts',
  'events/z2-ev-guardians-pass',
  'events/z2-ev-palantir-vision',
  'events/z2-ev-princess-wakes',
  'events/z2-ev-robot-lifts-cage',
  'events/z2-ev-safe-blown',
  'events/z2-ev-unicorn-collared',
  'events/z2-ev-victory-landing',
  'events/z2-ev-wand-taken',
  'events/z2-ev-wizard-appears',
  'events/z2-ev-wizard-casts',
  'events/z2-ev-wizard-fumbles',
  'events/z2-ev-wizard-vanishes',
  'characters/z2-char-cerberus',
  'characters/z2-char-chomper',
  'characters/z2-char-demon',
  'characters/z2-char-dragon',
  'characters/z2-char-genie',
  'characters/z2-char-gnome-volcano',
  'characters/z2-char-gnome-zurich',
  'characters/z2-char-guardians',
  'characters/z2-char-lizard-head',
  'characters/z2-char-princess',
  'characters/z2-char-robot',
  'characters/z2-char-serpent',
  'characters/z2-char-unicorn',
  'characters/z2-char-wizard',
  'rooms/z2-aquarium-room',
  'rooms/z2-aquarium-room-broken',
  'rooms/z2-balloon-flight',
  'rooms/z2-bank-entrance',
  'rooms/z2-carousel-room',
  'rooms/z2-carousel-room-stopped',
  'rooms/z2-cavern-stream',
  'rooms/z2-cerberus-room',
  'rooms/z2-cerberus-room-calm',
  'rooms/z2-cerberus-room-collared',
  'rooms/z2-chairmans-office',
  'rooms/z2-cool-room',
  'rooms/z2-crypt',
  'rooms/z2-crypt-anteroom',
  'rooms/z2-crypt-dark',
  'rooms/z2-crypt-dim-door',
  'rooms/z2-crypt-door-open',
  'rooms/z2-deep-ford',
  'rooms/z2-depository',
  'rooms/z2-depository-curtain-east',
  'rooms/z2-depository-curtain-north',
  'rooms/z2-depository-curtain-south',
  'rooms/z2-depository-curtain-west',
  'rooms/z2-dragon-lair',
  'rooms/z2-dragon-lair-empty',
  'rooms/z2-dragon-lair-princess',
  'rooms/z2-dragon-room',
  'rooms/z2-dreary-room',
  'rooms/z2-dreary-room-lid-lifted',
  'rooms/z2-dreary-room-unlocked',
  'rooms/z2-dusty-room',
  'rooms/z2-dusty-room-blown',
  'rooms/z2-foot-bridge',
  'rooms/z2-formal-garden',
  'rooms/z2-formal-garden-unicorn',
  'rooms/z2-formal-garden-unicorn-fled',
  'rooms/z2-fresco-room',
  'rooms/z2-garden-north',
  'rooms/z2-gazebo',
  'rooms/z2-gazebo-princess-awake',
  'rooms/z2-great-cavern',
  'rooms/z2-guarded-room',
  'rooms/z2-guarded-room-alert-open',
  'rooms/z2-guarded-room-sleepy',
  'rooms/z2-guarded-room-sleepy-open',
  'rooms/z2-guarded-room-sniffing',
  'rooms/z2-ice-room',
  'rooms/z2-ice-room-melted',
  'rooms/z2-in-cage',
  'rooms/z2-inside-barrow',
  'rooms/z2-kennel',
  'rooms/z2-landing',
  'rooms/z2-lava-room',
  'rooms/z2-lava-tube',
  'rooms/z2-ledge-tunnel',
  'rooms/z2-library',
  'rooms/z2-low-room',
  'rooms/z2-low-room-quiet',
  'rooms/z2-machine-room',
  'rooms/z2-machine-room-cage-open',
  'rooms/z2-marble-hall',
  'rooms/z2-menhir-room',
  'rooms/z2-menhir-room-moved',
  'rooms/z2-menhir-room-tilted',
  'rooms/z2-mist-room',
  'rooms/z2-murky-room',
  'rooms/z2-narrow-ledge',
  'rooms/z2-narrow-tunnel',
  'rooms/z2-oddly-angled-room',
  'rooms/z2-oddly-angled-room-1',
  'rooms/z2-oddly-angled-room-2',
  'rooms/z2-oddly-angled-room-3',
  'rooms/z2-oddly-angled-room-home',
  'rooms/z2-pearl-room',
  'rooms/z2-pentagram-room',
  'rooms/z2-pool-room',
  'rooms/z2-pool-room-drained',
  'rooms/z2-pool-room-muddy',
  'rooms/z2-posts-room',
  'rooms/z2-ravine-ledge',
  'rooms/z2-riddle-room',
  'rooms/z2-room-8',
  'rooms/z2-small-room',
  'rooms/z2-stairway',
  'rooms/z2-stone-bridge',
  'rooms/z2-tea-room',
  'rooms/z2-tellers-room',
  'rooms/z2-tiny-room',
  'rooms/z2-top-of-well',
  'rooms/z2-topiary',
  'rooms/z2-topiary-moved',
  'rooms/z2-trophy-room',
  'rooms/z2-vault',
  'rooms/z2-viewing-room',
  'rooms/z2-volcano-bottom',
  'rooms/z2-volcano-view',
  'rooms/z2-well-bottom',
  'rooms/z2-wide-ledge',
  'rooms/z2-wizards-quarters',
  'rooms/z2-wizards-quarters-b',
  'rooms/z2-wizards-quarters-c',
  'rooms/z2-wizards-quarters-d',
  'rooms/z2-wizards-workroom',
  'rooms/z2-wizards-workshop',
  'rooms/z2-wizards-workshop-wizard',
]);

export const PANEL_FALLBACK: Record<string, string> = {};

export const ZORK2_PRESENTATION: PresentationDef = {
  regionMusic: REGION_MUSIC,
  roomPres: ROOM_PRES,
  roomArtFor,
  eventPanels: EVENT_PANELS,
  panelFallback: PANEL_FALLBACK,
  itemArt: ITEM_ART,
  defaultArt: 'z2-cavern-stream',
  defaultRegion: 'barrow',
};
