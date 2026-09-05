#!/usr/bin/env python3
"""Synthesize Zork II's music beds and SFX.

Imports the DSP toolkit and musical helpers from synth-audio.py rather than
duplicating them, so both games share one sound-design vocabulary — same
oscillators, same filters, same reverb, same fixed seed. Output goes to
assets/audio/{music,sfx}/ as WAV masters and to game/public/audio/ as AAC,
exactly as Zork I's does.

Per docs/trilogy-presentation-concept.md §6: Zork II's beds are warmer and
more harmonically active than Zork I's, and the trilogy title theme appears
here in its brighter, reharmonised arrangement.

    python3 game/scripts/synth-audio-z2.py
"""
import importlib.util
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("z1", os.path.join(HERE, "synth-audio.py"))
z1 = importlib.util.module_from_spec(spec)

# synth-audio.py writes Zork I's whole set at import time. Suppress that: we
# only want its toolkit, not another pass over forty-odd files.
_real_emit = None
import numpy as np


def _load_toolkit():
    """Execute synth-audio.py with emit() stubbed out, keeping its functions."""
    global _real_emit
    src = open(os.path.join(HERE, "synth-audio.py")).read()
    src = src.replace("for name, fn in BEDS.items():", "for name, fn in []:")
    src = src.replace("for name, fn in SFX.items():", "for name, fn in []:")
    ns = {"__name__": "z1_toolkit", "__file__": os.path.join(HERE, "synth-audio.py")}
    exec(compile(src, "synth-audio.py", "exec"), ns)
    return ns


T = _load_toolkit()
SR = T["SR"]
t, sine, saw, noise = T["t"], T["sine"], T["saw"], T["noise"]
lp, hp, bp = T["lp"], T["hp"], T["bp"]
env_ad, env_perc = T["env_ad"], T["env_perc"]
delay_fx, reverb, stereoize = T["delay_fx"], T["reverb"], T["stereoize"]
loopify, norm, mix, emit = T["loopify"], T["norm"], T["mix"], T["emit"]
pad_chord, slow_lfo, pluck, place = T["pad_chord"], T["slow_lfo"], T["pluck"], T["place"]
rng = T["rng"]

A2, D3, E3, F3, G3, A3, C4, D4, E4, F4, G4, A4, C5, D5, E5 = (
    110.0, 146.83, 164.81, 174.61, 196.0, 220.0, 261.63, 293.66,
    329.63, 349.23, 392.0, 440.0, 523.25, 587.33, 659.25)

LEN = 69.0  # same bed length as Zork I, so crossfades match


def canvas(dur=LEN):
    return np.zeros(int(dur * SR))


# ---------- music beds ------------------------------------------------------

def bed_barrow():
    """Zork I's barrow theme, slowed and pitched down — the same place, deeper."""
    c = pad_chord([D3, A3, D4], LEN, 700, amp=slow_lfo(LEN, 0.02, 0.35, 0.75)) * 0.5
    for at in np.arange(0, LEN - 6, 11.0):
        place(c, pluck(D4, 3.4, 1500) * 0.22, at)
        place(c, pluck(A3, 4.0, 1200) * 0.16, at + 2.6)
    return stereoize(norm(reverb(c + lp(noise(LEN), 240) * 0.10, 0.9, 0.30)), 0.45, 0.02)


def bed_carousel():
    """A slow waltz on detuned bells. Diegetic: it is the room turning."""
    c = canvas()
    beat = 0.62
    for i, at in enumerate(np.arange(0, LEN - 3, beat)):
        f = [D4, A4, F4][i % 3] * (1.0 + 0.004 * ((i % 5) - 2))
        amp = 0.26 if i % 3 == 0 else 0.13
        place(c, pluck(f, 2.2, 2600) * amp, at)
    drone = pad_chord([D3, A3], LEN, 520, amp=slow_lfo(LEN, 0.03, 0.4, 0.7)) * 0.35
    whir = bp(noise(LEN), 300, 1400) * (0.05 + 0.03 * slow_lfo(LEN, 0.7, 0, 1))
    return stereoize(norm(reverb(c + drone + whir, 0.8, 0.28)), 0.55, 0.06)


def bed_garden():
    """Solo recorder over a sustained fifth. The only major-key bed in Zork II."""
    c = canvas()
    pad = pad_chord([G3, D4, G4, C5 * 1.001], LEN, 1100,
                    amp=slow_lfo(LEN, 0.015, 0.45, 0.8)) * 0.42
    tune = [(G4, 0), (A4, 1.5), (C5, 3.0), (D5, 4.4), (C5, 6.2), (A4, 7.6), (G4, 9.2)]
    for base in np.arange(0, LEN - 12, 15.0):
        for f, at in tune:
            v = lp(sine(f, 1.3) + 0.18 * sine(f * 2, 1.3), 2600)
            place(c, v * env_ad(np.ones(int(1.3 * SR)), 0.10, 0.9) * 0.20, base + at)
    return stereoize(norm(reverb(c + pad, 0.7, 0.26)), 0.4, 0.02)


