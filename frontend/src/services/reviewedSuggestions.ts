// Persists suggestion decisions and materializes confirmed suggestions as planner items.
import type { CalendarEvent } from '../types/calendarEvent'
import { getEventCategories } from '../constants/eventCategories'
import type { Commitment, Priority } from '../types/commitment'
import type { EventCategory } from '../types/calendarEvent'
import type { DashboardSuggestion } from '../types/dashboardSuggestion'
import { recordPlannerPageChange, type PlannerPage } from './plannerNavigation'
import {
  flushUserDataWrites,
  getUserDataItem,
  removeUserDataItem,
  setUserDataItem
} from './userData'

type ConfirmedDashboardItem =
  | { kind: 'Commitment'; commitment: Commitment }
  | { kind: 'Calendar event'; event: CalendarEvent }

type ReviewedSuggestion =
  | { suggestionId: number; status: 'dismissed' }
  | ({ suggestionId: number; status: 'confirmed' } & ConfirmedDashboardItem)

const STORAGE_KEY = 'ontrack-reviewed-suggestions'
const LEGACY_DEMO_SUGGESTION_IDS = new Set([1, 2, 3, 4, 5, 6])
type JsonRecord = Record<string, unknown>

/** Clears saved decisions so current Gmail suggestions can be reviewed again. */
export function resetDashboardSuggestionReviews(): void {
  removeUserDataItem(STORAGE_KEY)
  recordPlannerPageChange('calendar')
  recordPlannerPageChange('commitments')
}

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isEventCategory = (value: unknown): value is EventCategory =>
  typeof value === 'string' && getEventCategories().some((category) => category === value)

const isPriority = (value: unknown): value is Priority =>
  value === 'High' || value === 'Medium' || value === 'Low'

const isCommitment = (value: unknown): value is Commitment =>
  isRecord(value) &&
  typeof value.id === 'number' &&
  typeof value.name === 'string' &&
  typeof value.course === 'string' &&
  typeof value.dueDate === 'string' &&
  typeof value.dueTime === 'string' &&
  isEventCategory(value.category) &&
  isPriority(value.priority) &&
  typeof value.completed === 'boolean' &&
  typeof value.sourceEmail === 'string'

const isCalendarEvent = (value: unknown): value is CalendarEvent =>
  isRecord(value) &&
  (typeof value.id === 'number' || typeof value.id === 'string') &&
  typeof value.title === 'string' &&
  typeof value.course === 'string' &&
  typeof value.date === 'string' &&
  typeof value.time === 'string' &&
  isEventCategory(value.category) &&
  (value.priority === 'High' || value.priority === 'Medium' || value.priority === 'Low') &&
  typeof value.description === 'string' &&
  (value.googleEventId === undefined || typeof value.googleEventId === 'string') &&
  (value.googleCalendarId === undefined || typeof value.googleCalendarId === 'string') &&
  (value.googleDurationMinutes === undefined || typeof value.googleDurationMinutes === 'number')

const isReviewedSuggestion = (value: unknown): value is ReviewedSuggestion => {
  if (!isRecord(value) || typeof value.suggestionId !== 'number') {
    return false
  }

  if (value.status === 'dismissed') {
    return true
  }

  if (value.status !== 'confirmed') {
    return false
  }

  return (value.kind === 'Commitment' && isCommitment(value.commitment)) ||
    (value.kind === 'Calendar event' && isCalendarEvent(value.event))
}

const readReviewedSuggestions = (): ReviewedSuggestion[] => {
  const savedRecords = getUserDataItem(STORAGE_KEY)
  if (!savedRecords) {
    return []
  }

  let parsedRecords: unknown
  try {
    parsedRecords = JSON.parse(savedRecords)
  } catch {
    throw new Error('Saved suggestion reviews could not be read.')
  }

  if (!Array.isArray(parsedRecords)) {
    throw new Error('Saved suggestion reviews have an invalid format.')
  }

  const migratedRecords = parsedRecords.map((record) => {
    if (
      isRecord(record) &&
      record.status === 'confirmed' &&
      record.kind === 'Commitment' &&
      isRecord(record.commitment) &&
      !('category' in record.commitment)
    ) {
      return {
        ...record,
        commitment: { ...record.commitment, category: 'Other' }
      }
    }

    return record
  })

  if (!migratedRecords.every(isReviewedSuggestion)) {
    throw new Error('Saved suggestion reviews have an invalid format.')
  }

  const userRecords = migratedRecords.filter(
    (record) => !LEGACY_DEMO_SUGGESTION_IDS.has(record.suggestionId)
  )
  if (userRecords.length !== migratedRecords.length) {
    setUserDataItem(STORAGE_KEY, JSON.stringify(userRecords))
  }

  return userRecords
}

