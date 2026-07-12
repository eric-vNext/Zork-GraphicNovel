// Presentation state (Zustand). The engine owns game truth; this mirrors
// what the UI needs: log lines, current panel, region, score, chips, screens.
import { create } from 'zustand';
import { Game } from '../engine/engine';
import type { GameEvent } from '../engine/types';
import { ROOM_PRES, roomArtFor, REGION_MUSIC, EVENT_PANELS, PANEL_FALLBACK } from '../data/presentation';
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
  begin: () => void;
  submit: (cmd: string) => void;
  restartGame: () => void;
  applyEvents: (events: GameEvent[]) => void;
  openSlots: (mode: 'save' | 'load') => void;
  closeSlots: () => void;
  closeCaseView: () => void;
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

  begin: () => {
    const g = get().game;
    audio.unlock();
    set({ screen: 'play' });
    get().applyEvents(g.start());
  },

  openSlots: (mode) => set({ slotsOpen: mode }),
  closeSlots: () => set({ slotsOpen: false }),
  closeCaseView: () => set({ caseView: null }),

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
          break;
        }
        case 'panel': {
          const key = PANEL_FALLBACK[e.key] ?? e.key;
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
      }
    }

    // darkness panel
    const dark = !roomLit(s) && !s.dead;
    if (dark && sawRoom) { panel = 'events/grue-warning'; panelIsEvent = true; }

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
