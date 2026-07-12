// Room -> panel art, region, and music bed mapping (per docs/region-design.md).

export type Region =
  | 'above' | 'house' | 'underground' | 'maze' | 'temple' | 'dam' | 'mine' | 'endgame';

export const REGION_MUSIC: Record<Region, string> = {
  above: 'above-ground', house: 'house', underground: 'underground', maze: 'maze',
  temple: 'temple', dam: 'dam-river', mine: 'coal-mine', endgame: 'victory',
};

interface RoomPres { art: string; region: Region }

const R = (art: string, region: Region): RoomPres => ({ art, region });

export const ROOM_PRES: Record<string, RoomPres> = {
  'WEST-OF-HOUSE': R('west-of-house', 'above'),
  'NORTH-OF-HOUSE': R('north-of-house', 'above'),
  'SOUTH-OF-HOUSE': R('south-of-house', 'above'),
  'EAST-OF-HOUSE': R('east-of-house', 'above'),
  'FOREST-1': R('forest', 'above'),
  'FOREST-2': R('forest', 'above'),
  'FOREST-3': R('forest-dark', 'above'),
  'MOUNTAINS': R('forest-dark', 'above'),
  'PATH': R('path', 'above'),
  'UP-A-TREE': R('up-a-tree', 'above'),
  'GRATING-CLEARING': R('grating-clearing', 'above'),
  'CLEARING': R('clearing', 'above'),
  'CANYON-VIEW': R('canyon-view', 'above'),
  'CLIFF-MIDDLE': R('canyon-middle', 'above'),
  'CANYON-BOTTOM': R('canyon-bottom', 'above'),
  'END-OF-RAINBOW': R('end-of-rainbow', 'above'),
  'ON-RAINBOW': R('on-rainbow', 'above'),
  'ARAGAIN-FALLS': R('aragain-falls', 'dam'),
  'STONE-BARROW': R('stone-barrow', 'endgame'),

  'KITCHEN': R('kitchen', 'house'),
  'ATTIC': R('attic', 'house'),
  'LIVING-ROOM': R('living-room', 'house'),
  'GALLERY': R('gallery', 'house'),
  'STUDIO': R('studio', 'house'),

  'CELLAR': R('cellar', 'underground'),
  'TROLL-ROOM': R('troll-room', 'underground'),
  'EAST-OF-CHASM': R('east-of-chasm', 'underground'),
  'CHASM-ROOM': R('chasm-room', 'underground'),
  'EW-PASSAGE': R('passage', 'underground'),
  'NS-PASSAGE': R('passage', 'underground'),
  'NARROW-PASSAGE': R('passage', 'temple'),
  'WINDING-PASSAGE': R('passage', 'temple'),
  'COLD-PASSAGE': R('passage-cold', 'mine'),
  'DAMP-CAVE': R('passage', 'temple'),
  'SMALL-CAVE': R('cave', 'temple'),
  'TINY-CAVE': R('cave', 'temple'),
  'SANDY-CAVE': R('cave', 'dam'),

  'MAZE-1': R('maze-a', 'maze'), 'MAZE-2': R('maze-b', 'maze'), 'MAZE-3': R('maze-c', 'maze'),
  'MAZE-4': R('maze-a', 'maze'), 'MAZE-5': R('maze-skeleton', 'maze'), 'MAZE-6': R('maze-b', 'maze'),
  'MAZE-7': R('maze-c', 'maze'), 'MAZE-8': R('maze-a', 'maze'), 'MAZE-9': R('maze-b', 'maze'),
  'MAZE-10': R('maze-c', 'maze'), 'MAZE-11': R('maze-a', 'maze'), 'MAZE-12': R('maze-b', 'maze'),
  'MAZE-13': R('maze-c', 'maze'), 'MAZE-14': R('maze-a', 'maze'), 'MAZE-15': R('maze-b', 'maze'),
  'DEAD-END-1': R('dead-end', 'maze'), 'DEAD-END-2': R('dead-end', 'maze'),
  'DEAD-END-3': R('dead-end', 'maze'), 'DEAD-END-4': R('dead-end', 'maze'),
  'GRATING-ROOM': R('grating-room', 'maze'),
  'CYCLOPS-ROOM': R('cyclops-room', 'maze'),
  'STRANGE-PASSAGE': R('passage', 'maze'),
  'TREASURE-ROOM': R('treasure-room', 'maze'),

  'ROUND-ROOM': R('round-room', 'temple'),
  'LOUD-ROOM': R('loud-room', 'temple'),
  'DEEP-CANYON': R('deep-canyon', 'temple'),
  'ENGRAVINGS-CAVE': R('engravings-cave', 'temple'),
  'DOME-ROOM': R('dome-room', 'temple'),
  'TORCH-ROOM': R('torch-room', 'temple'),
  'NORTH-TEMPLE': R('north-temple', 'temple'),
  'SOUTH-TEMPLE': R('south-temple-altar', 'temple'),
  'EGYPT-ROOM': R('egypt-room', 'temple'),
  'ENTRANCE-TO-HADES': R('entrance-to-hades', 'temple'),
  'LAND-OF-LIVING-DEAD': R('land-of-living-dead', 'temple'),
  'MIRROR-ROOM-1': R('mirror-room', 'temple'),
  'MIRROR-ROOM-2': R('mirror-room', 'mine'),

  'DAM-ROOM': R('dam-room', 'dam'),
  'DAM-LOBBY': R('dam-lobby', 'dam'),
  'MAINTENANCE-ROOM': R('maintenance-room', 'dam'),
  'DAM-BASE': R('dam-base', 'dam'),
  'RESERVOIR-SOUTH': R('reservoir', 'dam'),
  'RESERVOIR': R('reservoir', 'dam'),
  'RESERVOIR-NORTH': R('reservoir', 'dam'),
  'STREAM-VIEW': R('stream', 'dam'),
  'IN-STREAM': R('stream', 'dam'),
  'RIVER-1': R('river-upper', 'dam'), 'RIVER-2': R('river-upper', 'dam'), 'RIVER-3': R('river-upper', 'dam'),
  'RIVER-4': R('river-lower', 'dam'), 'RIVER-5': R('river-lower', 'dam'),
  'WHITE-CLIFFS-NORTH': R('white-cliffs', 'dam'),
  'WHITE-CLIFFS-SOUTH': R('white-cliffs', 'dam'),
  'SHORE': R('river-lower', 'dam'),
  'SANDY-BEACH': R('sandy-beach', 'dam'),

  'ATLANTIS-ROOM': R('atlantis-room', 'mine'),
  'MINE-ENTRANCE': R('mine-entrance', 'mine'),
  'SQUEEKY-ROOM': R('mine-passage', 'mine'),
  'BAT-ROOM': R('bat-room', 'mine'),
  'SHAFT-ROOM': R('shaft-room', 'mine'),
  'SMELLY-ROOM': R('mine-passage', 'mine'),
  'GAS-ROOM': R('gas-room', 'mine'),
  'MINE-1': R('coal-maze-a', 'mine'), 'MINE-2': R('coal-maze-b', 'mine'),
  'MINE-3': R('coal-maze-a', 'mine'), 'MINE-4': R('coal-maze-b', 'mine'),
  'LADDER-TOP': R('ladder', 'mine'), 'LADDER-BOTTOM': R('ladder', 'mine'),
  'DEAD-END-5': R('dead-end', 'mine'),
  'TIMBER-ROOM': R('timber-room', 'mine'),
  'LOWER-SHAFT': R('drafty-room', 'mine'),
  'MACHINE-ROOM': R('machine-room', 'mine'),
  'SLIDE-ROOM': R('slide-room', 'mine'),
};

