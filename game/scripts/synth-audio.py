#!/usr/bin/env python3
"""Synthesize all original music beds and SFX for Zork: Graphic Novel Edition.

Pure numpy DSP -> WAV masters in assets/audio/ -> afconvert AAC (.m4a) into
game/public/audio/. Every sound is procedural and original. Music beds are
seamless loops (tail crossfaded into head).
"""
import numpy as np, os, subprocess, sys

SR = 44100
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
A_MUS = os.path.join(ROOT, "assets", "audio", "music")
A_SFX = os.path.join(ROOT, "assets", "audio", "sfx")
P_MUS = os.path.join(ROOT, "game", "public", "audio", "music")
P_SFX = os.path.join(ROOT, "game", "public", "audio", "sfx")
for d in (A_MUS, A_SFX, P_MUS, P_SFX):
    os.makedirs(d, exist_ok=True)

rng = np.random.default_rng(1980)

# ---------- DSP toolkit ----------------------------------------------------
def t(dur): return np.arange(int(dur * SR)) / SR

def sine(f, dur, ph=0.0): return np.sin(2 * np.pi * f * t(dur) + ph)

def saw(f, dur):
    x = (f * t(dur)) % 1.0
    return 2 * x - 1

def noise(dur): return rng.standard_normal(int(dur * SR))

def onepole_lp(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x); acc = 0.0
    b = 1 - a
    for i in range(len(x)):
        acc = a * acc + b * x[i]
        y[i] = acc
    return y

def lp(x, cutoff):  # fast vectorized approximation via FFT brickwall+slope
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    H = 1.0 / (1.0 + (f / max(cutoff, 1)) ** 2)
    return np.fft.irfft(X * H, len(x))

def hp(x, cutoff):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    H = 1.0 / (1.0 + (max(cutoff, 1) / np.maximum(f, 1e-9)) ** 2)
    return np.fft.irfft(X * H, len(x))

def bp(x, lo, hi): return hp(lp(x, hi), lo)

def env_ad(x, a=0.01, d=0.3):
    n = len(x); e = np.ones(n)
    na, nd = int(a * SR), int(d * SR)
    na, nd = min(na, n), min(nd, n)
    e[:na] = np.linspace(0, 1, na)
    e[n - nd:] *= np.linspace(1, 0, nd)
    return x * e

def env_perc(dur, a=0.005, k=6.0):
    tt = t(dur)
    e = np.minimum(tt / max(a, 1e-4), 1.0) * np.exp(-k * tt)
    return e

def delay_fx(x, time_s, fb=0.35, mix=0.3):
    d = int(time_s * SR)
    y = np.copy(x)
    buf = np.zeros(len(x) + d * 8)
    buf[:len(x)] = x
    g = fb
    for i in range(1, 8):
        seg = buf[:len(x)]
        y += np.roll(x, d * i) * (mix * g ** i) * (np.arange(len(x)) >= d * i)
    return y

def reverb(x, size=0.5, mix=0.25):
    """Cheap Schroeder-ish: sum of decaying noise-convolved delays via FFT."""
    ir_len = int(size * 2.2 * SR)
    ir = rng.standard_normal(ir_len) * np.exp(-4.0 * np.arange(ir_len) / ir_len)
    ir[0] = 1.0
    Y = np.fft.rfft(x, len(x) + ir_len)
    I = np.fft.rfft(ir, len(x) + ir_len)
    wet = np.fft.irfft(Y * I)[:len(x)]
    wet /= (np.max(np.abs(wet)) + 1e-9)
    dry = x / (np.max(np.abs(x)) + 1e-9)
    return dry * (1 - mix) + wet * mix

def stereoize(x, width=0.4, lfo=0.05):
    n = len(x)
    pan = 0.5 + width * 0.5 * np.sin(2 * np.pi * lfo * np.arange(n) / SR)
    return np.stack([x * np.sqrt(1 - pan), x * np.sqrt(pan)], axis=1)

def loopify(x, fade=3.0):
    """Crossfade tail into head so the buffer loops seamlessly."""
    nf = int(fade * SR)
    if x.ndim == 1: x = x[:, None]
    head, tail = x[:nf], x[-nf:]
    w = np.linspace(0, 1, nf)[:, None]
    x2 = x[:-nf].copy()
    x2[:nf] = head * w + tail * (1 - w)
    return x2

def norm(x, peak=0.9):
    return x / (np.max(np.abs(x)) + 1e-9) * peak

