/** Seeded random numbers. The generator must only ever use these, never Math.random(). */

export type Random = () => number

/** mulberry32: small, fast, good enough for picking styles. Returns floats in [0, 1). */
export function mulberry32(seed: number): Random {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** FNV-1a: turns any string into a 32-bit seed. */
export function hashString(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function randomFor(...parts: (string | number)[]): Random {
  return mulberry32(hashString(parts.join(':')))
}

export function pick<T>(rng: Random, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]
}

export function between(rng: Random, min: number, max: number): number {
  return min + rng() * (max - min)
}

const SEED_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'
export const SEED_LENGTH = 5

/** A fresh seed code for "Generate again". Uses the browser's crypto, outside the generator. */
export function newSeed(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(SEED_LENGTH))
  return [...bytes].map((b) => SEED_ALPHABET[b % SEED_ALPHABET.length]).join('')
}

export function isSeed(value: string | null): value is string {
  return value !== null && /^[0-9a-z]{1,12}$/.test(value)
}