/** Dynamic panel overrides based on world flags (room state variants). */
export function roomArtFor(room: string, gflags: Record<string, boolean>, oflags: (o: string, f: string) => boolean): string {
  if (room === 'LIVING-ROOM') {
    // case-full art shows the rug aside and the trap door closed, so it can
    // take over from trapdoor-closed once the case is full; an open trap door
    // still wins (the player is actively using it)
    if (oflags('TRAP-DOOR', 'OPENBIT')) return 'living-room-trapdoor-open';
    if (gflags['WON-FLAG']) return 'living-room-case-full';
    if (gflags['RUG-MOVED']) return 'living-room-trapdoor-closed';
  }
  if (room === 'TROLL-ROOM' && gflags['TROLL-DEAD']) return 'troll-room-empty';
  if ((room === 'RESERVOIR' || room === 'RESERVOIR-SOUTH' || room === 'RESERVOIR-NORTH') && gflags['LOW-TIDE']) return 'reservoir-drained';
  if (room === 'END-OF-RAINBOW' && gflags['RAINBOW-FLAG']) return 'rainbow-solid';
  if (room === 'ENTRANCE-TO-HADES' && gflags['LLD-FLAG']) return 'hades-banished';
  if (room === 'WEST-OF-HOUSE' && gflags['WON-FLAG']) return 'west-of-house-won';
  if (room === 'GRATING-CLEARING' && gflags['GRATE-REVEALED'] && oflags('GRATE', 'OPENBIT')) return 'grating-clearing-open';
  if (room === 'GRATING-ROOM' && gflags['GRUNLOCK'] && oflags('GRATE', 'OPENBIT')) return 'grating-room-open';
  if (room === 'CYCLOPS-ROOM' && gflags['MAGIC-FLAG']) return 'cyclops-room-hole';
  if (room === 'DAM-ROOM' && gflags['LOW-TIDE']) return 'dam-open';
  if (room === 'MAINTENANCE-ROOM' && gflags['MAINT-FLOODED']) return 'maintenance-flooding';
  return ROOM_PRES[room]?.art ?? 'passage';
}

