import type { StudentEmail } from '../types/email'
import type { EmailRule } from '../types/emailRule'

export type EmailRuleEvaluation = {
  emailId: number
  labels: string[]
  groupId: string
  groupLabel: string
  groupOrder: number
}

type JsonRecord = Record<string, unknown>

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '')

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isEvaluationResult = (value: unknown): value is EmailRuleEvaluation =>
  isRecord(value) &&
  typeof value.emailId === 'number' &&
  Array.isArray(value.labels) &&
  value.labels.every((label) => typeof label === 'string') &&
  typeof value.groupId === 'string' &&
  typeof value.groupLabel === 'string' &&
  typeof value.groupOrder === 'number'

export async function evaluateEmailRules(
  emails: StudentEmail[],
  rules: EmailRule[]
): Promise<EmailRuleEvaluation[]> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/email-rules/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails, rules })
    })
  } catch {
    throw new Error(
      `Could not connect to the email rules backend at ${API_BASE_URL}. Start the backend with "npm run dev" from the backend folder, then retry.`
    )
  }

  let responseBody: unknown
  try {
    responseBody = await response.json()
  } catch {
    throw new Error('The email rules service returned an unreadable response.')
  }

  if (!response.ok) {
    const message = isRecord(responseBody) && typeof responseBody.error === 'string'
      ? responseBody.error
      : 'Unable to evaluate email rules.'
    throw new Error(message)
  }

  if (
    !isRecord(responseBody) ||
    !Array.isArray(responseBody.results) ||
    !responseBody.results.every(isEvaluationResult)
  ) {
    throw new Error('The email rules service returned an invalid response.')
  }

  return responseBody.results
}
