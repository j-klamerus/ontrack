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

  const localParts = (value: Date) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(value)
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value
    return {
      date: `${part('year')}-${part('month')}-${part('day')}`,
      time: `${part('hour')}:${part('minute')}`
    }
  }

  const localStart = start ? localParts(start) : { date: startDate ?? '', time: '00:00' }
  const endTime = event.end?.dateTime ? Date.parse(event.end.dateTime) : Number.NaN
  const startTime = startDateTime ? Date.parse(startDateTime) : Number.NaN
  const allDay = !start && !!startDate
  let lastDate = localStart.date
  if (allDay && event.end?.date && event.end.date > localStart.date) {
    const end = new Date(`${event.end.date}T00:00:00Z`)
    if (!Number.isNaN(end.getTime())) {
      end.setUTCDate(end.getUTCDate() - 1)
      lastDate = end.toISOString().slice(0, 10)
    }
  } else if (start && Number.isFinite(endTime) && endTime > start.getTime()) {
    lastDate = localParts(new Date(endTime - 1)).date
  }
  const properties = event.extendedProperties?.private ?? {}
  const priority = properties.ontrackPriority
  return {
    id: `google:${event.id}`,
    googleEventId: event.id,
    googleCalendarId: calendarId,
    googleAllDay: allDay,
    googleLastDate: lastDate,
    googleDurationMinutes: Number.isFinite(endTime - startTime) && endTime > startTime
      ? Math.max(1, Math.round((endTime - startTime) / 60000))
      : 60,
    title: event.summary?.trim() ? event.summary : '(Untitled event)',
    course: properties.ontrackCourse ?? 'Google Calendar',
    date: localStart.date,
    time: localStart.time,
    category: properties.ontrackCategory ?? 'Other',
    priority: priority === 'High' || priority === 'Medium' || priority === 'Low' ? priority : 'Medium',
    description: event.description ?? ''
  }
}