def mix(*parts):
    """Sum 1-D signals of different lengths, zero-padded to the longest."""
    n = max(len(p) for p in parts)
    out = np.zeros(n)
    for p in parts:
        out[:len(p)] += p
    return out

def write_wav(path, x, gain=1.0):
    import wave, struct
    x = norm(np.asarray(x), 0.9) * gain
    if x.ndim == 1: x = np.stack([x, x], axis=1)
    xi = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(xi.tobytes())

def emit(name, x, kind, gain=1.0):
    src_dir = A_MUS if kind == "music" else A_SFX
    out_dir = P_MUS if kind == "music" else P_SFX
    wav = os.path.join(src_dir, name + ".wav")
    m4a = os.path.join(out_dir, name + ".m4a")
    write_wav(wav, x, gain)
    subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "96000", wav, m4a],
                   check=True, capture_output=True)
    print(f"  {name}: {len(x)/SR:.1f}s -> {os.path.getsize(m4a)//1024} KB")

# ---------- musical helpers -------------------------------------------------
def pad_chord(freqs, dur, cutoff=900, detune=0.4, amp=None):
    out = np.zeros(int(dur * SR))
    for f in freqs:
        for dt in (-detune, 0, detune):
            out += saw(f * (1 + dt / 100), dur) * 0.2
        out += sine(f / 2, dur) * 0.15
    out = lp(out, cutoff)
    if amp is not None: out *= amp
    return out

def slow_lfo(dur, rate, lo=0.5, hi=1.0, ph=0.0):
    return lo + (hi - lo) * 0.5 * (1 + np.sin(2 * np.pi * rate * t(dur) + ph))

def pluck(f, dur=1.2, bright=2200):
    x = sine(f, dur) * 0.7 + sine(f * 2, dur) * 0.2 + sine(f * 3.01, dur) * 0.08
    return lp(x, bright) * env_perc(dur, 0.003, 4.5)

def place(canvas, snd, at):
    i = int(at * SR)
    j = min(len(canvas), i + len(snd))
    if i < len(canvas): canvas[i:j] += snd[:j - i]

# Musical scale anchors: D dorian-ish, dark but warm
A2, D3, F3, G3, A3, C4, D4, E4, F4, G4, A4 = 110.0, 146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 329.63, 349.23, 392.0, 440.0

print("== music beds ==")
L = 72.0  # bed length before loop-crossfade

# 1. title — music-box main theme over wind
def bed_title():
    c = np.zeros(int(L * SR))
    wind = lp(noise(L), 350) * slow_lfo(L, 0.05, 0.15, 0.5) * 0.5
    theme = [(D4, 0), (F4, 1.2), (A4, 2.4), (G4, 4.0), (F4, 5.2), (D4, 6.4), (E4, 8.4), (D4, 10.0)]
    for rep in range(4):
        base = rep * 18.0 + 2.0
        for f, at in theme:
            place(c, pluck(f * 2, 2.2, 3500) * 0.35, base + at)  # music box octave
        place(c, pad_chord([D3, A3, F4], 8, 700) * env_ad(np.ones(int(8*SR)), 2, 3)[0:int(8*SR)] * 0.25, base)
    return stereoize(norm(c * 0.8 + wind * 0.6), 0.5, 0.03)

# 2. above-ground — guitar-ish plucks, wind, birdsong
def bed_above():
    c = np.zeros(int(L * SR))
    wind = lp(noise(L), 300) * slow_lfo(L, 0.07, 0.2, 0.6) * 0.55
    seq = [(D3, 0), (A3, 2.0), (F3, 4.5), (G3, 7.0), (D3, 9.0), (C4, 11.5)]
    for rep in range(5):
        base = rep * 14.0 + 1.0
        for f, at in seq:
            place(c, pluck(f, 2.5, 1800) * 0.3, base + at + rng.uniform(-0.3, 0.3))
    # sparse birdsong chirps
    for _ in range(26):
        at = rng.uniform(0, L - 1)
        f0 = rng.uniform(2600, 4200)
        chirp = sine(f0, 0.12) * env_perc(0.12, 0.005, 18) * np.sin(2*np.pi*rng.uniform(8, 14)*t(0.12))
        place(c, chirp * 0.12, at)
    pad = pad_chord([D3, A3], L, 500, amp=slow_lfo(L, 0.02, 0.3, 0.7)) * 0.18
    return stereoize(norm(c + wind + pad), 0.55, 0.04)

