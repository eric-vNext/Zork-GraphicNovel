// Verbatim combat flavor text, ported directly from the melee message tables
// in 1actions.zil (HERO-MELEE, TROLL-MELEE, THIEF-MELEE). Every line here is
// original Infocom text — nothing paraphrased or invented. {WEP} substitutes
// the weapon name, {DEF} substitutes the defender's name.

export type Outcome = 'MISSED' | 'UNCONSCIOUS' | 'KILLED' | 'LIGHT_WOUND' | 'SERIOUS_WOUND' | 'STAGGER' | 'LOSE_WEAPON' | 'HESITATE' | 'SITTING_DUCK';

export type MeleeTable = Record<Outcome, string[]>;

// The player's own swing, landing on a villain (F-WEP = player's weapon, F-DEF = villain).
export const HERO_MELEE: MeleeTable = {
  MISSED: [
    'Your {WEP} misses the {DEF} by an inch.',
    'A good slash, but it misses the {DEF} by a mile.',
    'You charge, but the {DEF} jumps nimbly aside.',
    'Clang! Crash! The {DEF} parries.',
    'A quick stroke, but the {DEF} is on guard.',
    "A good stroke, but it's too slow; the {DEF} dodges.",
  ],
  UNCONSCIOUS: [
    'Your {WEP} crashes down, knocking the {DEF} into dreamland.',
    'The {DEF} is battered into unconsciousness.',
    'A furious exchange, and the {DEF} is knocked out!',
    'The haft of your {WEP} knocks out the {DEF}.',
    'The {DEF} is knocked out!',
  ],
  KILLED: [
    "It's curtains for the {DEF} as your {WEP} removes his head.",
    'The fatal blow strikes the {DEF} square in the heart: He dies.',
    'The {DEF} takes a fatal blow and slumps to the floor dead.',
  ],
  LIGHT_WOUND: [
    'The {DEF} is struck on the arm; blood begins to trickle down.',
    "Your {WEP} pinks the {DEF} on the wrist, but it's not serious.",
    'Your stroke lands, but it was only the flat of the blade.',
    "The blow lands, making a shallow gash in the {DEF}'s arm!",
  ],
  SERIOUS_WOUND: [
    'The {DEF} receives a deep gash in his side.',
    'A savage blow on the thigh! The {DEF} is stunned but can still fight!',
    'Slash! Your blow lands! That one hit an artery, it could be serious!',
    'Slash! Your stroke connects! This could be serious!',
  ],
  STAGGER: [
    'The {DEF} is staggered, and drops to his knees.',
    "The {DEF} is momentarily disoriented and can't fight back.",
    'The force of your blow knocks the {DEF} back, stunned.',
    "The {DEF} is confused and can't fight back.",
    'The quickness of your thrust knocks the {DEF} back, stunned.',
  ],
  LOSE_WEAPON: [
    "The {DEF}'s weapon is knocked to the floor, leaving him unarmed.",
    'The {DEF} is disarmed by a subtle feint past his guard.',
  ],
  HESITATE: [],
  SITTING_DUCK: [],
};