def bed_dragon():
    """Low brass swell to the west, glassy shimmer to the east, in one bed."""
    c = pad_chord([A2, E3, A3], LEN, 420, amp=slow_lfo(LEN, 0.025, 0.3, 0.85)) * 0.55
    for at in np.arange(2, LEN - 8, 13.0):
        swell = pad_chord([A2, E3, C4], 7.0, 600,
                          amp=env_ad(np.ones(int(7 * SR)), 2.2, 4.0)) * 0.30
        place(c, swell, at)
    ice = canvas()
    for at in np.arange(0, LEN - 4, 3.7):
        place(ice, pluck(E5 * (1 + 0.002 * rng.standard_normal()), 2.6, 5200) * 0.10, at)
    return stereoize(norm(reverb(c + hp(ice, 1800), 1.0, 0.34)), 0.6, 0.04)


def bed_volcano():
    """A rising pad — pitch tied to altitude in the mix, not here."""
    c = canvas()
    for at in np.arange(0, LEN - 10, 9.0):
        seg = pad_chord([D3, A3, D4], 9.0, 800,
                        amp=env_ad(np.ones(int(9 * SR)), 3.0, 5.5)) * 0.34
        place(c, seg, at)
    rumble = lp(noise(LEN), 110) * (0.16 + 0.06 * slow_lfo(LEN, 0.05, 0, 1))
    return stereoize(norm(reverb(c + rumble, 0.85, 0.26)), 0.5, 0.03)


def bed_bank():
    """A dry, close, four-note ostinato that never resolves."""
    c = canvas()
    fig = [D4, F4, E4, G4]
    for i, at in enumerate(np.arange(0, LEN - 2, 0.85)):
        place(c, pluck(fig[i % 4], 1.1, 1900) * 0.17, at)
    pad = pad_chord([D3, F3], LEN, 600, amp=slow_lfo(LEN, 0.02, 0.35, 0.6)) * 0.28
    return stereoize(norm(reverb(c + pad, 0.35, 0.14)), 0.3, 0.01)


def bed_wonderland():
    """A music-box figure played at two speeds at once."""
    c = canvas()
    tune = [C5, E5, G4, C5, A4, G4, E4, G4]
    for i, at in enumerate(np.arange(0, LEN - 2, 0.5)):
        place(c, pluck(tune[i % 8], 1.4, 4200) * 0.15, at)
    for i, at in enumerate(np.arange(0, LEN - 3, 0.77)):
        place(c, pluck(tune[i % 8] / 2, 2.0, 2200) * 0.11, at)
    return stereoize(norm(reverb(c, 0.6, 0.24)), 0.65, 0.09)


def bed_wizard():
    """The trilogy title theme, Zork II arrangement: brighter, reharmonised."""
    c = canvas()
    theme = [(D4, 0.0), (F4, 1.1), (A4, 2.0), (G4, 3.2), (F4, 4.4), (D4, 5.8)]
    for base in np.arange(0, LEN - 10, 13.0):
        for f, at in theme:
            place(c, pluck(f, 3.0, 3000) * 0.24, base + at)
            place(c, pluck(f * 2, 2.0, 4600) * 0.09, base + at + 0.05)
    pad = pad_chord([D3, A3, D4, F4 * 1.001], LEN, 950,
                    amp=slow_lfo(LEN, 0.018, 0.4, 0.8)) * 0.40
    return stereoize(norm(reverb(c + pad, 0.9, 0.30)), 0.5, 0.03)


BEDS = {
    "z2-barrow": bed_barrow, "z2-carousel": bed_carousel, "z2-garden": bed_garden,
    "z2-dragon": bed_dragon, "z2-volcano": bed_volcano, "z2-bank": bed_bank,
    "z2-wonderland": bed_wonderland, "z2-wizard": bed_wizard,
}

# ---------- SFX -------------------------------------------------------------

def sfx_wand_glow():
    return norm(hp(sine(880, 1.1) + sine(1320, 1.1) * 0.5, 400)
                * env_ad(np.ones(int(1.1 * SR)), 0.25, 0.8)) * 0.7


