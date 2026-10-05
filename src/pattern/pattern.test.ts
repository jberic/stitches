import { describe, expect, it } from 'vitest'
import { downsample, trimRows, type Mask } from './downsample'
import { apportion } from './layouts/stackedBlock'
import { parsePhrase } from './text'

describe('parsePhrase', () => {
  it('splits words into lines', () => {
    expect(parsePhrase('  Hello   sunshine  ')).toEqual({ ok: true, lines: ['Hello', 'sunshine'] })
  })

  it('rejects empty, too many words and too long', () => {
    expect(parsePhrase('   ')).toEqual({ ok: false, reason: 'empty' })
    expect(parsePhrase('a b c d e')).toEqual({ ok: false, reason: 'too-many-words' })
    expect(parsePhrase('x'.repeat(31))).toEqual({ ok: false, reason: 'too-long' })
  })
})

describe('apportion', () => {
  it('always uses exactly the columns given', () => {
    for (const total of [5, 17, 43, 80]) {
      const cols = apportion(total, [3, 1, 2, 2.5, 0.4])
      expect(cols.reduce((a, b) => a + b, 0)).toBe(total)
      expect(Math.min(...cols)).toBeGreaterThanOrEqual(1)
    }
  })

  it('is proportional and deterministic', () => {
    expect(apportion(10, [1, 1])).toEqual([5, 5])
    expect(apportion(10, [3, 1])).toEqual(apportion(10, [3, 1]))
  })

  it('does not hang when there are more letters than columns', () => {
    const cols = apportion(3, [1, 1, 1, 1, 1])
    expect(cols.every((c) => c === 1)).toBe(true)
  })
})

function maskFrom(rows: string[], scale: number): Mask {
  const width = rows[0].length * scale
  const height = rows.length * scale
  const data = new Uint8Array(width * height)
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch !== '#') return
      for (let dy = 0; dy < scale; dy++)
        for (let dx = 0; dx < scale; dx++) data[(y * scale + dy) * width + x * scale + dx] = 255
    }),
  )
  return { width, height, data }
}

describe('downsample', () => {
  it('maps fully inked blocks to stitches', () => {
    const cells = downsample(maskFrom(['#.', '.#'], 4), 4)
    expect([...cells]).toEqual([1, 0, 0, 1])
  })

  it('uses the coverage threshold', () => {
    const mask: Mask = { width: 2, height: 2, data: new Uint8Array([255, 255, 0, 0]) }
    expect([...downsample(mask, 2, 0.5)]).toEqual([1])
    expect([...downsample(mask, 2, 0.6)]).toEqual([0])
  })
})

describe('trimRows', () => {
  it('drops empty rows at the top and bottom only', () => {
    const cells = new Uint8Array([0, 0, 1, 0, 0, 0, 0, 1, 0, 0])
    const { cells: out, height } = trimRows(cells, 2)
    expect(height).toBe(3)
    expect([...out]).toEqual([1, 0, 0, 0, 0, 1])
  })
})
