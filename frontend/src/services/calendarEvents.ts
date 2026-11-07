import demoCalendarEvents from '../data/demoCalendarEvents.json'
import {
  getEventCategories,
  getItemCategoryOverride
} from '../constants/eventCategories'
import { getConfirmedCalendarEvents } from './reviewedSuggestions'
import type { CalendarEvent, EventCategory, EventPriority } from '../types/calendarEvent'

type DemoCalendarEvent = Omit<CalendarEvent, 'date'> & { dateOffsetDays: number }
type JsonRecord = Record<string, unknown>

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isEventCategory = (value: unknown): value is EventCategory =>
  typeof value === 'string' && getEventCategories().some((category) => category === value)

const isEventPriority = (value: unknown): value is EventPriority =>
  value === 'High' || value === 'Medium' || value === 'Low'

const isDemoCalendarEvent = (value: unknown): value is DemoCalendarEvent =>
  isRecord(value) &&
  typeof value.id === 'number' &&
  typeof value.title === 'string' &&
  typeof value.course === 'string' &&
  typeof value.dateOffsetDays === 'number' &&
  typeof value.time === 'string' &&
  isEventCategory(value.category) &&
  isEventPriority(value.priority) &&
  typeof value.description === 'string'

const getIsoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  if (!Array.isArray(demoCalendarEvents) || !demoCalendarEvents.every(isDemoCalendarEvent)) {
    throw new Error('The demo calendar event data is invalid.')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const fixtureEvents = demoCalendarEvents.map(({ dateOffsetDays, ...event }) => {
    const date = new Date(today)
    date.setDate(date.getDate() + dateOffsetDays)

    return {
      ...event,
      category: getItemCategoryOverride('event', event.id) ?? event.category,
      date: getIsoDate(date)
    }
  })

  return [
    ...fixtureEvents,
    ...getConfirmedCalendarEvents().map((event) => ({
      ...event,
      category: getItemCategoryOverride('event', event.id) ?? event.category
    }))
  ]
}