/** Returns IDs of suggestions already confirmed or dismissed. */
export const getReviewedSuggestionIds = (): Set<number> =>
  new Set(readReviewedSuggestions().map((record) => record.suggestionId))

/** Returns confirmed suggestions that were saved as commitments. */
export const getConfirmedCommitments = (): Commitment[] =>
  readReviewedSuggestions().flatMap((record) =>
    record.status === 'confirmed' && record.kind === 'Commitment'
      ? [record.commitment]
      : []
  )

/** Returns confirmed calendar suggestions from browser storage, separately from Google events. */
export const getConfirmedCalendarEvents = (): CalendarEvent[] =>
  readReviewedSuggestions().flatMap((record) =>
    record.status === 'confirmed' && record.kind === 'Calendar event'
      ? [record.event]
      : []
  )

/** Reassigns confirmed planner items from a deleted category to `Other`. */
export function moveReviewedSuggestionCategoryToOther(category: EventCategory): void {
  const records = readReviewedSuggestions().map((record) => {
    if (record.status !== 'confirmed') {
      return record
    }
    if (record.kind === 'Commitment' && record.commitment.category === category) {
      return { ...record, commitment: { ...record.commitment, category: 'Other' } }
    }
    if (record.kind === 'Calendar event' && record.event.category === category) {
      return { ...record, event: { ...record.event, category: 'Other' } }
    }
    return record
  })
  setUserDataItem(STORAGE_KEY, JSON.stringify(records))
}

/**
 * Saves a suggestion as a planner item. Re-confirming an existing confirmation
 * returns that item; a previously dismissed suggestion cannot be confirmed.
 */
export async function confirmDashboardSuggestion(
  suggestion: DashboardSuggestion,
  sourceEmail: string
): Promise<ConfirmedDashboardItem> {
  const records = readReviewedSuggestions()
  const existingRecord = records.find((record) => record.suggestionId === suggestion.id)

  if (existingRecord) {
    if (existingRecord.status === 'confirmed') {
      await flushUserDataWrites()
      return existingRecord
    }

    throw new Error('This suggestion has already been dismissed.')
  }

  const nextId = Math.max(Date.now(), ...records.flatMap((record) => {
    if (record.status !== 'confirmed') {
      return []
    }

    return record.kind === 'Commitment'
      ? [record.commitment.id]
      : typeof record.event.id === 'number' ? [record.event.id] : []
  })) + 1

  const reviewedRecord: ReviewedSuggestion = suggestion.kind === 'Commitment'
    ? {
        suggestionId: suggestion.id,
        status: 'confirmed',
        kind: 'Commitment',
        commitment: {
          id: nextId,
          name: suggestion.title,
          course: 'General',
          dueDate: suggestion.date,
          dueTime: suggestion.time,
          category: suggestion.category,
          priority: suggestion.priority,
          completed: false,
          sourceEmail
        }
      }
    : {
        suggestionId: suggestion.id,
        status: 'confirmed',
        kind: 'Calendar event',
        event: {
          id: nextId,
          title: suggestion.title,
          course: suggestion.course,
          date: suggestion.date,
          time: suggestion.time,
          category: suggestion.category,
          priority: suggestion.priority,
          description: suggestion.description
        }
      }

  setUserDataItem(STORAGE_KEY, JSON.stringify([...records, reviewedRecord]))
  recordPlannerPageChange(suggestion.kind === 'Commitment' ? 'commitments' : 'calendar')
  await flushUserDataWrites()

  return reviewedRecord
}

/** Records a dismissal once and marks the corresponding planner page as changed. */
export function dismissDashboardSuggestion(suggestionId: number, kind: DashboardSuggestion['kind']): void {
  const records = readReviewedSuggestions()
  if (records.some((record) => record.suggestionId === suggestionId)) {
    return
  }

  setUserDataItem(
    STORAGE_KEY,
    JSON.stringify([...records, { suggestionId, status: 'dismissed' }])
  )

  const page: PlannerPage = kind === 'Commitment' ? 'commitments' : 'calendar'
  recordPlannerPageChange(page)
}
