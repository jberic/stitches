import { describe, expect, it } from 'vitest'
import { finishedSize, isFabricCount } from './size'

describe('finishedSize', () => {
  it('converts stitches to centimetres and inches for the fabric count', () => {
    // 14 stitches = 1 inch = 2.54 cm on 14-count.
    expect(finishedSize(14, 28, 14)).toEqual({ cm: { width: 2.5, height: 5.1 }, inches: { width: 1, height: 2 } })
    expect(finishedSize(50, 34, 14)).toEqual({ cm: { width: 9.1, height: 6.2 }, inches: { width: 3.6, height: 2.4 } })
  })

  it('gets smaller as the count goes up', () => {
    expect(finishedSize(50, 34, 18).cm.width).toBeLessThan(finishedSize(50, 34, 11).cm.width)
  })
})

describe('isFabricCount', () => {
  it('accepts only the counts on offer', () => {
    expect(isFabricCount(14)).toBe(true)
    expect(isFabricCount(13)).toBe(false)
  })
})
