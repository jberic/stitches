import { describe, expect, it } from 'vitest'
import { hashString, isSeed, mulberry32, newSeed } from './random'
import type { LegibilityCheck } from './legibility'
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

const result = (tooHeavy: boolean, tooLight: boolean) =>
  ({ ok: false, reasons: [], penalty: 1, tooHeavy, tooLight, metrics: {} }) as unknown as LegibilityCheck

describe('recipeFor', () => {
  it('raises the threshold after a too-heavy result and lowers it after a too-light one', () => {
    const first = recipeFor('adapt')
    expect(recipeFor('adapt', 1, { recipe: first, check: result(true, false) }).threshold).toBeGreaterThan(first.threshold)
    expect(recipeFor('adapt', 1, { recipe: first, check: result(false, true) }).threshold).toBeLessThan(first.threshold)
  })

  it('tightens letter spacing when letters were too heavy', () => {
    const airy = { ...recipeFor('adapt'), letterGap: 2 }
    expect(recipeFor('adapt', 1, { recipe: airy, check: result(true, false) }).letterGap).toBe(1)
  })

  it('is deterministic per seed and attempt', () => {
    expect(recipeFor('k3j9a', 0)).toEqual(recipeFor('k3j9a', 0))
    expect(recipeFor('k3j9a', 3)).toEqual(recipeFor('k3j9a', 3))
  })

  it('keeps the font for the first retries', () => {
    const font = recipeFor('abcde').font
    expect(recipeFor('abcde', 1).font).toBe(font)
    expect(recipeFor('abcde', 2).font).toBe(font)
  })

  it('switches font on the later retries, except a wavy seed first tries its own font as stacked block', () => {
    for (let s = 0; s < 50; s++) {
      const first = recipeFor(`r${s}`)
      if (first.layout === 'wavy') expect(recipeFor(`r${s}`, 3).font).toBe(first.font)
      else expect(recipeFor(`r${s}`, 3).font).not.toBe(first.font)
      expect(recipeFor(`r${s}`, 4).font).not.toBe(first.font)
    }
  })

  it('stays inside the ranges that keep letters readable', () => {
    for (let s = 0; s < 200; s++) {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const r = recipeFor(`s${s}`, attempt)
        expect(r.letterAspect).toBeGreaterThanOrEqual(1.25)
        expect(r.letterAspect).toBeLessThanOrEqual(1.9)
        expect([1, 2]).toContain(r.letterGap)
        expect([1, 2, 3]).toContain(r.lineGap)
        expect(r.wave !== null).toBe(r.layout === 'wavy')
        expect(r.threshold).toBeGreaterThanOrEqual(0.38)
        expect(r.threshold).toBeLessThanOrEqual(0.66)
      }
    }
  })

  it('spreads fonts across seeds', () => {
    const fonts = new Set(Array.from({ length: 40 }, (_, i) => recipeFor(`f${i}`).font))
    expect(fonts.size).toBe(4)
  })

  it('names the style in plain words', () => {
    const plain = { ...recipeFor('x'), layout: 'stacked-block', wave: null, icon: null, shadow: false } as const
    expect(describeRecipe({ ...plain, font: 'Chango', letterAspect: 1.8, letterGap: 1 })).toBe(
      'Stacked block · Chango · tall letters',
    )
    expect(describeRecipe({ ...plain, layout: 'wavy', font: 'Shrikhand', icon: 'lemon', shadow: true })).toBe(
      'Wavy · Shrikhand · with a shadow and a lemon slice',
    )
  })

  it('uses both layouts, and gives every wavy recipe a warp', () => {
    const recipes = Array.from({ length: 60 }, (_, i) => recipeFor(`l${i}`))
    expect(new Set(recipes.map((r) => r.layout))).toEqual(new Set(['stacked-block', 'wavy']))
    for (const r of recipes) expect(r.wave !== null).toBe(r.layout === 'wavy')
  })

  it('keeps the icon and shadow across retries, so a seed keeps its character', () => {
    for (let s = 0; s < 30; s++) {
      const first = recipeFor(`c${s}`)
      for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt++) {
        expect(recipeFor(`c${s}`, attempt).icon).toBe(first.icon)
        expect(recipeFor(`c${s}`, attempt).shadow).toBe(first.shadow)
      }
    }
  })

  it('falls back to stacked block for the last two attempts', () => {
    for (let s = 0; s < 30; s++) {
      expect(recipeFor(`f${s}`, 3).layout).toBe('stacked-block')
      expect(recipeFor(`f${s}`, 4).layout).toBe('stacked-block')
    }
  })

  it('calms the warp after a too-heavy wavy attempt', () => {
    const wavy = Array.from({ length: 60 }, (_, i) => `w${i}`).find((seed) => recipeFor(seed).layout === 'wavy')!
    const first = recipeFor(wavy)
    const next = recipeFor(wavy, 1, { recipe: first, check: result(true, false) })
    expect(next.wave!.ay).toBeLessThan(first.wave!.ay)
  })
})
