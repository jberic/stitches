import { ALPHABETS } from '../data/alphabets'
import { describe, expect, it } from 'vitest'
import { hashString, isSeed, mulberry32, newSeed } from './random'
import type { LegibilityCheck } from './legibility'
import { ICON_SETS } from '../data/icons'
import { CAPITALS_ONLY, PATTERN_FONTS, SCRIPT_FONTS } from '../fonts'
import { MAX_ATTEMPTS, describeRecipe, recipeFor, textCase } from './recipe'

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

  it('falls back to the Block alphabet, then to a font: another one, or an alphabet seed its own', () => {
    for (let s = 0; s < 50; s++) {
      const first = recipeFor(`r${s}`)
      expect(recipeFor(`r${s}`, 3).alphabet).toBe('block')
      const last = recipeFor(`r${s}`, 4)
      expect(last.alphabet).toBeNull()
      if (first.alphabet) expect(last.font).toBe(first.font)
      else expect(last.font).not.toBe(first.font)
    }
  })

  it('stays inside the ranges that keep letters readable', () => {
    for (let s = 0; s < 200; s++) {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const r = recipeFor(`s${s}`, attempt)
        expect(r.letterAspect).toBeGreaterThanOrEqual(1.25)
        expect(r.letterAspect).toBeLessThanOrEqual(1.9)
        expect([1, 2]).toContain(r.letterGap)
        expect([1, 2]).toContain(r.lineGap)
        expect(r.threshold).toBeGreaterThanOrEqual(0.38)
        expect(r.threshold).toBeLessThanOrEqual(0.66)
      }
    }
  })

  it('spreads the pattern fonts across seeds, and never picks Chango', () => {
    const fonts = new Set(Array.from({ length: 40 }, (_, i) => recipeFor(`f${i}`).font))
    expect([...fonts].sort()).toEqual([...PATTERN_FONTS].sort())
  })

  it('lets Slab set a typed phrase in capitals', () => {
    const mixed = { motif: 'any', letterCase: 'mixed' } as const
    let slabs = 0
    for (let s = 0; s < 200; s++) {
      const m = recipeFor(`a${s}`, 0, undefined, mixed)
      if (m.alphabet && !ALPHABETS[m.alphabet].lowercase) {
        if (m.alphabet === 'slab') slabs++
        expect([m.letterCase, m.capitalsFrom, describeRecipe(m).includes('set in capitals')]).toEqual(['upper', 'mixed', true])
      } else expect(m.capitalsFrom).toBeNull()
    }
    // One of 21 alphabets, so a handful in 200 seeds.
    expect(slabs).toBeGreaterThan(2)
  })

  it('gives a fallback font back the case the phrase was typed in', () => {
    const mixed = { motif: 'any', letterCase: 'mixed' } as const
    const seed = Array.from({ length: 200 }, (_, i) => `b${i}`).find(
      (s) => recipeFor(s, 0, undefined, mixed).alphabet === 'slab',
    )!
    const first = recipeFor(seed, 0, undefined, mixed)
    const unsupported = { ...result(false, false), unsupported: true }
    // First a compact alphabet, in the typed case unless it is capitals-only (and then it says so).
    const compact = recipeFor(seed, 1, { recipe: first, check: unsupported }, mixed)
    expect(['serif', 'sampler', 'block', 'typewriter']).toContain(compact.alphabet)
    expect(compact.capitalsFrom ?? compact.letterCase).toBe('mixed')
    // If that can't draw it either, a font in the typed case.
    const font = recipeFor(seed, 2, { recipe: compact, check: unsupported }, mixed)
    expect([font.alphabet, font.letterCase, font.capitalsFrom]).toEqual([null, 'mixed', null])
    expect([recipeFor(seed, 3, undefined, mixed).letterCase, recipeFor(seed, 4, undefined, mixed).letterCase]).toEqual([
      'mixed',
      'mixed',
    ])
  })

  it('only picks effects that are in the mix and suit the alphabet', () => {
    for (let s = 0; s < 200; s++) {
      const r = recipeFor(`e${s}`, 0, undefined, { motif: 'any', letterCase: 'upper' })
      expect(['none', 'shadow']).toContain(r.effect)
      if (r.alphabet === 'sampler' || !r.alphabet) expect(r.effect).toBe('none')
    }
  })

  it('names the style in plain words', () => {
    const plain = { ...recipeFor('x'), icon: null, effect: 'none', alphabet: null } as const
    expect(describeRecipe({ ...plain, font: 'Chango', letterAspect: 1.8, letterGap: 1 })).toBe('Chango · tall letters')
    expect(
      describeRecipe({ ...plain, font: 'Shrikhand', icon: 'lemon', effect: 'shadow', letterAspect: 1.5, letterGap: 1 }),
    ).toBe('Shrikhand · with a shadow and a lemon slice')
  })

  it('follows the motif choice', () => {
    for (let s = 0; s < 40; s++) {
      const motif = (m: 'none' | 'nature' | 'food') => ({ motif: m, letterCase: 'upper' }) as const
      expect(recipeFor(`m${s}`, 0, undefined, motif('none')).icon).toBeNull()
      expect(ICON_SETS.nature).toContain(recipeFor(`m${s}`, 0, undefined, motif('nature')).icon)
      expect(ICON_SETS.food).toContain(recipeFor(`m${s}`, 0, undefined, motif('food')).icon)
    }
  })

  it('changes only the icon when the motif changes', () => {
    for (let s = 0; s < 40; s++) {
      const { icon: _a, ...any } = recipeFor(`m${s}`, 0, undefined, { motif: 'any', letterCase: 'upper' })
      const { icon: _b, ...food } = recipeFor(`m${s}`, 0, undefined, { motif: 'food', letterCase: 'upper' })
      // Ornamented capitals come plain when a food icon is wanted; nothing else moves.
      if (any.alphabet && ALPHABETS[any.alphabet].ornamented)
        expect(food.alphabet).toBe(
          ({ checker: 'slab', hollow: 'slab', assisi: 'block' } as Record<string, string>)[any.alphabet] ?? 'sampler',
        )
      expect({ ...food, alphabet: null }).toEqual({ ...any, alphabet: null })
    }
  })

  it('never uses a capitals-only font for lowercase, even on retries', () => {
    for (let s = 0; s < 60; s++) {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const r = recipeFor(`lc${s}`, attempt, undefined, { motif: 'any', letterCase: 'lower' })
        expect(r.font).not.toBe('Rubik Mono One')
        // Only Slab may set it in capitals, and then it says so.
        expect(r.capitalsFrom ?? r.letterCase).toBe('lower')
        if (!r.alphabet || ALPHABETS[r.alphabet].lowercase) expect(r.letterCase).toBe('lower')
        const forced = recipeFor(`lc${s}`, attempt, undefined, { motif: 'any', letterCase: 'lower', caseForced: true })
        expect([forced.letterCase, !!forced.alphabet && !ALPHABETS[forced.alphabet].lowercase]).toEqual(['lower', false])
      }
    }
  })

  it('keeps the icon across retries, and the effect while it stays a stitch alphabet', () => {
    for (let s = 0; s < 30; s++) {
      const first = recipeFor(`c${s}`)
      for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt++) {
        const next = recipeFor(`c${s}`, attempt)
        // Ornamented letters have no icon; a fallback gets the seed's icon back.
        if (!first.alphabet || !ALPHABETS[first.alphabet].ornamented) expect(next.icon).toBe(first.icon)
        if (next.alphabet) expect(next.effect).toBe(first.effect)
      }
    }
  })

  it('gives display fonts room and no effect', () => {
    for (let s = 0; s < 60; s++) {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const r = recipeFor(`g${s}`, attempt)
        if (r.alphabet) continue
        expect(r.effect).toBe('none')
        expect(r.letterGap).toBeGreaterThanOrEqual(2)
        expect(r.lineGap).toBeGreaterThanOrEqual(2)
      }
    }
  })
})

