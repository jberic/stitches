/**
 * Custom events for Plausible (the script is in index.html). Set up a goal in
 * Plausible for each event name to see it on the dashboard. Nothing personal
 * is sent: never the words someone types, only which settings they used.
 */

type Props = Record<string, string | number>

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Props }) => void
  }
}

export type AnalyticsEvent = 'Download' | 'Style'

/** Sends one event; does nothing if Plausible isn't loaded (blocked, offline or in development). */
export function track(event: AnalyticsEvent, props: Props) {
  try {
    window.plausible?.(event, { props })
  } catch {
    // Analytics must never break the tool.
  }
}
