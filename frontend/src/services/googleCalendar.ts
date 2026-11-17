import { getSupabaseClient } from './supabase'
import type { CalendarEvent, EventPriority } from '../types/calendarEvent'

export type GoogleCalendarInfo = {
  id: string
  summary: string
  primary: boolean
  accessRole: string
  timeZone: string | null
}

export const canWriteGoogleCalendar = (calendar: GoogleCalendarInfo): boolean =>
  calendar.accessRole === 'writer' || calendar.accessRole === 'owner'

export type GoogleCalendarEventInput = {
  title: string
  course: string
  description: string
  category: string
  priority: EventPriority
  startDateTime: string
  endDateTime: string
  timeZone: string
}

const backendUrl = (import.meta.env.VITE_BACKEND_URL?.trim() || 'http://localhost:3000')
  .replace(/\/+$/, '')
const selectedCalendarStorageKey = 'ontrack-google-calendar-id'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isEventPriority = (value: unknown): value is EventPriority =>
  value === 'High' || value === 'Medium' || value === 'Low'

const getIsoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getLocalTime = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

function parseGoogleCalendarEvent(value: unknown, calendarId: string): CalendarEvent | null {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return null
  }

  const start = isRecord(value.start) ? value.start : null
  const end = isRecord(value.end) ? value.end : null
  if (!start) {
    return null
  }

  const startDateTime = typeof start.dateTime === 'string' ? start.dateTime : null
  const startDate = typeof start.date === 'string' ? start.date : null
  const startDateObject = startDateTime ? new Date(startDateTime) : null
  if (startDateTime && (!startDateObject || Number.isNaN(startDateObject.getTime()))) {
    return null
  }
  if (!startDateTime && !startDate) {
    return null
  }

  const endDateTime = end && typeof end.dateTime === 'string' ? end.dateTime : null
  const parsedEnd = endDateTime ? Date.parse(endDateTime) : Number.NaN
  const parsedStart = startDateTime ? Date.parse(startDateTime) : Number.NaN
  const googleEventId = value.id
  const extendedProperties = isRecord(value.extendedProperties) &&
    isRecord(value.extendedProperties.private)
    ? value.extendedProperties.private
    : {}
  const eventDate = startDateObject ? getIsoDate(startDateObject) : startDate
  if (!eventDate) {
    return null
  }

  return {
    id: `google:${googleEventId}`,
    googleEventId,
    googleCalendarId: calendarId,
    googleDurationMinutes: Number.isFinite(parsedEnd - parsedStart) && parsedEnd > parsedStart
      ? Math.max(1, Math.round((parsedEnd - parsedStart) / 60000))
      : 60,
    title: typeof value.summary === 'string' && value.summary.trim() ? value.summary : '(Untitled event)',
    course: typeof extendedProperties.ontrackCourse === 'string'
      ? extendedProperties.ontrackCourse
      : 'Google Calendar',
    date: eventDate,
    time: startDateObject ? getLocalTime(startDateObject) : '00:00',
    category: typeof extendedProperties.ontrackCategory === 'string'
      ? extendedProperties.ontrackCategory
      : 'Other',
    priority: isEventPriority(extendedProperties.ontrackPriority)
      ? extendedProperties.ontrackPriority
      : 'Medium',
    description: typeof value.description === 'string' ? value.description : ''
  }
}

