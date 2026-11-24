/** Assemble local calendar data from confirmed suggestions and user-created events. */
import {
  getEventCategories,
  getItemCategoryOverride
} from '../constants/eventCategories'
import { getConfirmedCalendarEvents } from './reviewedSuggestions'
import { getUserDataItem, setUserDataItem } from './userData'
import type { CalendarEvent, EventCategory, EventPriority } from '../types/calendarEvent'

type JsonRecord = Record<string, unknown>

const CUSTOM_EVENTS_KEY = 'ontrack-custom-calendar-events'
const EVENT_OVERRIDES_KEY = 'ontrack-calendar-event-overrides'
const DELETED_EVENTS_KEY = 'ontrack-deleted-calendar-events'

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isEventCategory = (value: unknown): value is EventCategory =>
  typeof value === 'string' && getEventCategories().some((category) => category === value)

const isEventPriority = (value: unknown): value is EventPriority =>
  value === 'High' || value === 'Medium' || value === 'Low'

const isCalendarEvent = (value: unknown): value is CalendarEvent =>
  isRecord(value) &&
  (typeof value.id === 'number' || typeof value.id === 'string') &&
  typeof value.title === 'string' &&
  typeof value.course === 'string' &&
  typeof value.date === 'string' &&
  typeof value.time === 'string' &&
  isEventCategory(value.category) &&
  isEventPriority(value.priority) &&
  typeof value.description === 'string' &&
  (value.googleEventId === undefined || typeof value.googleEventId === 'string') &&
  (value.googleCalendarId === undefined || typeof value.googleCalendarId === 'string') &&
  (value.googleDurationMinutes === undefined || typeof value.googleDurationMinutes === 'number') &&
  (value.googleAllDay === undefined || typeof value.googleAllDay === 'boolean') &&
  (value.googleLastDate === undefined || typeof value.googleLastDate === 'string') &&
  (value.googleSourceId === undefined ||
    typeof value.googleSourceId === 'number' || typeof value.googleSourceId === 'string')

const readEventArray = (key: string): CalendarEvent[] => {
  const saved = getUserDataItem(key)
  if (!saved) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(saved)
  } catch {
    throw new Error('Saved calendar events could not be read.')
  }
  if (!Array.isArray(parsed) || !parsed.every(isCalendarEvent)) {
    throw new Error('Saved calendar events have an invalid format.')
  }
  return parsed
}

const readDeletedEventIds = (): Set<number | string> => {
  const saved = getUserDataItem(DELETED_EVENTS_KEY)
  if (!saved) return new Set()

  let parsed: unknown
  try {
    parsed = JSON.parse(saved)
  } catch {
    throw new Error('Saved deleted calendar events could not be read.')
  }
  if (
    !Array.isArray(parsed) ||
    !parsed.every((id) => typeof id === 'number' || typeof id === 'string')
  ) {
    throw new Error('Saved deleted calendar events have an invalid format.')
  }
  return new Set(parsed)
}

/** Builds the event list from confirmed suggestions and user-created events. */
export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  const overrides = new Map(
    readEventArray(EVENT_OVERRIDES_KEY).map((event) => [event.id, event])
  )
  const deletedIds = readDeletedEventIds()
  const events = [
    ...getConfirmedCalendarEvents(),
    ...readEventArray(CUSTOM_EVENTS_KEY)
  ]

  return events
    .map((event) => {
      const updated = overrides.get(event.id) ?? event
      return {
        ...updated,
        category: getItemCategoryOverride('event', updated.id) ?? updated.category
      }
    })
    .filter((event) => !deletedIds.has(event.id))
}

/** Adds a user-created event to the account's persisted calendar records. */
export function addCalendarEvent(event: CalendarEvent): void {
  if (!isCalendarEvent(event) || event.googleEventId) {
    throw new Error('The calendar event data is invalid.')
  }

  const customEvents = readEventArray(CUSTOM_EVENTS_KEY)
  if (customEvents.some((item) => item.id === event.id)) {
    throw new Error('A calendar event with this ID already exists.')
  }
  setUserDataItem(CUSTOM_EVENTS_KEY, JSON.stringify([...customEvents, event]))
  setUserDataItem(
    DELETED_EVENTS_KEY,
    JSON.stringify([...readDeletedEventIds()].filter((id) => id !== event.id))
  )
}

/** Saves edits as an override for the matching event. */
export function updateCalendarEvent(event: CalendarEvent): void {
  if (!isCalendarEvent(event) || event.googleEventId) {
    throw new Error('The calendar event data is invalid.')
  }

  const overrides = readEventArray(EVENT_OVERRIDES_KEY)
  setUserDataItem(
    EVENT_OVERRIDES_KEY,
    JSON.stringify([...overrides.filter((item) => item.id !== event.id), event])
  )
}

/** Deletes a local event and records the deleted ID for compatibility. */
export function deleteCalendarEvent(eventId: number | string): void {
  setUserDataItem(
    CUSTOM_EVENTS_KEY,
    JSON.stringify(readEventArray(CUSTOM_EVENTS_KEY).filter((event) => event.id !== eventId))
  )
  setUserDataItem(
    EVENT_OVERRIDES_KEY,
    JSON.stringify(readEventArray(EVENT_OVERRIDES_KEY).filter((event) => event.id !== eventId))
  )
  setUserDataItem(
    DELETED_EVENTS_KEY,
    JSON.stringify([...new Set([...readDeletedEventIds(), eventId])])
  )
}

/** Moves custom event data to Other when its category is removed. */
export function moveCalendarEventCategoryToOther(category: EventCategory): void {
  for (const key of [CUSTOM_EVENTS_KEY, EVENT_OVERRIDES_KEY]) {
    const saved = getUserDataItem(key)
    if (saved) {
      setUserDataItem(
        key,
        JSON.stringify(readEventArray(key).map((event) =>
          event.category === category ? { ...event, category: 'Other' } : event
        ))
      )
    }
  }
}
