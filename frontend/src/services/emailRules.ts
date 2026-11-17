// Browser persistence and validation for the ordered rules used by Inbox scans.
import type { EmailRule } from '../types/emailRule'

const STORAGE_KEY = 'ontrack-email-rules'

// Rules stay separate from general settings so they can be managed as an ordered list.
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isEmailRule = (value: unknown): value is EmailRule =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.enabled === 'boolean' &&
  ['sender', 'email', 'subject', 'body'].includes(String(value.field)) &&
  ['contains', 'regex'].includes(String(value.operator)) &&
  typeof value.pattern === 'string' &&
  typeof value.label === 'string'

// Enforce rule requirements shared by loading and saving, including regex syntax.
function validateRule(rule: unknown): asserts rule is EmailRule {
  if (!isEmailRule(rule)) {
    throw new Error('An email rule has an invalid format.')
  }

  if (!rule.pattern.trim() || !rule.label.trim()) {
    throw new Error('A rule needs both a pattern and a label.')
  }

  if (rule.pattern.length > 200) {
    throw new Error('Rule patterns must be 200 characters or fewer.')
  }

  if (rule.operator === 'regex') {
    try {
      new RegExp(rule.pattern, 'i')
    } catch {
      throw new Error(`The regex pattern "${rule.pattern}" is invalid.`)
    }
  }
}

/** Loads and validates saved rules; a browser with no saved rules starts empty. */
export function getEmailRules(): EmailRule[] {
  const savedRules = localStorage.getItem(STORAGE_KEY)

  if (!savedRules) {
    return []
  }

  let parsedRules: unknown
  try {
    parsedRules = JSON.parse(savedRules)
  } catch {
    throw new Error('Saved email rules could not be read.')
  }

  if (!Array.isArray(parsedRules)) {
    throw new Error('Saved email rules have an invalid format.')
  }

  parsedRules.forEach(validateRule)
  return parsedRules
}

/** Validates the full rule list before storing its order in browser storage. */
export function saveEmailRules(rules: EmailRule[]): void {
  rules.forEach(validateRule)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
}