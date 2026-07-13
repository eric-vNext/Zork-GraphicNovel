// Presentation state (Zustand). The engine owns game truth; this mirrors
// what the UI needs: log lines, current panel, region, score, chips, screens.
import { create } from 'zustand';
import { Game } from '../engine/engine';
import type { GameEvent } from '../engine/types';
import { ROOM_PRES, roomArtFor, REGION_MUSIC, EVENT_PANELS, PANEL_FALLBACK, ITEM_ART } from '../data/presentation';
import { audio } from '../audio/audioManager';
import { fset$, inventory, DATA, roomLit, contents } from '../engine/world';
import { Out } from '../engine/world';
import type { WorldState } from '../engine/types';
import { readSaveSlot, writeSaveSlot, migrateLegacySave } from '../engine/idbSaves';

export interface LogLine { id: number; text: string; cls: string }
export type Screen = 'title' | 'play' | 'death' | 'victory';
export type SlotsMode = false | 'save' | 'load';

const ACTIVE_SLOT_KEY = 'zork-gn-active-slot';
// vitest runs the store in Node, where browser storage doesn't exist
const HAS_STORAGE = typeof localStorage !== 'undefined';

function loadActiveSlot(): number | null {
  if (!HAS_STORAGE) return null;
  const v = Number(localStorage.getItem(ACTIVE_SLOT_KEY));
  return Number.isInteger(v) && v >= 1 ? v : null;
}

export interface CaseItem { id: string; name: string; points: number }

// Treasures currently resting in the trophy case, nested containers included
// (the canary rides inside the egg). Drives the room-art fill tier and the
// museum inset's cells.
function caseTreasureList(s: WorldState): CaseItem[] {
  const found: CaseItem[] = [];
  const walk = (holder: string) => {
    for (const o of contents(s, holder)) {
      const od = DATA.objects[o];
      if ((od?.tvalue ?? 0) > 0) found.push({ id: o, name: od.desc ?? o, points: od.tvalue! });
      walk(o);
    }
  };
  walk('TROPHY-CASE');
  return found;
}

function saveMeta(state: unknown): { roomName: string; score: number; moves: number } {
  const st = state as { here: string; counters?: { score?: number; moves?: number } };
  return {
    roomName: DATA.rooms[st.here]?.desc ?? st.here,
    score: st.counters?.score ?? 0,
    moves: st.counters?.moves ?? 0,
  };
}

// Region-flavored treasure-fanfare stingers (docs/handoff-2026-07-11.md item 7).
// The engine only ever emits the generic 'treasure-chime' sfx name; this is a
// presentation-layer remap by the player's current region, same spirit as
// ROOM_PRES mapping rooms to art — the engine shouldn't need to know about audio.
const TREASURE_CHIME_BY_REGION: Record<string, string> = {
  above: 'treasure-chime-above', house: 'treasure-chime-house',
  temple: 'treasure-chime-temple',
  dam: 'treasure-chime-dam', mine: 'treasure-chime-dam',
  endgame: 'treasure-chime-endgame',
};

// Rooms on or beside moving water: entering them swells a water ambience over
// the region bed. The reservoir only counts while flooded (drained = dry bed).
const WATER_ROOMS = new Set([
  'RIVER-1', 'RIVER-2', 'RIVER-3', 'RIVER-4', 'RIVER-5',
  'IN-STREAM', 'STREAM-VIEW', 'RESERVOIR', 'RESERVOIR-NORTH', 'RESERVOIR-SOUTH',
  'ARAGAIN-FALLS', 'SANDY-BEACH', 'SHORE', 'WHITE-CLIFFS-NORTH', 'WHITE-CLIFFS-SOUTH',
]);