// The troll's counter-swing, landing on the player (F-WEP = player's weapon/arm).
export const TROLL_MELEE: MeleeTable = {
  MISSED: [
    'The troll swings his axe, but it misses.',
    "The troll's axe barely misses your ear.",
    'The axe sweeps past as you jump aside.',
    'The axe crashes against the rock, throwing sparks!',
  ],
  UNCONSCIOUS: [
    'The flat of the troll\'s axe hits you delicately on the head, knocking\nyou out.',
  ],
  KILLED: [
    'The troll neatly removes your head.',
    "The troll's axe stroke cleaves you from the nave to the chops.",
    "The troll's axe removes your head.",
  ],
  LIGHT_WOUND: [
    'The axe gets you right in the side. Ouch!',
    "The flat of the troll's axe skins across your forearm.",
    "The troll's swing almost knocks you over as you barely parry\nin time.",
    'The troll swings his axe, and it nicks your arm as you dodge.',
  ],
  SERIOUS_WOUND: [
    'The troll charges, and his axe slashes you on your {WEP} arm.',
    'An axe stroke makes a deep wound in your leg.',
    "The troll's axe swings down, gashing your shoulder.",
  ],
  STAGGER: [
    'The troll hits you with a glancing blow, and you are momentarily\nstunned.',
    'The troll swings; the blade turns on your armor but crashes\nbroadside into your head.',
    'You stagger back under a hail of axe strokes.',
    "The troll's mighty blow drops you to your knees.",
  ],
  LOSE_WEAPON: [
    'The axe hits your {WEP} and knocks it spinning.',
    'The troll swings, you parry, but the force of his blow knocks your {WEP} away.',
    'The axe knocks your {WEP} out of your hand. It falls to the floor.',
  ],
  HESITATE: [
    'The troll hesitates, fingering his axe.',
    'The troll scratches his head ruminatively: Might you be magically\nprotected, he wonders?',
  ],
  SITTING_DUCK: [
    'Conquering his fears, the troll puts you to death.',
  ],
};

// The thief's counter-strike, landing on the player (F-WEP = player's weapon).
export const THIEF_MELEE: MeleeTable = {
  MISSED: [
    'The thief stabs nonchalantly with his stiletto and misses.',
    'You dodge as the thief comes in low.',
    'You parry a lightning thrust, and the thief salutes you with\na grim nod.',
    'The thief tries to sneak past your guard, but you twist away.',
  ],
  UNCONSCIOUS: [
    'Shifting in the midst of a thrust, the thief knocks you unconscious\nwith the haft of his stiletto.',
    'The thief knocks you out.',
  ],
  KILLED: [
    'Finishing you off, the thief inserts his blade into your heart.',
    'The thief comes in from the side, feints, and inserts the blade\ninto your ribs.',
    'The thief bows formally, raises his stiletto, and with a wry grin,\nends the battle and your life.',
  ],
  LIGHT_WOUND: [
    'A quick thrust pinks your left arm, and blood starts to\ntrickle down.',
    'The thief draws blood, raking his stiletto across your arm.',
    'The stiletto flashes faster than you can follow, and blood wells\nfrom your leg.',
    'The thief slowly approaches, strikes like a snake, and leaves\nyou wounded.',
  ],
  SERIOUS_WOUND: [
    'The thief strikes like a snake! The resulting wound is serious.',
    'The thief stabs a deep cut in your upper arm.',
    'The stiletto touches your forehead, and the blood obscures your\nvision.',
    'The thief strikes at your wrist, and suddenly your grip is slippery\nwith blood.',
  ],
  STAGGER: [
    'The butt of his stiletto cracks you on the skull, and you stagger\nback.',
    'The thief rams the haft of his blade into your stomach, leaving\nyou out of breath.',
    'The thief attacks, and you fall back desperately.',
  ],
  LOSE_WEAPON: [
    'A long, theatrical slash. You catch it on your {WEP}, but the\nthief twists his knife, and the {WEP} goes flying.',
    'The thief neatly flips your {WEP} out of your hands, and it drops\nto the floor.',
    'You parry a low thrust, and your {WEP} slips out of your hand.',
  ],
  HESITATE: [
    'The thief, a man of superior breeding, pauses for a moment to consider the propriety of finishing you off.',
    'The thief amuses himself by searching your pockets.',
    'The thief entertains himself by rifling your pack.',
  ],
  SITTING_DUCK: [
    "The thief, forgetting his essentially genteel upbringing, cuts your\nthroat.",
    'The thief, a pragmatist, dispatches you as a threat to his\nlivelihood.',
  ],
};

export function meleeLine(rng: () => number, table: MeleeTable, outcome: Outcome, wep: string, def: string): string {
  const pool = table[outcome];
  const line = pool[Math.floor(rng() * pool.length)] ?? pool[0];
  return line.replace(/\{WEP\}/g, wep).replace(/\{DEF\}/g, def).replace(/\n/g, ' ');
}
