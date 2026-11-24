import type { EmailPriority, EmailSignal, StudentEmail } from '../types/email'
import type { EmailPriorityRule, EmailRule, EmailSpamRule } from '../types/emailRule'
import type { EmailRuleEvaluation } from './emailRuleEvaluation'
import type { EmailFilter, PriorityFilter } from '../pages/inbox/types'
import { getUserDataItem, removeUserDataItem, setUserDataItem } from './userData'

const INBOX_VIEW_STORAGE_KEY = 'ontrack-inbox-view'
const INBOX_SCAN_STORAGE_KEY = 'ontrack-inbox-scan'

export type InboxViewState = {
  searchTerm: string
  activeFilter: EmailFilter
  priorityFilter: PriorityFilter
  signalFilter: EmailSignal | 'All'
  selectedId: number | null
}

export type SavedInboxScanState = {
  evaluations: EmailRuleEvaluation[]
  classificationCleared: boolean
  sourceSignature: string
}

export const DEFAULT_INBOX_VIEW_STATE: InboxViewState = {
  searchTerm: '',
  activeFilter: 'All',
  priorityFilter: 'All',
  signalFilter: 'All',
  selectedId: null
}

type JsonRecord = Record<string, unknown>

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isEmailPriority = (value: unknown): value is EmailPriority =>
  value === 'High' || value === 'Medium' || value === 'Low'

const isEmailFilter = (value: unknown): value is EmailFilter =>
  value === 'All' ||
  value === 'Important' ||
  value === 'Unread' ||
  value === 'Spam' ||
  value === 'Suggested replies'

const isPriorityFilter = (value: unknown): value is PriorityFilter =>
  value === 'All' || value === 'None' || isEmailPriority(value)

const isEmailSignalOrAll = (value: unknown): value is EmailSignal | 'All' =>
  value === 'All' ||
  value === 'Assignment' ||
  value === 'Exam' ||
  value === 'Meeting' ||
  value === 'Appointment' ||
  value === 'Deadline' ||
  value === 'Other'

const isEvaluation = (value: unknown): value is EmailRuleEvaluation =>
  isRecord(value) &&
  typeof value.emailId === 'number' &&
  Number.isInteger(value.emailId) &&
  Array.isArray(value.labels) &&
  value.labels.every((label) => typeof label === 'string') &&
  typeof value.groupId === 'string' &&
  typeof value.groupLabel === 'string' &&
  typeof value.groupOrder === 'number' &&
  (value.priority === null || isEmailPriority(value.priority)) &&
  typeof value.spamDetected === 'boolean'

const parseSavedValue = (serialized: string, errorMessage: string): unknown => {
  try {
    return JSON.parse(serialized)
  } catch {
    throw new Error(errorMessage)
  }
}

/** Loads saved Inbox view controls, or returns null when none have been saved. */
export function getInboxViewState(): InboxViewState | null {
  const savedState = getUserDataItem(INBOX_VIEW_STORAGE_KEY)
  if (savedState === null) {
    return null
  }

  const parsedState = parseSavedValue(savedState, 'Saved Inbox view settings could not be read.')
  if (
    !isRecord(parsedState) ||
    typeof parsedState.searchTerm !== 'string' ||
    !isEmailFilter(parsedState.activeFilter) ||
    !isPriorityFilter(parsedState.priorityFilter) ||
    !isEmailSignalOrAll(parsedState.signalFilter) ||
    !(
      parsedState.selectedId === null ||
      (
        typeof parsedState.selectedId === 'number' &&
        Number.isInteger(parsedState.selectedId) &&
        parsedState.selectedId > 0
      )
    )
  ) {
    throw new Error('Saved Inbox view settings have an invalid format.')
  }

  return {
    searchTerm: parsedState.searchTerm,
    activeFilter: parsedState.activeFilter,
    priorityFilter: parsedState.priorityFilter,
    signalFilter: parsedState.signalFilter,
    selectedId: parsedState.selectedId
  }
}

/** Saves the current Inbox search, filters, and selected message. */
export function saveInboxViewState(state: InboxViewState): void {
  setUserDataItem(INBOX_VIEW_STORAGE_KEY, JSON.stringify(state))
}

/** Creates a local digest of only the email and rules used by classification. */
export async function createInboxScanSignature(
  emails: StudentEmail[],
  rules: EmailRule[],
  priorityRules: EmailPriorityRule[],
  spamRules: EmailSpamRule[],
  blockedSenders: string[]
): Promise<string> {
  const classificationInputs = JSON.stringify({
    emails: emails.map(({ id, sender, email, subject, body }) => ({ id, sender, email, subject, body })),
    rules,
    priorityRules,
    spamRules,
    blockedSenders
  })
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(classificationInputs))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Loads scan results only when their input signature still matches the current rules and emails. */
export function getSavedInboxScanState(sourceSignature: string): SavedInboxScanState | null {
  const savedState = getUserDataItem(INBOX_SCAN_STORAGE_KEY)
  if (savedState === null) {
    return null
  }

  const parsedState = parseSavedValue(savedState, 'Saved Inbox scan results could not be read.')
  if (
    !isRecord(parsedState) ||
    parsedState.version !== 1 ||
    typeof parsedState.sourceSignature !== 'string' ||
    !Array.isArray(parsedState.evaluations) ||
    !parsedState.evaluations.every(isEvaluation) ||
    typeof parsedState.classificationCleared !== 'boolean'
  ) {
    throw new Error('Saved Inbox scan results have an invalid format.')
  }

  if (parsedState.sourceSignature !== sourceSignature) {
    removeUserDataItem(INBOX_SCAN_STORAGE_KEY)
    return null
  }

  return {
    evaluations: parsedState.evaluations,
    classificationCleared: parsedState.classificationCleared,
    sourceSignature: parsedState.sourceSignature
  }
}

/** Saves scan results and whether category and priority labels were cleared. */
export function saveInboxScanState(
  evaluations: EmailRuleEvaluation[],
  classificationCleared: boolean,
  sourceSignature: string
): void {
  setUserDataItem(
    INBOX_SCAN_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      sourceSignature,
      evaluations,
      classificationCleared
    })
  )
}
