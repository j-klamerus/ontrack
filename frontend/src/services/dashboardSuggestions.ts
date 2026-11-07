import demoSuggestions from '../data/demoDashboardSuggestions.json'
import { getEventCategories } from '../constants/eventCategories'
import { getReviewedSuggestionIds } from './reviewedSuggestions'
import type { EventCategory, EventPriority } from '../types/calendarEvent'
import type { DashboardSuggestion } from '../types/dashboardSuggestion'

type DemoSuggestion =
  | (Omit<Extract<DashboardSuggestion, { kind: 'Commitment' }>, 'date'> & { daysFromNow: number })
  | (Omit<Extract<DashboardSuggestion, { kind: 'Calendar event' }>, 'date'> & { daysFromNow: number })
type JsonRecord = Record<string, unknown>

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isEventCategory = (value: unknown): value is EventCategory =>
  typeof value === 'string' && getEventCategories().some((category) => category === value)

const isEventPriority = (value: unknown): value is EventPriority =>
  value === 'High' || value === 'Medium' || value === 'Low'

const isDemoSuggestion = (value: unknown): value is DemoSuggestion => {
  if (!isRecord(value)) {
    return false
  }

  if (
    typeof value.id !== 'number' ||
    typeof value.title !== 'string' ||
    typeof value.description !== 'string' ||
    typeof value.daysFromNow !== 'number' ||
    typeof value.time !== 'string' ||
    typeof value.sourceEmailId !== 'number'
  ) {
    return false
  }

  if (value.kind === 'Commitment') {
    return isEventCategory(value.category) && isEventPriority(value.priority)
  }

  return value.kind === 'Calendar event' &&
    typeof value.course === 'string' &&
    isEventCategory(value.category) &&
    isEventPriority(value.priority)
}

const getIsoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export async function getDashboardSuggestions(): Promise<DashboardSuggestion[]> {
  if (!Array.isArray(demoSuggestions) || !demoSuggestions.every(isDemoSuggestion)) {
    throw new Error('The demo dashboard suggestion data is invalid.')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const reviewedIds = getReviewedSuggestionIds()

  return demoSuggestions
    .map(({ daysFromNow, ...suggestion }) => {
      const date = new Date(today)
      date.setDate(date.getDate() + daysFromNow)

      return { ...suggestion, date: getIsoDate(date) }
    })
    .filter((suggestion) => !reviewedIds.has(suggestion.id))
}