# 3. house — celesta music-box, wood creaks, room tone
def bed_house():
    c = np.zeros(int(L * SR))
    tone = lp(noise(L), 150) * 0.25
    theme = [(D4, 0), (F4, 1.5), (A4, 3.0), (G4, 5.0), (E4, 7.0), (D4, 9.0)]
    for rep in range(4):
        base = rep * 17.0 + 2.5
        for f, at in theme:
            place(c, pluck(f * 2, 3.0, 4000) * 0.22, base + at)
    for _ in range(10):  # creaks
        at = rng.uniform(0, L - 1)
        cr = bp(noise(0.5), 300, 900) * env_perc(0.5, 0.08, 5) * 0.1
        place(c, cr, at)
    return stereoize(norm(c + tone), 0.4, 0.05)

# 4. underground (cellar/troll) — drone, drips, sub pulse
def bed_underground():
    drone = pad_chord([A2, D3], L, 320, amp=slow_lfo(L, 0.03, 0.5, 1.0)) * 0.5
    sub = sine(A2 / 2, L) * slow_lfo(L, 0.11, 0.05, 0.22)
    c = np.zeros(int(L * SR))
    for _ in range(38):  # drips
        at = rng.uniform(0, L - 0.6)
        f0 = rng.uniform(700, 1800)
        drip = sine(f0, 0.35) * env_perc(0.35, 0.002, 14)
        place(c, reverb(drip, 0.8, 0.5) * 0.16, at)
    return stereoize(norm(drone + sub + c), 0.5, 0.02)

# 5. maze — heartbeat, air tone, skitters
def bed_maze():
    c = np.zeros(int(L * SR))
    air = hp(lp(noise(L), 900), 300) * 0.06
    for beat in np.arange(0.5, L, 1.05):  # slow heart
        thump = sine(55, 0.22) * env_perc(0.22, 0.002, 16)
        place(c, thump * 0.8, beat)
        place(c, thump * 0.5, beat + 0.28)
    for _ in range(14):  # skitters
        at = rng.uniform(0, L - 0.4)
        sk = bp(noise(0.25), 2000, 6000) * env_perc(0.25, 0.002, 22) * 0.05
        place(c, sk, at)
    return stereoize(norm(c + air), 0.35, 0.06)

# 6. temple — wordless choir pad + torch crackle
def bed_temple():
    chord1 = pad_chord([D3, A3, D4, F4], 24, 650)
    chord2 = pad_chord([C4/2, G3, C4, E4], 24, 650)
    chord3 = pad_chord([A2, E4/2, A3, C4], 24, 650)
    pad = np.concatenate([chord1, chord2, chord3])
    pad = lp(pad, 800) * slow_lfo(L, 0.04, 0.5, 1.0)
    crackle = np.zeros(int(L * SR))
    for _ in range(220):
        at = rng.uniform(0, L - 0.1)
        pop = bp(noise(0.05), 1200, 5200) * env_perc(0.05, 0.001, 40)
        place(crackle, pop * rng.uniform(0.02, 0.07), at)
    return stereoize(norm(reverb(pad, 1.2, 0.35) * 0.8 + crackle), 0.5, 0.02)

# 7. hades layer — dissonant whisper texture (layered over temple bed in-game)
def bed_hades():
    cluster = pad_chord([A3, A3 * 1.059, A3 * 1.122, E4 * 1.03], L, 900,
                        amp=slow_lfo(L, 0.05, 0.4, 1.0)) * 0.5
    whisp = np.zeros(int(L * SR))
    for _ in range(30):
        at = rng.uniform(0, L - 2)
        w = bp(noise(1.8), 1400, 4200) * env_ad(np.ones(int(1.8*SR)), 0.6, 0.9)[:int(1.8*SR)]
        whisp_seg = w * slow_lfo(1.8, rng.uniform(2, 5), 0, 1) * 0.05
        place(whisp, whisp_seg, at)
    return stereoize(norm(cluster + whisp), 0.6, 0.07)

# 8. dam/river — turbine hum, water wash, metal clanks
def bed_dam():
    hum = (sine(60, L) * 0.5 + sine(120, L) * 0.25 + sine(180.5, L) * 0.12) * slow_lfo(L, 0.06, 0.7, 1.0)
    water = lp(noise(L), 800) * slow_lfo(L, 0.09, 0.25, 0.6) * 0.5
    c = np.zeros(int(L * SR))
    for at in np.arange(3, L, 6.7):
        clank = bp(noise(0.4), 500, 1600) * env_perc(0.4, 0.002, 12) * 0.12
        place(c, reverb(clank, 1.0, 0.5), at + rng.uniform(-1, 1))
    return stereoize(norm(hum * 0.55 + water + c), 0.5, 0.03)

