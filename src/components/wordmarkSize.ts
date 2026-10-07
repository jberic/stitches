/**
 * The widest the wordmark is ever shown: large during the intro, then scaled
 * down into the header. Drawing at this size keeps it sharp all the way.
 */
export function introWordmarkWidth(): number {
  return Math.min(window.innerWidth - 32, 1100)
}
