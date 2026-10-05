export const MAX_WORDS = 4
export const MAX_CHARS = 30

export type PhraseResult =
  | { ok: true; lines: string[] }
  | { ok: false; reason: 'empty' | 'too-many-words' | 'too-long' }

/** Words become lines. Whitespace of any kind separates words. */
export function parsePhrase(input: string): PhraseResult {
  const text = input.normalize('NFC').trim()
  if (text === '') return { ok: false, reason: 'empty' }
  if (text.length > MAX_CHARS) return { ok: false, reason: 'too-long' }
  const lines = text.split(/\s+/u)
  if (lines.length > MAX_WORDS) return { ok: false, reason: 'too-many-words' }
  return { ok: true, lines }
}

export const PHRASE_MESSAGES: Record<Exclude<PhraseResult, { ok: true }>['reason'], string> = {
  empty: 'Type a word or two to start.',
  'too-many-words': `Up to ${MAX_WORDS} words fit on a pattern.`,
  'too-long': `Keep it to ${MAX_CHARS} letters or fewer.`,
}
