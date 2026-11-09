// Game data for Never Going Home (Wet Ink Games, +One System).
// Every number here is taken from the core rulebook; page refs are book pages.

export type AttrKey = 'brawn' | 'smarts' | 'guts'
export const ATTRS: AttrKey[] = ['brawn', 'smarts', 'guts']

/** Character Creation, p.24: divide 10 points, min 1 each. Average human 3, peak 6, >6 superhuman. */
export const CREATION = { attrPoints: 10, attrMin: 1, trainedSkills: 3, skillDice: 3, startCards: 3 }
/** Paper sheet has 20 boxes per attribute; pips per skill: 5. */
export const ATTR_TRACK = 10
export const SKILL_MAX = 5
export const CORRUPTION_MAX = 5
export const HAND_MAX = 7

export type SkillKey =
  | 'athletics' | 'melee' | 'stealth'
  | 'communication' | 'knowledge' | 'mechanics'
  | 'investigation' | 'ranged' | 'transport'

/** Skill list, p.26: each skill is governed by one attribute. */
export const SKILLS: { key: SkillKey; attr: AttrKey }[] = [
  { key: 'athletics', attr: 'brawn' },
  { key: 'melee', attr: 'brawn' },
  { key: 'stealth', attr: 'brawn' },
  { key: 'communication', attr: 'smarts' },
  { key: 'knowledge', attr: 'smarts' },
  { key: 'mechanics', attr: 'smarts' },
  { key: 'investigation', attr: 'guts' },
  { key: 'ranged', attr: 'guts' },
  { key: 'transport', attr: 'guts' },
]

export type PathKey = 'bloodRites' | 'rottenTricks' | 'oldWays' | 'elemental' | 'healingWords' | 'chaosSongs'

/** Whisper Paths, pp.15–22. One ritual per point of training in the Path. */
export const PATHS: { key: PathKey; attr: AttrKey; rituals: string[] }[] = [
  { key: 'bloodRites', attr: 'brawn', rituals: ['strength', 'scabs', 'speed', 'interject', 'bloodBlade', 'bloodDouble'] },
  { key: 'rottenTricks', attr: 'brawn', rituals: ['stillAir', 'wretch', 'poison', 'smoke', 'strangeWind', 'swampGas'] },
  { key: 'oldWays', attr: 'smarts', rituals: ['wolfsHead', 'hartsHooves', 'befriend', 'sickness', 'healingCircle', 'grove'] },
  { key: 'elemental', attr: 'smarts', rituals: ['fire', 'water', 'earth', 'air', 'star', 'mentalAnguish'] },
  { key: 'healingWords', attr: 'guts', rituals: ['bodyHeal', 'mindRest', 'spiritCharge', 'holiday', 'mercyAura', 'senseCorruption'] },
  { key: 'chaosSongs', attr: 'guts', rituals: ['makeThemFlee', 'holdThemFast', 'putThemOff', 'drawTheirIre', 'stareThemDown', 'stealTheirDreams'] },
]
export const pathOf = (k: string) => PATHS.find(p => p.key === k)

/** Corruption draw on earning the 3rd, 4th and 5th training point in each Whisper Path (p.65). */
export const WHISPER_CORRUPTION_PIPS = [3, 4, 5]

export type AbilityKey = 'dmg' | 'aim' | 'assault' | 'critical' | 'flurry' | 'fragmentation' | 'spray' | 'stun' | 'wreck'
export type WeaponKey = 'knife' | 'club' | 'sword' | 'axe' | 'staff' | 'pistol' | 'rifle' | 'machineGun' | 'grenade'

/** Weapons table, p.11. Ability cost = extra successes over the hit TN. */
export const WEAPONS: { key: WeaponKey; skill: SkillKey; dmg: number; ab: [AbilityKey, number][] }[] = [
  { key: 'knife', skill: 'melee', dmg: 1, ab: [['dmg', 2]] },
  { key: 'club', skill: 'melee', dmg: 1, ab: [['dmg', 2], ['stun', 3]] },
  { key: 'sword', skill: 'melee', dmg: 1, ab: [['dmg', 2], ['assault', 3]] },
  { key: 'axe', skill: 'melee', dmg: 1, ab: [['dmg', 2], ['wreck', 3]] },
  { key: 'staff', skill: 'melee', dmg: 1, ab: [['dmg', 2], ['flurry', 3]] },
  { key: 'pistol', skill: 'ranged', dmg: 2, ab: [['critical', 3]] },
  { key: 'rifle', skill: 'ranged', dmg: 2, ab: [['critical', 3], ['aim', 1]] },
  { key: 'machineGun', skill: 'ranged', dmg: 2, ab: [['critical', 3], ['spray', 2]] },
  { key: 'grenade', skill: 'ranged', dmg: 1, ab: [['dmg', 1], ['fragmentation', 3]] },
]
export const weaponOf = (k: string) => WEAPONS.find(w => w.key === k)

/** Fists depend on Brawn: <3 → 0, 3–7 → 1, >7 → 2; always +1 damage (2). */
export const fistDamage = (brawn: number) => (brawn < 3 ? 0 : brawn <= 7 ? 1 : 2)

/** Nine national profiles (pp.37–56). */
export const NATIONS = ['france', 'britain', 'russia', 'italy', 'usa', 'germany', 'austria', 'ottoman', 'bulgaria'] as const

/** Character Growth, p.27. */
export const cost = {
  /** n-th skill beyond the starting three costs 1+n cards */
  newSkill: (extraSkillsAfter: number) => 1 + extraSkillsAfter,
  /** filling pip N costs 1+N cards */
  skillPip: (newPip: number) => 1 + newPip,
  /** new attribute rank N costs 1+N red cards */
  attrRank: (newRank: number) => 1 + newRank,
}
