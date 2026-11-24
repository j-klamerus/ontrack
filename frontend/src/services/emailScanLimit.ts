import { getUserDataItem, setUserDataItem } from './userData'

export const EMAIL_SCAN_LIMIT_KEY = 'ontrack-premium-email-scan-limit'
export const DEFAULT_EMAIL_SCAN_LIMIT = 20
export const MIN_EMAIL_SCAN_LIMIT = 10
export const MAX_EMAIL_SCAN_LIMIT = 50

function isValidEmailScanLimit(value: number): boolean {
  return Number.isInteger(value) &&
    value >= MIN_EMAIL_SCAN_LIMIT &&
    value <= MAX_EMAIL_SCAN_LIMIT
}

export function getEmailScanLimit(): number {
  const savedLimit = getUserDataItem(EMAIL_SCAN_LIMIT_KEY)
  if (savedLimit === null) return DEFAULT_EMAIL_SCAN_LIMIT

  const limit = Number(savedLimit)
  if (!isValidEmailScanLimit(limit)) {
    throw new Error('Saved email scan limit must be a whole number from 10 to 50.')
  }
  return limit
}

export function saveEmailScanLimit(limit: number): void {
  if (!isValidEmailScanLimit(limit)) {
    throw new Error('Email scan limit must be a whole number from 10 to 50.')
  }
  setUserDataItem(EMAIL_SCAN_LIMIT_KEY, String(limit))
}
