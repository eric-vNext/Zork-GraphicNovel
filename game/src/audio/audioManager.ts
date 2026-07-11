// Howler-based audio: crossfading region beds + one-shot SFX.
// Volumes persist in localStorage; first user gesture unlocks audio.
import { Howl, Howler } from 'howler';

const XFADE_MS = 2500;
const MIN_BED_MS = 8000;

class AudioManager {
  private beds = new Map<string, Howl>();
  private sfxCache = new Map<string, Howl>();
  private currentBed: string | null = null;
  private currentHowl: Howl | null = null;
  private hadesHowl: Howl | null = null;
  private lastBedStart = 0;
  private pendingBed: string | null = null;
  musicVol = Number(localStorage.getItem('zork-vol-music') ?? 0.6);
  sfxVol = Number(localStorage.getItem('zork-vol-sfx') ?? 0.8);
  muted = localStorage.getItem('zork-muted') === '1';

  unlock(): void {
    Howler.autoUnlock = true;
    if (this.muted) Howler.mute(true);
  }

  setMuted(m: boolean): void {
    this.muted = m;
    Howler.mute(m);
    localStorage.setItem('zork-muted', m ? '1' : '0');
  }
  setMusicVol(v: number): void {
    this.musicVol = v;
    localStorage.setItem('zork-vol-music', String(v));
    this.currentHowl?.volume(v);
  }
  setSfxVol(v: number): void {
    this.sfxVol = v;
    localStorage.setItem('zork-vol-sfx', String(v));
  }

  private bed(name: string): Howl {
    let h = this.beds.get(name);
    if (!h) {
      h = new Howl({ src: [`./audio/music/${name}.m4a`], loop: true, volume: 0, preload: true });
      this.beds.set(name, h);
    }
    return h;
  }

  playBed(name: string): void {
    if (name === this.currentBed) return;
    const since = Date.now() - this.lastBedStart;
    if (since < MIN_BED_MS && this.currentBed) {
      // debounce rapid region flip-flop
      this.pendingBed = name;
      setTimeout(() => {
        if (this.pendingBed) { const p = this.pendingBed; this.pendingBed = null; this.playBed(p); }
      }, MIN_BED_MS - since + 50);
      return;
    }
    this.pendingBed = null;
    const old = this.currentHowl;
    if (old) {
      old.fade(old.volume() as number, 0, XFADE_MS);
      setTimeout(() => old.stop(), XFADE_MS + 100);
    }
    const next = this.bed(name);
    next.volume(0);
    next.play();
    next.fade(0, this.musicVol, XFADE_MS);
    this.currentBed = name;
    this.currentHowl = next;
    this.lastBedStart = Date.now();
  }

  layerHades(on: boolean): void {
    if (on && !this.hadesHowl) {
      this.hadesHowl = new Howl({ src: ['./audio/music/hades-layer.m4a'], loop: true, volume: 0 });
      this.hadesHowl.play();
      this.hadesHowl.fade(0, this.musicVol * 0.8, XFADE_MS);
    } else if (!on && this.hadesHowl) {
      const h = this.hadesHowl;
      this.hadesHowl = null;
      h.fade(h.volume() as number, 0, 1200);
      setTimeout(() => h.unload(), 1500);
    }
  }

  sfx(name: string): void {
    let h = this.sfxCache.get(name);
    if (!h) {
      h = new Howl({ src: [`./audio/sfx/${name}.m4a`], volume: this.sfxVol });
      this.sfxCache.set(name, h);
    }
    h.volume(this.sfxVol);
    h.play();
  }

  duckForDeath(): void {
    const h = this.currentHowl;
    if (!h) return;
    const v = h.volume() as number;
    h.fade(v, v * 0.2, 300);
    setTimeout(() => h.fade(v * 0.2, this.musicVol, 2000), 4000);
  }
}

export const audio = new AudioManager();
