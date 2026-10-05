import { describe, expect, it } from 'vitest'
import { hashString, isSeed, mulberry32, newSeed } from './random'
import { MAX_ATTEMPTS, describeRecipe, recipeFor } from './recipe'

describe('mulberry32', () => {
  it('repeats exactly for the same seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const run = (r: () => number) => Array.from({ length: 5 }, r)
    expect(run(a)).toEqual(run(b))
  })

  it('stays in [0, 1)', () => {
    const r = mulberry32(hashString('range'))
    for (let i = 0; i < 1000; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('seeds', () => {
  it('makes short codes that pass validation', () => {
    for (let i = 0; i < 20; i++) expect(isSeed(newSeed())).toBe(true)
    expect(isSeed('Hello!')).toBe(false)
    expect(isSeed(null)).toBe(false)
  })
})

describe('recipeFor', () => {
  it('is deterministic per seed and attempt', () => {
    expect(recipeFor('k3j9a', 0)).toEqual(recipeFor('k3j9a', 0))
    expect(recipeFor('k3j9a', 3)).toEqual(recipeFor('k3j9a', 3))
  })

  it('keeps the font for the first retries', () => {
    const font = recipeFor('abcde').font
    expect(recipeFor('abcde', 1).font).toBe(font)
    expect(recipeFor('abcde', 2).font).toBe(font)
  })

  it('stays inside the ranges that keep letters readable', () => {
    for (let s = 0; s < 200; s++) {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const r = recipeFor(`s${s}`, attempt)
        expect(r.letterAspect).toBeGreaterThanOrEqual(1)
        expect(r.letterAspect).toBeLessThanOrEqual(1.9)
        expect([1, 2]).toContain(r.letterGap)
        expect([1, 2]).toContain(r.lineGap)
        expect(r.threshold).toBeGreaterThanOrEqual(0.44)
        expect(r.threshold).toBeLessThanOrEqual(0.56)
      }
    }
  })

  it('spreads fonts across seeds', () => {
    const fonts = new Set(Array.from({ length: 40 }, (_, i) => recipeFor(`f${i}`).font))
    expect(fonts.size).toBe(4)
  })

  it('names the style in plain words', () => {
    expect(describeRecipe({ ...recipeFor('x'), font: 'Chango', letterAspect: 1.8, letterGap: 1 })).toBe(
      'Stacked block · Chango · tall letters',
    )
  })
})
