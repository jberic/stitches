/** Aida counts on offer: stitches per inch. 14 is the most common, and the default. */
export const FABRIC_COUNTS = [11, 14, 16, 18] as const
export type FabricCount = (typeof FABRIC_COUNTS)[number]
export const DEFAULT_FABRIC_COUNT: FabricCount = 14

const CM_PER_INCH = 2.54

export interface FinishedSize {
  cm: { width: number; height: number }
  inches: { width: number; height: number }
}

/** The stitched design's size on a fabric count (design only, no margin for framing). */
export function finishedSize(stitchesWide: number, stitchesHigh: number, count: number): FinishedSize {
  const round1 = (n: number) => Math.round(n * 10) / 10
  const inW = stitchesWide / count
  const inH = stitchesHigh / count
  return {
    cm: { width: round1(inW * CM_PER_INCH), height: round1(inH * CM_PER_INCH) },
    inches: { width: round1(inW), height: round1(inH) },
  }
}

export function isFabricCount(value: number): value is FabricCount {
  return (FABRIC_COUNTS as readonly number[]).includes(value)
}
