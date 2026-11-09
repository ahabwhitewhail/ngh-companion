import { randInt } from './cards'

/** One six-sided die from the platform's crypto source. */
export const d6 = () => randInt(6) + 1
export const rollN = (n: number) => Array.from({ length: Math.max(0, n) }, d6)
/** +One System, p.3: a die showing 5 or 6 is a success. */
export const isSuccess = (face: number) => face >= 5
export const countSuccesses = (faces: number[]) => faces.filter(isSuccess).length

export interface RollRecord {
  id: string
  t: number
  who: string          // soldier name or ''
  what: string         // label key or text
  whatKind: 'skill' | 'whisper' | 'free' | 'plain'
  faces: number[]
  auto: number         // automatic successes (Whisper costs, modifiers)
  successes: number
  tn: number | null
  manips: number       // manipulations spent
  cards: number        // cards played as +One
}
