import { getSupabaseClient } from './supabase'

export type GmailAnalysis = {
  id: string
  threadId: string | null
  sender: string
  subject: string
  receivedAt: string | null
  body: string
  summary: string
  priority: 'High' | 'Medium' | 'Low'
  important: boolean
  spamLikelihood: number
  signals: Array<'Assignment' | 'Deadline' | 'Exam' | 'Meeting' | 'Appointment' | 'General'>
  commitments: Array<{ title: string; dueAt: string; confidence: number }>
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '')

async function authenticatedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await getSupabaseClient().auth.getSession()
  if (!session?.access_token) throw new Error('Sign in before connecting Gmail or analyzing email.')

  return fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${session.access_token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })
}

async function readApiJson(response: Response): Promise<Record<string, unknown>> {
  const value: unknown = await response.json().catch(() => null)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('The email service returned an unreadable response.')
  }
  const object = value as Record<string, unknown>
  if (!response.ok) {
    throw new Error(typeof object.error === 'string' ? object.error : 'The email service request failed.')
  }
  return object
}

export async function getGmailConnectionStatus(): Promise<boolean> {
  const body = await readApiJson(await authenticatedFetch('/api/gmail/status'))
  if (typeof body.connected !== 'boolean') throw new Error('The Gmail connection status was invalid.')
  return body.connected
}

export async function startGmailConnection(): Promise<string> {
  const body = await readApiJson(await authenticatedFetch('/auth/google/start'))
  if (typeof body.authorizationUrl !== 'string') throw new Error('The Gmail authorization URL was missing.')
  return body.authorizationUrl
}

export async function analyzeGmail(maxResults = 10): Promise<GmailAnalysis[]> {
  const body = await readApiJson(await authenticatedFetch('/api/emails/analyze', {
    method: 'POST',
    body: JSON.stringify({ maxResults }),
  }))

  if (!Array.isArray(body.emails) || !body.emails.every(isGmailAnalysis)) {
    throw new Error('The email analysis response was invalid.')
  }
  return body.emails
}

function isGmailAnalysis(value: unknown): value is GmailAnalysis {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const email = value as Record<string, unknown>
  const priorities = ['High', 'Medium', 'Low']
  const signals = ['Assignment', 'Deadline', 'Exam', 'Meeting', 'Appointment', 'General']
  return typeof email.id === 'string' &&
    (typeof email.threadId === 'string' || email.threadId === null) &&
    typeof email.sender === 'string' && typeof email.subject === 'string' &&
    (typeof email.receivedAt === 'string' || email.receivedAt === null) &&
    typeof email.body === 'string' && typeof email.summary === 'string' &&
    priorities.includes(String(email.priority)) && typeof email.important === 'boolean' &&
    typeof email.spamLikelihood === 'number' && email.spamLikelihood >= 0 && email.spamLikelihood <= 1 &&
    Array.isArray(email.signals) && email.signals.every((signal) => signals.includes(String(signal))) &&
    Array.isArray(email.commitments) && email.commitments.every((item) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) return false
      const commitment = item as Record<string, unknown>
      return typeof commitment.title === 'string' && typeof commitment.dueAt === 'string' &&
        typeof commitment.confidence === 'number' && commitment.confidence >= 0 && commitment.confidence <= 1
    })
}