# 9. coal mine — creaking timbers, deep groans, geiger ticks
def bed_mine():
    c = np.zeros(int(L * SR))
    rumble = lp(noise(L), 90) * slow_lfo(L, 0.04, 0.3, 0.8) * 0.6
    for _ in range(12):  # timber groans
        at = rng.uniform(0, L - 2)
        f0 = rng.uniform(80, 160)
        groan = sine(f0, 1.6) * sine(rng.uniform(2, 5), 1.6) * env_ad(np.ones(int(1.6*SR)), 0.4, 0.8)[:int(1.6*SR)]
        place(c, bp(groan, 60, 500) * 0.22, at)
    for _ in range(60):  # ticks
        at = rng.uniform(0, L - 0.05)
        tick = bp(noise(0.02), 3000, 9000) * env_perc(0.02, 0.001, 80) * 0.05
        place(c, tick, at)
    return stereoize(norm(c + rumble), 0.45, 0.02)

# 10. victory — full theme, strings + celesta, resolving
def bed_victory():
    c = np.zeros(int(L * SR))
    prog = [([D3, A3, D4, F4], 0), ([G3/2*2, G3, D4, G4], 8), ([C4/2, G3, C4, E4], 16), ([D3, A3, D4, F4+0.0], 24)]
    for chord, at in prog:
        seg = pad_chord(chord, 10, 1100, amp=env_ad(np.ones(int(10*SR)), 2.5, 4)[:int(10*SR)])
        place(c, seg * 0.4, at)
    theme = [(D4, 0), (F4, 1.2), (A4, 2.4), (G4, 4.0), (F4, 5.2), (A4, 6.4), (D4*2, 8.4)]
    for rep, base in enumerate([2.0, 20.0, 38.0]):
        for f, at in theme:
            place(c, pluck(f * 2, 2.8, 3800) * 0.3, base + at)
    final = pad_chord([D3, A3, D4, F4 * 1.001], 18, 1000,
                      amp=env_ad(np.ones(int(18*SR)), 4, 10)[:int(18*SR)]) * 0.4
    place(c, final, 46)
    wind = lp(noise(L), 300) * 0.12
    return stereoize(norm(reverb(c, 1.0, 0.3) + wind), 0.5, 0.03)

BEDS = {
    "title": bed_title, "above-ground": bed_above, "house": bed_house,
    "underground": bed_underground, "maze": bed_maze, "temple": bed_temple,
    "hades-layer": bed_hades, "dam-river": bed_dam, "coal-mine": bed_mine,
    "victory": bed_victory,
}
for name, fn in BEDS.items():
    emit(name, loopify(fn(), 3.0), "music", gain=0.85)

# ---------- SFX -------------------------------------------------------------
print("== sfx ==")
def sfx_door_creak():
    f = np.linspace(160, 90, int(0.9 * SR))
    x = np.sin(np.cumsum(2 * np.pi * f / SR)) * sine(6, 0.9)
    return bp(x, 100, 900) * env_ad(np.ones(len(x)), 0.05, 0.3)[:len(x)]

def sfx_window(): return env_ad(bp(noise(0.5), 200, 700), 0.02, 0.25) * sine(90, 0.5)
def sfx_mailbox():
    sq = bp(noise(0.25), 700, 2400) * env_perc(0.25, 0.002, 12)
    cl = sine(320, 0.12) * env_perc(0.12, 0.001, 25)
    return np.concatenate([sq, cl])
def sfx_take(): return bp(noise(0.12), 900, 3800) * env_perc(0.12, 0.002, 24)
def sfx_drop(): return lp(noise(0.18), 500) * env_perc(0.18, 0.002, 18) + sine(120, 0.18) * env_perc(0.18, 0.001, 20) * 0.6
def sfx_treasure():
    c = np.zeros(int(1.0 * SR))
    for i, f in enumerate([1568, 1976, 2637, 3136]):
        place(c, sine(f, 0.6) * env_perc(0.6, 0.002, 7) * 0.3, i * 0.07)
    return reverb(c, 0.6, 0.3)