describe('textCase', () => {
  it('keeps the case as typed, and forces it when asked', () => {
    expect(textCase(['Sun'], 'typed')).toBe('mixed')
    expect(textCase(['SUN'], 'typed')).toBe('upper')
    expect(textCase(['sun'], 'typed')).toBe('lower')
    expect(textCase(['Sun'], 'upper')).toBe('upper')
    expect(textCase(['Sun'], 'lower')).toBe('lower')
    expect(textCase(['42!'], 'typed')).toBe('upper')
  })

  it('never picks a capitals-only font when the phrase has lowercase', () => {
    for (let s = 0; s < 40; s++) {
      expect(CAPITALS_ONLY).not.toContain(recipeFor(`tc${s}`, 0, undefined, { motif: 'any', letterCase: 'mixed' }).font)
    }
  })
})

describe('script fonts set too small', () => {
  it('switch to a font that is not a script, keeping the style', () => {
    const choices = { motif: 'any', letterCase: 'mixed' } as const
    const first = { ...recipeFor('small', 0, undefined, choices), font: 'Shrikhand' as const }
    const next = recipeFor('small', 1, { recipe: first, check: { ...result(false, false), tooSmall: true } }, choices)
    expect(SCRIPT_FONTS).not.toContain(next.font)
    expect(CAPITALS_ONLY).not.toContain(next.font)
    expect({ ...next, font: first.font, threshold: first.threshold }).toEqual(first)
  })
})

describe('ornamented alphabets', () => {
  it('get no icon or effect, and give way to Sampler when a Nature or Food icon is wanted', () => {
    let seen = 0
    for (let s = 0; s < 300; s++) {
      const r = recipeFor(`o${s}`, 0, undefined, { motif: 'any', letterCase: 'upper' })
      if (r.alphabet === 'sprig' || r.alphabet === 'daisy') {
        seen++
        expect([r.icon, r.effect]).toEqual([null, 'none'])
        const nature = recipeFor(`o${s}`, 0, undefined, { motif: 'nature', letterCase: 'upper' })
        expect(nature.alphabet).toBe('sampler')
        expect(nature.icon).not.toBeNull()
      }
    }
    expect(seen).toBeGreaterThan(20)
  })
})
