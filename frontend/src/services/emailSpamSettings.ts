// Browser persistence and validation for spam rules and exact blocked sender addresses.
import type { EmailSpamRule, EmailSpamSettings } from '../types/emailRule'

const STORAGE_KEY = 'ontrack-email-spam-settings'
const emptySettings: EmailSpamSettings = { rules: [], blockedSenders: [] }

type JsonRecord = Record<string, unknown>

// Narrow persisted JSON values before validating their settings fields.
const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// Accept ordinary email-address form without allowing whitespace or multiple separators.
const isValidSenderAddress = (address: string) =>
  address.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.trim())

// Check the spam-rule fields before evaluating their pattern.
const isEmailSpamRule = (value: unknown): value is EmailSpamRule =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  value.id.length > 0 &&
  value.id.length <= 100 &&
  typeof value.enabled === 'boolean' &&
  ['sender', 'email', 'subject', 'body'].includes(String(value.field)) &&
  ['contains', 'regex'].includes(String(value.operator)) &&
  typeof value.pattern === 'string'

// Reject malformed patterns and sender addresses before saving or sending them to the backend.
function validateSettings(settings: unknown): asserts settings is EmailSpamSettings {
  if (
    !isRecord(settings) ||
    !Array.isArray(settings.rules) ||
    !Array.isArray(settings.blockedSenders) ||
    settings.rules.length > 50 ||
    settings.blockedSenders.length > 200
  ) {
    throw new Error('Saved email spam settings have an invalid format.')
  }

  settings.rules.forEach((value) => {
    if (!isEmailSpamRule(value) || !value.pattern.trim()) {
      throw new Error('An email spam rule has an invalid format.')
    }

    if (value.pattern.length > 200) {
      throw new Error('Spam rule patterns must be 200 characters or fewer.')
    }

    if (value.operator === 'regex') {
      try {
        new RegExp(value.pattern, 'i')
      } catch {
        throw new Error(`The spam regex pattern "${value.pattern}" is invalid.`)
      }
    }
  })

  if (
    !settings.blockedSenders.every(
      (address) => typeof address === 'string' && isValidSenderAddress(address)
    )
  ) {
    throw new Error('A blocked sender must be a valid email address.')
  }
}

/** Loads saved spam rules and sender blocks; a browser with no saved settings starts empty. */
export function getEmailSpamSettings(): EmailSpamSettings {
  const savedSettings = localStorage.getItem(STORAGE_KEY)
  if (!savedSettings) {
    return emptySettings
  }

  let parsedSettings: unknown
  try {
    parsedSettings = JSON.parse(savedSettings)
  } catch {
    throw new Error('Saved email spam settings could not be read.')
  }

  validateSettings(parsedSettings)
  return parsedSettings
}

/** Validates the complete spam configuration before storing it in this browser. */
export function saveEmailSpamSettings(settings: EmailSpamSettings): void {
  validateSettings(settings)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}