def sfx_spell_cast():
    s = bp(noise(0.9), 600, 5000) * env_perc(0.9, 0.01, 5)
    return norm(s + sine(220, 0.9) * env_perc(0.9, 0.02, 7) * 0.6)


def sfx_spell_onset():
    return norm(lp(sine(140, 1.4) * env_ad(np.ones(int(1.4 * SR)), 0.5, 0.8), 900)) * 0.6


def sfx_spell_expire():
    return norm(hp(sine(660, 0.8) * env_perc(0.8, 0.02, 4), 300)) * 0.6


def sfx_wizard_vanish():
    return norm(bp(noise(1.0), 300, 3000) * env_perc(1.0, 0.01, 4)
                + sine(110, 1.0) * env_perc(1.0, 0.01, 5) * 0.5)


def sfx_carousel_stop():
    n = int(2.4 * SR)
    sweep = np.sin(2 * np.pi * np.cumsum(np.linspace(420, 60, n)) / SR)
    return norm(sweep * env_ad(np.ones(n), 0.05, 2.0)) * 0.7


def sfx_glacier_melt():
    return norm(bp(noise(2.6), 200, 4000) * env_ad(np.ones(int(2.6 * SR)), 0.3, 2.0)) * 0.8


def sfx_ice_crack():
    return norm(hp(noise(0.5), 1800) * env_perc(0.5, 0.001, 22)) * 0.8


def sfx_safe_blast():
    return norm(lp(noise(1.6), 700) * env_perc(1.6, 0.001, 6)
                + sine(55, 1.6) * env_perc(1.6, 0.001, 5))


def sfx_balloon_burner():
    return norm(bp(noise(1.5), 400, 2600) * env_ad(np.ones(int(1.5 * SR)), 0.15, 1.2)) * 0.6


def sfx_balloon_rise():
    return norm(lp(noise(2.0), 300) * env_ad(np.ones(int(2.0 * SR)), 0.6, 1.2)) * 0.5


def sfx_cerberus_growl():
    g = lp(noise(1.3), 260) * env_ad(np.ones(int(1.3 * SR)), 0.1, 1.0)
    return norm(g + sine(70, 1.3) * env_ad(np.ones(int(1.3 * SR)), 0.1, 1.0) * 0.8)


def sfx_dragon_roar():
    r = lp(noise(2.2), 400) * env_ad(np.ones(int(2.2 * SR)), 0.15, 1.8)
    return norm(r + sine(52, 2.2) * env_ad(np.ones(int(2.2 * SR)), 0.1, 1.8))


def sfx_dragon_fire():
    return norm(bp(noise(2.0), 500, 5000) * env_ad(np.ones(int(2.0 * SR)), 0.08, 1.6)) * 0.85


def sfx_robot_step():
    return norm(lp(noise(0.35), 400) * env_perc(0.35, 0.002, 14)
                + sine(90, 0.35) * env_perc(0.35, 0.001, 16) * 0.7)


def sfx_robot_lift():
    n = int(1.8 * SR)
    return norm(bp(noise(1.8), 200, 1200) * env_ad(np.ones(n), 0.3, 1.3)
                + sine(60, 1.8) * env_ad(np.ones(n), 0.4, 1.2) * 0.6)


def sfx_curtain_pass():
    return norm(hp(bp(noise(1.4), 900, 7000) * env_ad(np.ones(int(1.4 * SR)), 0.2, 1.0), 600)) * 0.7


def sfx_chomper():
    a = lp(noise(0.5), 500) * env_perc(0.5, 0.001, 12)
    return norm(a + sine(70, 0.5) * env_perc(0.5, 0.001, 14))


def sfx_menhir_grind():
    return norm(lp(noise(2.2), 600) * env_ad(np.ones(int(2.2 * SR)), 0.25, 1.7)) * 0.75


def sfx_menhir_fall():
    return norm(lp(noise(1.4), 300) * env_perc(1.4, 0.002, 6)
                + sine(45, 1.4) * env_perc(1.4, 0.001, 5))


def sfx_riddle_open():
    return norm(lp(noise(1.6), 500) * env_ad(np.ones(int(1.6 * SR)), 0.2, 1.2)) * 0.7


def sfx_aquarium_break():
    return norm(hp(noise(1.5), 2200) * env_perc(1.5, 0.001, 9)
                + bp(noise(1.5), 300, 1200) * env_perc(1.5, 0.02, 4) * 0.7)


def sfx_bucket_water():
    return norm(bp(noise(1.2), 250, 2200) * env_ad(np.ones(int(1.2 * SR)), 0.1, 0.9)) * 0.65


def sfx_cake_bite():
    return norm(bp(noise(0.3), 700, 3500) * env_perc(0.3, 0.002, 16)) * 0.6


