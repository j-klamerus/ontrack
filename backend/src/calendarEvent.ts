import type { calendar_v3 } from 'googleapis'

export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch (error) {
    if (error instanceof RangeError) return false
    throw error
  }
}

export function normalizeGoogleCalendarEvent(
  event: calendar_v3.Schema$Event,
  calendarId: string,
  timeZone: string
) {
  const startDateTime = event.start?.dateTime
  const startDate = event.start?.date
  const start = startDateTime ? new Date(startDateTime) : null
  if (!event.id || (start && Number.isNaN(start.getTime())) || (!start && !startDate)) {
    throw new Error('Google Calendar returned an event with an invalid ID or start time.')
  }

  let date = startDate ?? ''
  let time = '00:00'
  if (start) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(start)
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value
    date = `${part('year')}-${part('month')}-${part('day')}`
    time = `${part('hour')}:${part('minute')}`
  }

  const endTime = event.end?.dateTime ? Date.parse(event.end.dateTime) : Number.NaN
  const startTime = startDateTime ? Date.parse(startDateTime) : Number.NaN
  const properties = event.extendedProperties?.private ?? {}
  const priority = properties.ontrackPriority
  return {
    id: `google:${event.id}`,
    googleEventId: event.id,
    googleCalendarId: calendarId,
    googleDurationMinutes: Number.isFinite(endTime - startTime) && endTime > startTime
      ? Math.max(1, Math.round((endTime - startTime) / 60000))
      : 60,
    title: event.summary?.trim() ? event.summary : '(Untitled event)',
    course: properties.ontrackCourse ?? 'Google Calendar',
    date,
    time,
    category: properties.ontrackCategory ?? 'Other',
    priority: priority === 'High' || priority === 'Medium' || priority === 'Low' ? priority : 'Medium',
    description: event.description ?? ''
  }
}
