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

function parseGoogleCalendarEvent(value: unknown, calendarId: string): CalendarEvent {
  if (
    !isRecord(value) || typeof value.googleEventId !== 'string' ||
    value.id !== `google:${value.googleEventId}` || value.googleCalendarId !== calendarId ||
    typeof value.googleDurationMinutes !== 'number' || !Number.isFinite(value.googleDurationMinutes) ||
    value.googleDurationMinutes <= 0 ||
    typeof value.googleAllDay !== 'boolean' || typeof value.googleLastDate !== 'string' ||
    typeof value.title !== 'string' || typeof value.course !== 'string' ||
    typeof value.date !== 'string' || typeof value.time !== 'string' ||
    typeof value.category !== 'string' || !isEventPriority(value.priority) ||
    typeof value.description !== 'string'
  ) {
    throw new Error('The backend returned an invalid Google Calendar event.')
  }
  return {
    id: value.id,
    googleEventId: value.googleEventId,
    googleCalendarId: calendarId,
    googleDurationMinutes: value.googleDurationMinutes,
    googleAllDay: value.googleAllDay,
    googleLastDate: value.googleLastDate,
    title: value.title,
    course: value.course,
    date: value.date,
    time: value.time,
    category: value.category,
    priority: value.priority,
    description: value.description
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
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const query = new URLSearchParams({ calendarId, timeMin, timeMax, timeZone })
  const response = await requestGoogleCalendar(`/api/google/calendar/events?${query.toString()}`)
  if (!isRecord(response) || !Array.isArray(response.events)) {
    throw new Error('The backend returned an invalid Google Calendar event list.')
  }

  return response.events.map((event) => parseGoogleCalendarEvent(event, calendarId))
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

  return parseGoogleCalendarEvent(response.event, calendarId)
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

type CalendarSelection = { initialized: boolean; calendarId: string | null }

function parseCalendarSelection(value: unknown): CalendarSelection {
  if (
    !isRecord(value) || typeof value.initialized !== 'boolean' ||
    (value.calendarId !== null && (typeof value.calendarId !== 'string' || !value.calendarId.trim()))
  ) {
    throw new Error('The backend returned an invalid Google Calendar selection.')
  }
  return { initialized: value.initialized, calendarId: value.calendarId }
}

async function writeCalendarSelection(calendarId: string | null, onlyIfUnset = false): Promise<CalendarSelection> {
  return parseCalendarSelection(await requestGoogleCalendar('/api/google/calendar/selection', {
    method: 'PUT',
    body: JSON.stringify({ calendarId, onlyIfUnset })
  }))
}

export async function getSelectedGoogleCalendarId(userId: string): Promise<string | null> {
  let selection = parseCalendarSelection(await requestGoogleCalendar('/api/google/calendar/selection'))
  const legacyKey = `${selectedCalendarStorageKey}:${userId}`
  const legacyCalendarId = localStorage.getItem(legacyKey)
  if (!selection.initialized && legacyCalendarId) {
    selection = await writeCalendarSelection(legacyCalendarId, true)
  }
  if (legacyCalendarId) localStorage.removeItem(legacyKey)
  return selection.calendarId
}

export async function saveSelectedGoogleCalendarId(calendarId: string): Promise<void> {
  await writeCalendarSelection(calendarId)
}

export async function resetSelectedGoogleCalendarId(): Promise<void> {
  await writeCalendarSelection(null)
}

export function resolveSelectedGoogleCalendar(
  calendars: GoogleCalendarInfo[],
  savedCalendarId: string | null
): GoogleCalendarInfo | null {
  if (savedCalendarId) {
    return calendars.find((calendar) => calendar.id === savedCalendarId) ?? null
  }

  return calendars.find((calendar) => calendar.primary && canWriteGoogleCalendar(calendar))
    ?? calendars.find(canWriteGoogleCalendar)
    ?? calendars.find((calendar) => calendar.primary)
    ?? calendars[0]
    ?? null
}