async function requestGoogleCalendar(path: string, init?: RequestInit): Promise<unknown> {
  const { data, error } = await getSupabaseClient().auth.getSession()
  if (error) {
    throw error
  }
  if (!data.session) {
    throw new Error('Sign in to On Track before using Google Calendar.')
  }

  const response = await fetch(`${backendUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${data.session.access_token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {})
    }
  })

  let responseBody: unknown = null
  if (response.status !== 204) {
    try {
      responseBody = await response.json()
    } catch {
      throw new Error('The backend returned an unreadable response.')
    }
  }

  if (!response.ok) {
    const message = isRecord(responseBody) && typeof responseBody.error === 'string'
      ? responseBody.error
      : `Google Calendar request failed (${response.status}).`
    throw new Error(message)
  }

  return responseBody
}

export async function getGoogleCalendarStatus(): Promise<boolean> {
  const response = await requestGoogleCalendar('/api/google/calendar/status')
  if (!isRecord(response) || typeof response.connected !== 'boolean') {
    throw new Error('The backend returned an invalid Google Calendar status.')
  }
  return response.connected
}

export async function startGoogleCalendarConnection(): Promise<string> {
  const response = await requestGoogleCalendar('/api/google/calendar/connect')
  if (!isRecord(response) || typeof response.url !== 'string') {
    throw new Error('The backend did not return a Google authorization URL.')
  }

  const url = new URL(response.url)
  if (url.protocol !== 'https:' || url.hostname !== 'accounts.google.com') {
    throw new Error('The backend returned an unexpected Google authorization URL.')
  }
  return url.toString()
}

export async function disconnectGoogleCalendar(): Promise<void> {
  await requestGoogleCalendar('/api/google/calendar', { method: 'DELETE' })
}

export async function getGoogleCalendars(): Promise<GoogleCalendarInfo[]> {
  const response = await requestGoogleCalendar('/api/google/calendar/calendars')
  if (!isRecord(response) || !Array.isArray(response.calendars)) {
    throw new Error('The backend returned an invalid calendar list.')
  }

  return response.calendars.map((calendar): GoogleCalendarInfo => {
    if (
      !isRecord(calendar) ||
      typeof calendar.id !== 'string' ||
      typeof calendar.summary !== 'string' ||
      typeof calendar.primary !== 'boolean' ||
      typeof calendar.accessRole !== 'string' ||
      (typeof calendar.timeZone !== 'string' && calendar.timeZone !== null)
    ) {
      throw new Error('The backend returned an invalid calendar.')
    }

    return {
      id: calendar.id,
      summary: calendar.summary,
      primary: calendar.primary,
      accessRole: calendar.accessRole,
      timeZone: calendar.timeZone
    }
  })
}

export async function getGoogleCalendarEvents(
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  const query = new URLSearchParams({ calendarId, timeMin, timeMax })
  const response = await requestGoogleCalendar(`/api/google/calendar/events?${query.toString()}`)
  if (!isRecord(response) || !Array.isArray(response.events)) {
    throw new Error('The backend returned an invalid Google Calendar event list.')
  }

  return response.events
    .map((event) => parseGoogleCalendarEvent(event, calendarId))
    .filter((event): event is CalendarEvent => event !== null)
}

function toGoogleEventRequest(calendarId: string, event: GoogleCalendarEventInput) {
  return {
    calendarId,
    summary: event.title,
    course: event.course,
    description: event.description,
    category: event.category,
    priority: event.priority,
    startDateTime: event.startDateTime,
    endDateTime: event.endDateTime,
    timeZone: event.timeZone
  }
}

function parseSavedGoogleEvent(response: unknown, calendarId: string): CalendarEvent {
  if (!isRecord(response) || !isRecord(response.event)) {
    throw new Error('The backend returned an invalid saved Google Calendar event.')
  }

  const event = parseGoogleCalendarEvent(response.event, calendarId)
  if (!event) {
    throw new Error('The backend returned an invalid saved Google Calendar event.')
  }
  return event
}

export async function createGoogleCalendarEvent(
  calendarId: string,
  event: GoogleCalendarEventInput
): Promise<CalendarEvent> {
  const response = await requestGoogleCalendar('/api/google/calendar/events', {
    method: 'POST',
    body: JSON.stringify(toGoogleEventRequest(calendarId, event))
  })
  return parseSavedGoogleEvent(response, calendarId)
}

export async function updateGoogleCalendarEvent(
  calendarId: string,
  eventId: string,
  event: GoogleCalendarEventInput
): Promise<CalendarEvent> {
  const response = await requestGoogleCalendar(
    `/api/google/calendar/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(toGoogleEventRequest(calendarId, event))
    }
  )
  return parseSavedGoogleEvent(response, calendarId)
}

export async function deleteGoogleCalendarEvent(calendarId: string, eventId: string): Promise<void> {
  const query = new URLSearchParams({ calendarId })
  await requestGoogleCalendar(
    `/api/google/calendar/events/${encodeURIComponent(eventId)}?${query.toString()}`,
    { method: 'DELETE' }
  )
}

export function getSelectedGoogleCalendarId(): string | null {
  return localStorage.getItem(selectedCalendarStorageKey)
}

export function saveSelectedGoogleCalendarId(calendarId: string): void {
  localStorage.setItem(selectedCalendarStorageKey, calendarId)
}