def sfx_case():
    c = np.zeros(int(2.2 * SR))
    for i, f in enumerate([D4*2, F4*2, A4*2, D4*4]):
        place(c, pluck(f, 1.2, 4000) * 0.4, i * 0.16)
    return reverb(c, 0.8, 0.3)
def sfx_sword(n=0):
    ring = sine(2200 + n * 300, 0.5) * env_perc(0.5, 0.001, 9)
    clash = bp(noise(0.3), 1800, 8000) * env_perc(0.3, 0.001, 20)
    return mix(ring * 0.6, clash)
def sfx_sword_glow():
    return reverb(sine(1200, 1.2) * sine(6, 1.2) * env_ad(np.ones(int(1.2*SR)), 0.4, 0.6)[:int(1.2*SR)], 0.8, 0.4) * 0.6
def sfx_lamp_on():
    click = bp(noise(0.03), 2000, 7000) * env_perc(0.03, 0.001, 60)
    bloom = lp(noise(0.6), 900) * env_ad(np.ones(int(0.6*SR)), 0.15, 0.35)[:int(0.6*SR)] * 0.5
    return np.concatenate([click, bloom])
def sfx_lamp_off():
    click = bp(noise(0.03), 2000, 7000) * env_perc(0.03, 0.001, 60)
    fade = lp(noise(0.3), 600) * env_perc(0.3, 0.01, 10) * 0.4
    return np.concatenate([click, fade])
def sfx_match():
    strike = bp(noise(0.15), 1500, 6500) * env_perc(0.15, 0.002, 20)
    flame = lp(noise(0.5), 1200) * env_ad(np.ones(int(0.5*SR)), 0.1, 0.3)[:int(0.5*SR)] * 0.3
    return np.concatenate([strike, flame])
def sfx_magic():
    c = np.zeros(int(1.4 * SR))
    for i in range(12):
        f = 800 * (1.3 ** (i % 6)) * rng.uniform(0.98, 1.02)
        place(c, sine(f, 0.4) * env_perc(0.4, 0.002, 10) * 0.15, i * 0.09)
    return reverb(c, 1.0, 0.45)
def sfx_splash():
    return mix(lp(noise(0.7), 1400) * env_perc(0.7, 0.01, 7),
               bp(noise(0.4), 800, 3000) * env_perc(0.4, 0.02, 10) * 0.5)
def sfx_inflate():
    c = []
    for i in range(5):
        c.append(bp(noise(0.35), 300, 1200) * env_ad(np.ones(int(0.35*SR)), 0.08, 0.15)[:int(0.35*SR)])
        c.append(np.zeros(int(0.12 * SR)))
    return np.concatenate(c) * 0.6
def sfx_dam():
    grind = bp(noise(1.8), 150, 700) * env_ad(np.ones(int(1.8*SR)), 0.3, 0.6)[:int(1.8*SR)]
    thump = sine(60, 1.8) * env_perc(1.8, 0.3, 3)
    return grind * 0.6 + thump
def sfx_flood(): return lp(noise(1.6), 1000) * slow_lfo(1.6, 1.5, 0.4, 1.0) * env_ad(np.ones(int(1.6*SR)), 0.3, 0.4)[:int(1.6*SR)]
def sfx_bat():
    f = np.linspace(3200, 1400, int(0.5 * SR))
    scream = np.sin(np.cumsum(2 * np.pi * f / SR)) * sine(28, 0.5)
    flaps = np.concatenate([lp(noise(0.12), 500) * env_perc(0.12, 0.01, 20) for _ in range(4)])
    return np.concatenate([scream * env_ad(np.ones(len(scream)), 0.02, 0.2)[:len(scream)], flaps * 0.5])
def sfx_thief():
    c = np.zeros(int(0.8 * SR))
    for i in range(4):
        place(c, bp(noise(0.09), 1200, 3600) * env_perc(0.09, 0.004, 30) * (0.5 - i * 0.09), i * 0.14)
    return c
def sfx_troll():
    f = np.linspace(140, 80, int(0.7 * SR))
    g = np.sin(np.cumsum(2 * np.pi * f / SR))
    return bp(g * (1 + 0.5 * sine(30, 0.7)), 70, 800) * env_ad(np.ones(len(g)), 0.04, 0.3)[:len(g)]
def sfx_grue():
    growl = sine(38, 2.2) * (1 + 0.6 * sine(9, 2.2)) + lp(noise(2.2), 120) * 0.7
    return lp(growl, 150) * env_ad(np.ones(int(2.2*SR)), 0.6, 1.0)[:int(2.2*SR)]
