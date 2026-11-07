import demoEmails from '../data/demoEmails.json'
import type { EmailPriority, EmailSignal, StudentEmail } from '../types/email'

type JsonRecord = Record<string, unknown>

const EMAIL_READ_STATES_KEY = 'ontrack-email-read-states'

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isEmailPriority = (value: unknown): value is EmailPriority =>
  value === 'High' || value === 'Medium' || value === 'Low'

const isEmailSignal = (value: unknown): value is EmailSignal =>
  value === 'Assignment' ||
  value === 'Deadline' ||
  value === 'Exam' ||
  value === 'Meeting' ||
  value === 'General'

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

export async function getEmails(): Promise<StudentEmail[]> {
  if (!Array.isArray(demoEmails) || !demoEmails.every(isStudentEmail)) {
    throw new Error('The demo email data is invalid.')
  }

  const savedReadStates = getSavedReadStates()

  return demoEmails.map((email) => ({
    ...email,
    read: typeof savedReadStates[email.id] === 'boolean'
      ? savedReadStates[email.id]
      : email.read
  }))
}

export function saveEmailReadState(emailId: number, read: boolean): void {
  saveEmailReadStates([emailId], read)
}

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
