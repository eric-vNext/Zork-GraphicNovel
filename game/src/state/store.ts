// Presentation state (Zustand). The engine owns game truth; this mirrors
// what the UI needs: log lines, current panel, region, score, chips, screens.
import { create } from 'zustand';
import { Game } from '../engine/engine';
import type { GameEvent } from '../engine/types';
import { ROOM_PRES, roomArtFor, REGION_MUSIC, EVENT_PANELS, PANEL_FALLBACK } from '../data/presentation';
import { audio } from '../audio/audioManager';
import { fset$, inventory, DATA, roomLit } from '../engine/world';
import { Out } from '../engine/world';

export interface LogLine { id: number; text: string; cls: string }
export type Screen = 'title' | 'play' | 'death' | 'victory';

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
  begin: () => void;
  submit: (cmd: string) => void;
  restartGame: () => void;
  applyEvents: (events: GameEvent[]) => void;
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

  begin: () => {
    const g = get().game;
    audio.unlock();
    set({ screen: 'play' });
    get().applyEvents(g.start());
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

    for (const e of events) {
      switch (e.type) {
        case 'text':
          newLog.push({ id: lineId++, text: e.text, cls: e.cls ?? 'normal' });
          break;
        case 'room': {
          sawRoom = true;
          travelDir = e.dir;
          const art = roomArtFor(e.room, s.gflags, (o, f) => fset$(s, o, f));
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
      };
    });
  },
}));