def sfx_death():
    hit = mix(lp(noise(0.3), 300) * env_perc(0.3, 0.002, 12), sine(55, 0.8) * env_perc(0.8, 0.002, 5))
    toll = sine(146, 2.5) * env_perc(2.5, 0.01, 2.2) * 0.5
    return reverb(mix(hit, toll), 1.2, 0.4)
def sfx_hollow_voice():
    # formant-ish "voice" swell
    base = saw(95, 1.4)
    v = bp(base, 300, 900) + bp(base, 1000, 1600) * 0.5
    return reverb(v * env_ad(np.ones(len(v)), 0.25, 0.6)[:len(v)], 1.4, 0.5) * 0.6
def sfx_slide():
    f = np.linspace(400, 2000, int(1.3 * SR))
    wh = bp(noise(1.3), 400, 4000) * env_ad(np.ones(int(1.3*SR)), 0.15, 0.3)[:int(1.3*SR)]
    return wh * slow_lfo(1.3, 3, 0.6, 1.0)
def sfx_explosion():
    boom = lp(noise(2.2), 180) * env_perc(2.2, 0.002, 3)
    crack = bp(noise(0.3), 1500, 8000) * env_perc(0.3, 0.001, 18)
    return norm(boom * 1.2 + np.pad(crack, (0, len(boom) - len(crack))))
def sfx_bell():
    x = sum(sine(f, 3.0) * a for f, a in [(523, 0.5), (1046, 0.25), (1567, 0.15), (2093, 0.1)])
    return reverb(x * env_perc(3.0, 0.002, 2.0), 1.0, 0.3)
def sfx_page():
    return bp(noise(0.25), 800, 4200) * env_ad(np.ones(int(0.25*SR)), 0.06, 0.12)[:int(0.25*SR)] * 0.5
def sfx_click(): return bp(noise(0.04), 1500, 5000) * env_perc(0.04, 0.001, 50) * 0.7
def sfx_trapdoor():
    slam = mix(lp(noise(0.4), 350) * env_perc(0.4, 0.002, 10), sine(70, 0.5) * env_perc(0.5, 0.002, 8))
    return reverb(slam, 0.7, 0.3)
def sfx_echo():
    v = bp(saw(110, 0.5), 250, 1200) * env_ad(np.ones(int(0.5*SR)), 0.05, 0.25)[:int(0.5*SR)]
    return delay_fx(v, 0.28, 0.55, 0.6)
def sfx_water_flow(): return lp(noise(1.4), 900) * slow_lfo(1.4, 2.2, 0.4, 1.0) * 0.7
def sfx_machine():
    whir = sine(85, 1.8) * (1 + 0.4 * sine(13, 1.8)) + bp(noise(1.8), 400, 1400) * 0.4
    kaching = sine(1800, 0.5) * env_perc(0.5, 0.002, 10) * 0.5
    x = whir * env_ad(np.ones(int(1.8*SR)), 0.2, 0.5)[:int(1.8*SR)]
    place(x, kaching, 1.2)
    return x

SFX = {
    "door-creak": sfx_door_creak, "window-open": sfx_window, "mailbox": sfx_mailbox,
    "take": sfx_take, "drop": sfx_drop, "treasure-chime": sfx_treasure,
    "case-fanfare": sfx_case, "sword-clash-1": lambda: sfx_sword(0),
    "sword-clash-2": lambda: sfx_sword(1), "sword-glow": sfx_sword_glow,
    "lamp-on": sfx_lamp_on, "lamp-off": sfx_lamp_off, "match-strike": sfx_match,
    "magic-shimmer": sfx_magic, "water-splash": sfx_splash, "boat-inflate": sfx_inflate,
    "dam-machinery": sfx_dam, "flood-rising": sfx_flood, "bat-screech": sfx_bat,
    "thief-snicker": sfx_thief, "troll-grunt": sfx_troll, "grue-growl": sfx_grue,
    "death-stinger": sfx_death, "hollow-voice": sfx_hollow_voice, "slide-whoosh": sfx_slide,
    "explosion": sfx_explosion, "bell": sfx_bell, "page-turn": sfx_page,
    "ui-click": sfx_click, "trapdoor-slam": sfx_trapdoor, "echo": sfx_echo,
    "water-flow": sfx_water_flow, "machine-diamond": sfx_machine,
}
for name, fn in SFX.items():
    emit(name, fn(), "sfx", gain=0.8)

print("done")
