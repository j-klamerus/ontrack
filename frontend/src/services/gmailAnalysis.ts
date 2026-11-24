import { getSupabaseClient } from './supabase'
import type { EmailSignal, StudentEmail } from '../types/email'

export type GmailAnalysis = {
  id: string
  threadId: string | null
  sender: string
  subject: string
  receivedAt: string | null
  read: boolean
  body: string
  summary: string
  priority: 'High' | 'Medium' | 'Low'
  important: boolean
  spamLikelihood: number
  signals: Array<'Assignment' | 'Deadline' | 'Exam' | 'Meeting' | 'Appointment' | 'General'>
  commitments: Array<{ title: string; dueAt: string; confidence: number }>
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '')

export function getStableGmailNumericId(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619)
  }
  return 1_000_000_000 + (hash >>> 0)
}

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

export async function analyzeGmail(maxResults = 20): Promise<GmailAnalysis[]> {
  const body = await readApiJson(await authenticatedFetch('/api/emails/analyze', {
    method: 'POST',
    body: JSON.stringify({ maxResults }),
  }))

  if (!Array.isArray(body.emails) || !body.emails.every(isGmailAnalysis)) {
    throw new Error('The email analysis response was invalid.')
  }
  return body.emails
}

/** Converts live Gmail analysis into the existing Inbox model without persisting message content. */
export function toStudentEmails(analyses: GmailAnalysis[]): StudentEmail[] {
  const usedIds = new Set<number>()

  return analyses.map((analysis) => {
    let id = getStableGmailNumericId(analysis.id)
    while (usedIds.has(id)) id += 1
    usedIds.add(id)

    const senderMatch = /^(.*?)\s*<([^<>]+)>$/.exec(analysis.sender.trim())
    const senderAddress = senderMatch?.[2].trim()
    const senderName = senderMatch?.[1].trim().replace(/^"|"$/g, '')
    const body = analysis.body

    return {
      id,
      sender: senderName || senderAddress || analysis.sender,
      email: senderAddress || analysis.sender,
      subject: analysis.subject,
      preview: body.replace(/\s+/g, ' ').trim().slice(0, 160),
      body,
      date: analysis.receivedAt ?? '',
      priority: analysis.priority,
      important: analysis.important,
      read: analysis.read,
      spam: false,
      signals: analysis.signals.map((signal): EmailSignal => signal === 'General' ? 'Other' : signal),
      summary: analysis.summary,
      source: 'gmail',
      gmailAnalysis: {
        spamLikelihood: analysis.spamLikelihood,
        commitments: analysis.commitments
      }
    }
  })
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
    typeof email.read === 'boolean' &&
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
