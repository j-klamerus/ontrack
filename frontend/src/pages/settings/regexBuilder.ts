// Shared phrase-to-regex helpers for category and priority rule forms.

/** Escapes user-entered phrase text so it is matched literally in a generated regex. */
export const escapeRegexLiteral = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Builds an alternation from comma/newline-separated phrases, optionally word-bounded. */
export const buildRegexFromPhrases = (value: string, wholeWords: boolean): string => {
  const phrases = value
    .split(/[,\n]+/)
    .map((phrase) => phrase.trim())
    .filter(Boolean)

  if (phrases.length === 0) {
    return ''
  }

  const alternatives = phrases.map((phrase) => {
    const escapedPhrase = phrase.split(/\s+/).map(escapeRegexLiteral).join('\\s+')
    if (!wholeWords) {
      return escapedPhrase
    }

    const startBoundary = /^\w/.test(phrase) ? '\\b' : ''
    const endBoundary = /\w$/.test(phrase) ? '\\b' : ''
    return `${startBoundary}${escapedPhrase}${endBoundary}`
  })

  return `(?:${alternatives.join('|')})`
}