// Panels that actually exist in public/art (fallback = keep current panel).
export const EVENT_PANELS = new Set([
  'events/mailbox-open', 'events/lamp-lit', 'events/grue-warning', 'events/grue-death',
  'events/troll-fight', 'events/thief-encounter', 'events/egg-opened', 'events/case-deposit',
  'events/exorcism', 'events/boat-launch', 'events/falls-death', 'events/flood-death',
  'events/bat-abduction', 'events/gas-explosion', 'events/resurrection', 'events/map-appears',
  'events/victory-barrow', 'events/thief-steals', 'events/window-entry', 'events/treasure-gleam',
  'events/door-slam', 'events/echo', 'events/dam-button', 'events/machine-diamond',
  'events/slide-ride', 'events/cyclops-odysseus', 'events/prayer-teleport', 'events/xyzzy',
  'events/sword-glow',
  'events/cyclops-sleeps', 'events/ghost-curse', 'events/mirror-warp', 'events/lamp-smashed',
  'events/villain-vanish', 'events/canary-song', 'events/thief-gift',
  'characters/troll', 'characters/thief', 'characters/cyclops', 'characters/bat',
  'rooms/living-room-trapdoor-open', 'rooms/living-room-trapdoor-closed', 'rooms/living-room-case-full',
  'rooms/grating-clearing', 'rooms/grating-clearing-open', 'rooms/grating-room-open',
  'rooms/dam-room', 'rooms/dam-open', 'rooms/cyclops-room', 'rooms/cyclops-room-hole',
  'rooms/troll-room', 'rooms/troll-room-empty', 'rooms/rainbow-solid', 'rooms/reservoir-drained',
  'rooms/hades-banished', 'rooms/maintenance-flooding', 'rooms/west-of-house-won',
]);

// Reserved for any future Tier-2 assets that still fall back to related art.
export const PANEL_FALLBACK: Record<string, string> = {};

export const ITEM_ART: Record<string, string> = {
  LAMP: 'brass-lantern', SWORD: 'elvish-sword', EGG: 'jeweled-egg', CANARY: 'clockwork-canary',
  PAINTING: 'painting', TORCH: 'ivory-torch', COFFIN: 'gold-coffin', SCEPTRE: 'sceptre',
  SKULL: 'crystal-skull', CHALICE: 'silver-chalice', DIAMOND: 'diamond', TRIDENT: 'crystal-trident',
  BELL: 'bell-book-candles', BOOK: 'bell-book-candles', CANDLES: 'bell-book-candles',
  MAP: 'ancient-map', GARLIC: 'garlic-and-sack', 'SANDWICH-BAG': 'garlic-and-sack',
  TRUNK: 'trunk-of-jewels', BAR: 'platinum-bar', EMERALD: 'emerald-buoy', SCARAB: 'scarab',
  'POT-OF-GOLD': 'pot-of-gold', JADE: 'jade-figurine', 'BAG-OF-COINS': 'bag-of-coins',
  'INFLATABLE-BOAT': 'magic-boat', 'INFLATED-BOAT': 'magic-boat',
};
