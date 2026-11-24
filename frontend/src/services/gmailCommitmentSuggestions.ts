import { getEventCategories } from '../constants/eventCategories'
import type { DashboardSuggestion } from '../types/dashboardSuggestion'
import type { GmailAnalysis } from './gmailAnalysis'
import { getStableGmailNumericId } from './gmailAnalysis'
import { getUserDataItem, setUserDataItem } from './userData'

type GmailCommitmentSuggestion = Extract<DashboardSuggestion, { kind: 'Commitment' }>
type JsonRecord = Record<string, unknown>

const STORAGE_KEY = 'ontrack-gmail-commitment-suggestions'

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isSuggestion = (value: unknown): value is GmailCommitmentSuggestion =>
  isRecord(value) &&
  value.kind === 'Commitment' &&
  typeof value.id === 'number' &&
  typeof value.title === 'string' &&
  typeof value.description === 'string' &&
  typeof value.date === 'string' &&
  typeof value.time === 'string' &&
  typeof value.sourceEmailId === 'number' &&
  (value.sourceEmail === undefined || typeof value.sourceEmail === 'string') &&
  getEventCategories().includes(String(value.category)) &&
  (value.priority === 'High' || value.priority === 'Medium' || value.priority === 'Low')

function getSavedSuggestions(): GmailCommitmentSuggestion[] {
  const saved = getUserDataItem(STORAGE_KEY)
  if (!saved) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(saved)
  } catch {
    throw new Error('Saved Gmail commitment suggestions could not be read.')
  }

  if (!Array.isArray(parsed) || !parsed.every(isSuggestion)) {
    throw new Error('Saved Gmail commitment suggestions have an invalid format.')
  }
  return parsed
}

function parseDueAt(value: string): { date: string; time: string } | null {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim())
  if (!match) return null

  const datePart = match[1]
  const dateOnly = new Date(`${datePart}T00:00:00`)
  if (
    Number.isNaN(dateOnly.getTime()) ||
    dateOnly.getFullYear() !== Number(datePart.slice(0, 4)) ||
    dateOnly.getMonth() + 1 !== Number(datePart.slice(5, 7)) ||
    dateOnly.getDate() !== Number(datePart.slice(8, 10))
  ) {
    return null
  }

  const valueTrimmed = value.trim()
  const dateOnlyMidnight =
    valueTrimmed === datePart ||
    /^\d{4}-\d{2}-\d{2}T00:00(?::00(?:\.0+)?)?(?:Z|[+-]00:00)?$/i.test(valueTrimmed)
  if (dateOnlyMidnight) return { date: datePart, time: '' }

  const parsed = new Date(valueTrimmed)
  if (Number.isNaN(parsed.getTime())) return null

  const date = [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, '0'),
    String(parsed.getDate()).padStart(2, '0')
  ].join('-')
  const time = `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`
  return { date, time }
}

/** Builds reviewable, dated commitments without retaining message bodies or full analyses. */
export function createGmailCommitmentSuggestions(
  analyses: GmailAnalysis[]
): GmailCommitmentSuggestion[] {
  return analyses.flatMap((analysis) => analysis.commitments.flatMap((commitment) => {
    const title = commitment.title.trim()
    const due = parseDueAt(commitment.dueAt)
    if (!title || !due) return []

    const senderMatch = /<([^<>]+)>$/.exec(analysis.sender.trim())
    return [{
      id: getStableGmailNumericId(`${analysis.id}:${title.toLowerCase()}:${due.date}:${due.time}`),
      kind: 'Commitment',
      title,
      description: 'Extracted from Gmail. Review the title and due date before adding it.',
      date: due.date,
      time: due.time,
      sourceEmailId: getStableGmailNumericId(analysis.id),
      sourceEmail: senderMatch?.[1].trim() || analysis.sender,
      category: 'Other',
      priority: analysis.priority
    }]
  }))
}

/** Saves new dated suggestions once; repeated Gmail scans do not create duplicates. */
export function saveGmailCommitmentSuggestions(analyses: GmailAnalysis[]): number {
  const suggestions = getSavedSuggestions()
  const byId = new Map(suggestions.map((suggestion) => [suggestion.id, suggestion]))
  let addedCount = 0

  for (const suggestion of createGmailCommitmentSuggestions(analyses)) {
    if (byId.has(suggestion.id)) continue
    byId.set(suggestion.id, suggestion)
    addedCount += 1
  }

  if (addedCount > 0) {
    setUserDataItem(STORAGE_KEY, JSON.stringify([...byId.values()]))
  }
  return addedCount
}

export function getGmailCommitmentSuggestions(): GmailCommitmentSuggestion[] {
  return getSavedSuggestions()
}