interface GameStore {
  game: Game;
  screen: Screen;
  log: LogLine[];
  panel: string;             // art path without extension, e.g. 'rooms/west-of-house'
  panelSeq: number;          // increments per panel change (keying animations)
  panelIsEvent: boolean;
  travelDir?: string;        // compass direction of the walk that produced the current panel
  roomName: string;
  region: string;
  score: number;
  moves: number;
  health: number;            // 0..3 lantern segments
  chips: string[];           // disambiguation options
  inventoryList: string[];
  dark: boolean;
  shakeSeq: number;          // bumped on a dramatic hit/explosion/collapse — triggers a screen shake
  scorePulseSeq: number;     // bumped whenever score increases — triggers a status-bar pulse
  healthLostSeq: number;     // bumped whenever a health pip is lost — triggers a pip reaction
  vignette: 'none' | 'wound' | 'death';
  vignetteSeq: number;       // bumped per vignette occurrence, even if the kind repeats
  slotsOpen: SlotsMode;      // the save-slots panel, opened by UI buttons or SAVE/RESTORE verbs
  activeSlot: number | null; // last slot saved to or loaded from; typed SAVE/RESTORE target it
  caseView: CaseItem[] | null; // trophy-case museum inset (null = closed), from EXAMINE CASE
  // transient fly-in card over the stage (first treasure take, sword glow) —
  // shows dramatic art without replacing the room panel underneath.
  // art is a path under ./art/ without extension, e.g. 'items/jeweled-egg'.
  flashCard: { art: string; caption?: string } | null;
  flashSeq: number;            // keys each flash so repeats remount fresh
  begin: () => void;
  submit: (cmd: string) => void;
  restartGame: () => void;
  applyEvents: (events: GameEvent[]) => void;
  openSlots: (mode: 'save' | 'load') => void;
  closeSlots: () => void;
  closeCaseView: () => void;
  clearFlashCard: () => void;
  saveToSlot: (slot: number) => Promise<boolean>;
  loadSlot: (slot: number) => Promise<boolean>;
  setActiveSlot: (slot: number | null) => void;
}

let lineId = 0;