def sfx_scale_shift():
    n = int(1.6 * SR)
    sweep = np.sin(2 * np.pi * np.cumsum(np.linspace(180, 900, n)) / SR)
    return norm(sweep * env_ad(np.ones(n), 0.2, 1.2)) * 0.6


def sfx_unicorn_whinny():
    n = int(1.0 * SR)
    sweep = np.sin(2 * np.pi * np.cumsum(np.linspace(700, 380, n)) / SR)
    return norm(hp(sweep * env_ad(np.ones(n), 0.05, 0.8), 300)) * 0.6


def sfx_genie_appear():
    return norm(bp(noise(1.8), 300, 4000) * env_ad(np.ones(int(1.8 * SR)), 0.4, 1.2)
                + sine(150, 1.8) * env_ad(np.ones(int(1.8 * SR)), 0.5, 1.1) * 0.5)


def sfx_demon_speak():
    return norm(lp(sine(58, 1.6) + sine(87, 1.6) * 0.6, 400)
                * env_ad(np.ones(int(1.6 * SR)), 0.2, 1.2)) * 0.8


def sfx_guardian_move():
    return norm(lp(noise(1.9), 420) * env_ad(np.ones(int(1.9 * SR)), 0.3, 1.4)) * 0.75


def sfx_palantir_hum():
    return norm(sine(196, 2.0) * 0.5 + sine(294, 2.0) * 0.3
                * env_ad(np.ones(int(2.0 * SR)), 0.6, 1.2)) * 0.55


def sfx_lizard_snap():
    return norm(bp(noise(0.25), 800, 4500) * env_perc(0.25, 0.001, 22)) * 0.7


def sfx_gnome_cough():
    return norm(bp(noise(0.4), 300, 1800) * env_perc(0.4, 0.01, 12)) * 0.5


def sfx_z2_victory():
    c = np.zeros(int(4.0 * SR))
    for f, at in [(D4, 0.0), (F4, 0.35), (A4, 0.7), (D5, 1.05)]:
        place(c, pluck(f, 2.6, 4200) * 0.4, at)
    place(c, pad_chord([D3, A3, D4, F4], 3.0, 1200,
                       amp=env_ad(np.ones(int(3 * SR)), 0.4, 2.2)) * 0.45, 1.0)
    return norm(reverb(c, 1.0, 0.35))


SFX = {
    "z2-wand-glow": sfx_wand_glow, "z2-spell-cast": sfx_spell_cast,
    "z2-spell-onset": sfx_spell_onset, "z2-spell-expire": sfx_spell_expire,
    "z2-wizard-vanish": sfx_wizard_vanish, "z2-carousel-stop": sfx_carousel_stop,
    "z2-glacier-melt": sfx_glacier_melt, "z2-ice-crack": sfx_ice_crack,
    "z2-safe-blast": sfx_safe_blast, "z2-balloon-burner": sfx_balloon_burner,
    "z2-balloon-rise": sfx_balloon_rise, "z2-cerberus-growl": sfx_cerberus_growl,
    "z2-dragon-roar": sfx_dragon_roar, "z2-dragon-fire": sfx_dragon_fire,
    "z2-robot-step": sfx_robot_step, "z2-robot-lift": sfx_robot_lift,
    "z2-curtain-pass": sfx_curtain_pass, "z2-chomper": sfx_chomper,
    "z2-menhir-grind": sfx_menhir_grind, "z2-menhir-fall": sfx_menhir_fall,
    "z2-riddle-open": sfx_riddle_open, "z2-aquarium-break": sfx_aquarium_break,
    "z2-bucket-water": sfx_bucket_water, "z2-cake-bite": sfx_cake_bite,
    "z2-scale-shift": sfx_scale_shift, "z2-unicorn-whinny": sfx_unicorn_whinny,
    "z2-genie-appear": sfx_genie_appear, "z2-demon-speak": sfx_demon_speak,
    "z2-guardian-move": sfx_guardian_move, "z2-palantir-hum": sfx_palantir_hum,
    "z2-lizard-snap": sfx_lizard_snap, "z2-gnome-cough": sfx_gnome_cough,
    "z2-victory": sfx_z2_victory,
}

if __name__ == "__main__":
    print("== zork ii music ==")
    for name, fn in BEDS.items():
        emit(name, loopify(fn(), 3.0), "music", gain=0.85)
    print("== zork ii sfx ==")
    for name, fn in SFX.items():
        emit(name, fn(), "sfx", gain=0.8)
    print(f"done: {len(BEDS)} beds, {len(SFX)} sfx")
