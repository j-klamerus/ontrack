// Loads bundled demo emails and persists the Inbox read state in browser storage.
import demoEmails from '../data/demoEmails.json'
import type { EmailPriority, EmailSignal, StudentEmail } from '../types/email'

type JsonRecord = Record<string, unknown>

const EMAIL_READ_STATES_KEY = 'ontrack-email-read-states'

// Shared object guard used to validate fixture data and persisted read states.
const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isEmailPriority = (value: unknown): value is EmailPriority =>
  value === 'High' || value === 'Medium' || value === 'Low'

const isEmailSignal = (value: unknown): value is EmailSignal =>
  value === 'Assignment' ||
  value === 'Exam' ||
  value === 'Meeting' ||
  value === 'Appointment' ||
  value === 'Deadline' ||
  value === 'Other'

// Validate the fixture shape before it enters the inbox or rule-evaluation request.
const isStudentEmail = (value: unknown): value is StudentEmail =>
  isRecord(value) &&
  typeof value.id === 'number' &&
  typeof value.sender === 'string' &&
  typeof value.email === 'string' &&
  typeof value.subject === 'string' &&
  typeof value.preview === 'string' &&
  typeof value.body === 'string' &&
  typeof value.date === 'string' &&
  isEmailPriority(value.priority) &&
  typeof value.important === 'boolean' &&
  typeof value.read === 'boolean' &&
  typeof value.spam === 'boolean' &&
  Array.isArray(value.signals) &&
  value.signals.every(isEmailSignal) &&
  typeof value.summary === 'string' &&
  (value.warning === undefined || typeof value.warning === 'string')

// Parse persisted read flags separately so malformed browser data is reported to the Inbox.
const getSavedReadStates = (): Record<string, boolean> => {
  const savedReadStates = localStorage.getItem(EMAIL_READ_STATES_KEY)
  if (!savedReadStates) {
    return {}
  }

  let parsedReadStates: unknown
  try {
    parsedReadStates = JSON.parse(savedReadStates)
  } catch {
    throw new Error('Saved email read states could not be read.')
  }

  if (!isRecord(parsedReadStates) || !Object.values(parsedReadStates).every((value) => typeof value === 'boolean')) {
    throw new Error('Saved email read states have an invalid format.')
  }

  return Object.fromEntries(
    Object.entries(parsedReadStates).map(([id, value]) => [id, value as boolean])
  )
}

/** Validates bundled demo records and overlays any locally saved read states. */
export async function getEmails(): Promise<StudentEmail[]> {
  if (!Array.isArray(demoEmails)) {
    throw new Error('The demo email data is invalid.')
  }

  const validatedEmails = demoEmails.map((email) => {
    if (!isStudentEmail(email)) {
      throw new Error('The demo email data is invalid.')
    }
    return email
  })

  const savedReadStates = getSavedReadStates()

  return validatedEmails.map((email) => ({
    ...email,
    read: typeof savedReadStates[email.id] === 'boolean'
      ? savedReadStates[email.id]
      : email.read
  }))
}

/** Saves one email's read status through the shared multi-email persistence path. */
export function saveEmailReadState(emailId: number, read: boolean): void {
  saveEmailReadStates([emailId], read)
}

/** Persists read status for multiple messages without changing their bundled data. */
export function saveEmailReadStates(emailIds: number[], read: boolean): void {
  const readStates = getSavedReadStates()
  localStorage.setItem(
    EMAIL_READ_STATES_KEY,
    JSON.stringify({
      ...readStates,
      ...Object.fromEntries(emailIds.map((emailId) => [emailId, read]))
    })
  )
}