export const useStore = create<GameStore>((set, get) => ({
  game: new Game(),
  screen: 'title',
  log: [],
  panel: 'ui/title-screen',
  panelSeq: 0,
  panelIsEvent: false,
  roomName: '',
  region: 'above',
  score: 0,
  moves: 0,
  health: 3,
  chips: [],
  inventoryList: [],
  dark: false,
  shakeSeq: 0,
  scorePulseSeq: 0,
  healthLostSeq: 0,
  vignette: 'none',
  vignetteSeq: 0,
  slotsOpen: false,
  activeSlot: loadActiveSlot(),
  caseView: null,
  flashCard: null,
  flashSeq: 0,

  begin: () => {
    const g = get().game;
    audio.unlock();
    set({ screen: 'play' });
    get().applyEvents(g.start());
  },

  openSlots: (mode) => set({ slotsOpen: mode }),
  closeSlots: () => set({ slotsOpen: false }),
  closeCaseView: () => set({ caseView: null }),
  clearFlashCard: () => set({ flashCard: null }),

  setActiveSlot: (slot) => {
    if (HAS_STORAGE) {
      if (slot === null) localStorage.removeItem(ACTIVE_SLOT_KEY);
      else localStorage.setItem(ACTIVE_SLOT_KEY, String(slot));
    }
    set({ activeSlot: slot });
  },

  // Both the slot panel's buttons and the typed SAVE/RESTORE verbs land here,
  // so there is exactly one save/load code path.
  saveToSlot: async (slot) => {
    const { game } = get();
    try {
      const json = game.exportSave();
      await writeSaveSlot({ slot, json, ...saveMeta(JSON.parse(json)), timestamp: Date.now() });
      get().setActiveSlot(slot);
      set((st) => ({ log: [...st.log, { id: lineId++, text: 'Ok.', cls: 'system' }] }));
      return true;
    } catch {
      set((st) => ({ log: [...st.log, { id: lineId++, text: 'Failed.', cls: 'system' }] }));
      return false;
    }
  },

  loadSlot: async (slot) => {
    const { screen } = get();
    try {
      const record = await readSaveSlot(slot);
      if (!record) { set({ slotsOpen: 'load' }); return false; }
      if (screen !== 'play') get().begin();
      const out = new Out();
      const ok = get().game.importSave(record.json, out);
      if (ok) {
        get().applyEvents(out.events);
        get().setActiveSlot(slot);
        set({ slotsOpen: false });
      } else {
        get().applyEvents(out.events); // "That save file is invalid."
      }
      return ok;
    } catch {
      set((st) => ({ log: [...st.log, { id: lineId++, text: 'Failed.', cls: 'system' }] }));
      return false;
    }
  },

  submit: (cmdText: string) => {
    const text = cmdText.trim();
    if (!text) return;
    const { game, applyEvents } = get();
    set((st) => ({ log: [...st.log, { id: lineId++, text: `> ${text}`, cls: 'cmd' }], chips: [] }));
    applyEvents(game.execute(text));
  },

  restartGame: () => {
    const game = new Game();
    set({
      game, screen: 'play', log: [], panelSeq: 0, panelIsEvent: false, travelDir: undefined,
      shakeSeq: 0, scorePulseSeq: 0, healthLostSeq: 0, vignette: 'none', vignetteSeq: 0,
    });
    get().applyEvents(game.start());
  },

  applyEvents: (events: GameEvent[]) => {
    const st = get();
    const game = st.game;
    const s = game.s;
    const newLog: LogLine[] = [];
    let panel = st.panel;
    let panelIsEvent = false;
    let roomName = st.roomName;
    let region = st.region;
    let screen: Screen = st.screen;
    let chips: string[] = [];
    let sawRoom = false;
    let travelDir = st.travelDir;
    let shakeBumps = 0;
    let tempDeath = false; // 'death' event with permanent:false — the resurrection flash
    let saveReq = false;
    let restoreReq = false;
    let restartReq = false;
    let caseViewReq = false;
    let flashCard: { art: string; caption?: string } | null = null;

    for (const e of events) {
      switch (e.type) {
        case 'text':
          newLog.push({ id: lineId++, text: e.text, cls: e.cls ?? 'normal' });
          break;
        case 'room': {
          sawRoom = true;
          travelDir = e.dir;
          const art = roomArtFor(e.room, s.gflags, (o, f) => fset$(s, o, f), caseTreasureList(s).length);
          panel = `rooms/${art}`;
          panelIsEvent = false;
          roomName = DATA.rooms[e.room]?.desc ?? '';
          const reg = ROOM_PRES[e.room]?.region ?? 'underground';
          if (reg !== region) {
            region = reg;
            audio.playBed(REGION_MUSIC[reg]);
          }
          if (e.room === 'ENTRANCE-TO-HADES' && !s.gflags['LLD-FLAG']) audio.layerHades(true);
          else audio.layerHades(false);
          // Water ambience over the bed when arriving at a watery room. The
          // reservoir is only wet at high tide.
          if (WATER_ROOMS.has(e.room) && !(e.room.startsWith('RESERVOIR') && s.gflags['LOW-TIDE'])) {
            audio.sfx('water-flow');
          }
          break;
        }
        case 'panel': {
          const key = PANEL_FALLBACK[e.key] ?? e.key;
          // Sword glow fires as a daemon right after room transitions, so as
          // a panel it always stole the just-entered room's art ("last panel
          // event wins"). Render it as a fly-in card over the room instead.
          if (key === 'events/sword-glow') { flashCard = { art: key }; break; }
          if (EVENT_PANELS.has(key) || key.startsWith('rooms/') || key.startsWith('items/')) {
            panel = key;
            panelIsEvent = key.startsWith('events/') || key.startsWith('characters/') || key.startsWith('items/');
          }
          break;
        }
        case 'sfx': {
          const name = e.name === 'treasure-chime' ? (TREASURE_CHIME_BY_REGION[region] ?? e.name) : e.name;
          audio.sfx(name);
          break;
        }
        case 'shake': shakeBumps += 1; break;
        case 'score': break;
        case 'death':
          if (e.permanent) screen = 'death';
          else tempDeath = true;
          break;
        case 'victory':
          screen = 'victory';
          audio.playBed('victory');
          break;
        case 'ask': chips = e.options; break;
        case 'save-request': saveReq = true; break;
        case 'restore-request': restoreReq = true; break;
        case 'restart': restartReq = true; break;
        case 'case-view': caseViewReq = true; break;
        case 'treasure':
          if (ITEM_ART[e.obj]) flashCard = { art: `items/${ITEM_ART[e.obj]}`, caption: DATA.objects[e.obj]?.desc ?? '' };
          else { panel = 'events/treasure-gleam'; panelIsEvent = true; } // no art: old generic gleam
          break;
      }
    }

    // Darkness panel — driven by lighting state, not just movement, so the art
    // can't show a lit room while the text says "pitch black" (e.g. after you
    // extinguish the lamp in place). When the lamp comes back on without a room
    // change, restore the current room's art so the panel doesn't stay stuck on
    // the grue warning.
    const dark = !roomLit(s) && !s.dead;
    if (dark) {
      panel = 'events/grue-warning';
      panelIsEvent = true;
    } else if (st.dark && !sawRoom && !panelIsEvent) {
      panel = `rooms/${roomArtFor(s.here, s.gflags, (o, f) => fset$(s, o, f), caseTreasureList(s).length)}`;
    }

    // Page-turn whoosh on any panel change during play — the graphic-novel
    // conceit made audible. Skipped on the death/victory screens, which have
    // their own stingers, and on the opening title-to-first-room reveal.
    if (panel !== st.panel && screen === 'play' && st.panel !== 'ui/title-screen') {
      audio.sfx('page-turn');
    }

    const wounds = s.counters.wounds ?? 0;
    const health = Math.max(0, 3 - wounds);
    const score = s.counters.score;
    set((prev) => {
      const healthLost = health < prev.health;
      const scoreGained = score > prev.score;
      const vignette: GameStore['vignette'] = tempDeath ? 'death' : healthLost ? 'wound' : 'none';
      return {
        log: [...prev.log, ...newLog].slice(-400),
        panel,
        panelIsEvent,
        panelSeq: panel !== prev.panel ? prev.panelSeq + 1 : prev.panelSeq,
        travelDir,
        roomName,
        region,
        screen,
        chips,
        score,
        moves: s.counters.moves,
        health,
        inventoryList: inventory(s).map((o) => DATA.objects[o]?.desc ?? o),
        dark,
        shakeSeq: shakeBumps > 0 ? prev.shakeSeq + 1 : prev.shakeSeq,
        scorePulseSeq: scoreGained ? prev.scorePulseSeq + 1 : prev.scorePulseSeq,
        healthLostSeq: healthLost ? prev.healthLostSeq + 1 : prev.healthLostSeq,
        vignette: vignette === 'none' ? prev.vignette : vignette,
        vignetteSeq: vignette !== 'none' ? prev.vignetteSeq + 1 : prev.vignetteSeq,
        // only open the museum inset when there's something to display —
        // an empty case already reads fine as plain text
        ...(caseViewReq && caseTreasureList(s).length ? { caseView: caseTreasureList(s) } : null),
        ...(flashCard ? { flashCard, flashSeq: prev.flashSeq + 1 } : null),
      };
    });

    // Fulfill engine requests (the engine is synchronous; storage is not).
    // Typed SAVE/RESTORE act on the active slot; without one, open the panel.
    if (restartReq) { get().restartGame(); return; }
    if (saveReq) {
      const slot = get().activeSlot;
      if (slot) void get().saveToSlot(slot);
      else set({ slotsOpen: 'save' });
    }
    if (restoreReq) {
      const slot = get().activeSlot;
      if (slot) void get().loadSlot(slot); // opens the panel itself if the slot is empty
      else set({ slotsOpen: 'load' });
    }
  },
}));

// Legacy single-slot localStorage save (pre-2026-07-12) → slot 1, once.
if (HAS_STORAGE && typeof indexedDB !== 'undefined') {
  void migrateLegacySave(saveMeta).then((slot) => {
    if (slot !== null && useStore.getState().activeSlot === null) {
      useStore.getState().setActiveSlot(slot);
    }
  });
}
