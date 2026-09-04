// Zork II's spell system — the Wizard of Frobozz's twelve spells, and the
// player's own wand once they take it from him.
//
// This is an *effect layer*, not a room puzzle. Several spells rewrite core
// verb behaviour for a duration, which is why `,SPELL-USED` appears 26 times in
// the shared `gverbs.zil`: Feeble overrides carry capacity, Float suspends
// gravity (and kills you if it expires over water), Fumble injects random drops
// into ITAKE, Fierce overrides the sword glow, Freeze blocks movement. The
// shared verbs call into here rather than testing spell state inline, so the
// Zork I and III code paths never see any of it.
//
// Sources: `2actions.zil` I-WIZARD / I-SPELL / V-ENCHANT / V-DISENCHANT /
// V-INCANT and the SPELLS / SPELL-NAMES / SPELL-HINTS / SPELL-STOPS tables.

import type { WorldState } from './types';

/** `<CONSTANT S-FEEBLE 1>` ... `<CONSTANT S-FANTASIZE 12>`. */
export const SPELLS = [
  'FEEBLE', 'FUMBLE', 'FEAR', 'FILCH', 'FREEZE', 'FALL',
  'FERMENT', 'FIERCE', 'FLOAT', 'FIREPROOF', 'FENCE', 'FANTASIZE',
] as const;
export type Spell = (typeof SPELLS)[number];

/** The word the player can incant, and the Wizard's own vocabulary. */
export const SPELL_WORDS: readonly string[] = SPELLS.map((s) => s.toLowerCase());

/** `<GLOBAL SPELL-NAMES ...>` — display casing. */
export const SPELL_NAMES: Record<Spell, string> = {
  FEEBLE: 'Feeble', FUMBLE: 'Fumble', FEAR: 'Fear', FILCH: 'Filch',
  FREEZE: 'Freeze', FALL: 'Fall', FERMENT: 'Ferment', FIERCE: 'Fierce',
  FLOAT: 'Float', FIREPROOF: 'Fireproof', FENCE: 'Fence', FANTASIZE: 'Fantasize',
};

/** `<GLOBAL SPELL-HINTS ...>` — printed when a spell lands on the player. */
export const SPELL_HINTS: Partial<Record<Spell, string>> = {
  FEEBLE: 'All at once you feel very tired.',
  FEAR: 'You look at the Wizard in terror. You scramble away,\ntrying to get as far as possible from him.',
  FREEZE: "Your limbs suddenly feel like they have turned to stone. You can't\nmove a muscle.",
  FERMENT: 'You begin to feel lightheaded.',
  FIERCE: 'You rush at the Wizard, intending to tear him limb from limb.',
};

/** `<GLOBAL SPELL-STOPS ...>` — printed when it wears off. */
export const SPELL_STOPS: Partial<Record<Spell, string>> = {
  FEEBLE: 'You feel more energetic now.',
  FEAR: "You suddenly decide that the Wizard isn't that terrifying...",
  FREEZE: 'Your little finger begins to twitch, and then your whole body is free\nagain.',
  FERMENT: 'Your head is clearer now.',
  FIERCE: 'You feel cooler and less angry now.',
  FLOAT: 'You sink quietly down again.',
};

/** Spells that behave as a persistent condition on a target. */
const CONDITION_SPELLS: readonly Spell[] = [
  'FEEBLE', 'FUMBLE', 'FEAR', 'FREEZE', 'FALL', 'FERMENT', 'FIERCE', 'FENCE', 'FANTASIZE',
];

export function isConditionSpell(spell: Spell | null): boolean {
  return !!spell && CONDITION_SPELLS.includes(spell);
}

// ---------------------------------------------------------------------------
// State accessors. Spell state lives in WorldState so it saves and restores
// with everything else; these keep the string keys in one place.
// ---------------------------------------------------------------------------

/** `,SPELL?` — the spell currently afflicting the *player*, or null. */
export function activeSpell(s: WorldState): Spell | null {
  return (s.gflags['SPELL-ACTIVE'] ? (s.spell?.active ?? null) : null) as Spell | null;
}

/** `,SPELL-USED` — the spell word the player last incanted. */
export function spellUsed(s: WorldState): Spell | null {
  return (s.spell?.used ?? null) as Spell | null;
}

/** `,SPELL-VICTIM` — what the player's wand is pointed at. */
export function spellVictim(s: WorldState): string | null {
  return s.spell?.victim ?? null;
}

/** `,WAND-ON` — the object the wand is currently aimed at. */
export function wandOn(s: WorldState): string | null {
  return s.spell?.wandOn ?? null;
}

export function setSpellState(s: WorldState, patch: Partial<NonNullable<WorldState['spell']>>): void {
  s.spell = { ...(s.spell ?? {}), ...patch };
}

export function clearPlayerSpell(s: WorldState): void {
  setSpellState(s, { active: null });
  s.gflags['SPELL-ACTIVE'] = false;
}

// ---------------------------------------------------------------------------
// The hooks the shared verb library calls. Each corresponds to a
// `,ZORK-NUMBER 2` arm in gverbs.zil.
// ---------------------------------------------------------------------------

/**
 * ITAKE's Zork II arm: a floated or frozen object can't be picked up.
 * Returns the refusal message, or null to let the take proceed.
 */
export function takeBlockedBy(s: WorldState, obj: string): string | null {
  if (spellVictim(s) !== obj) return null;
  const used = spellUsed(s);
  if (used === 'FLOAT') return "You can't reach that. It's floating above your head.";
  if (used === 'FREEZE') return 'It seems rooted to the spot.';
  return null;
}

/** DESCRIBE-OBJECT's Zork II arm: a floated object is listed in midair. */
export function describeSuffix(s: WorldState, obj: string): string {
  return spellVictim(s) === obj && spellUsed(s) === 'FLOAT' ? ' (floating in midair)' : '';
}

/** Feeble halves what you can carry; I-WIZARD restores LOAD-ALLOWED on expiry. */
export function loadAllowed(s: WorldState, base: number): number {
  return activeSpell(s) === 'FEEBLE' ? Math.floor(base / 2) : base;
}

/** Freeze stops the player moving at all. */
export function movementBlocked(s: WorldState): string | null {
  return activeSpell(s) === 'FREEZE'
    ? "Your limbs are frozen; you can't move a muscle."
    : null;
}
