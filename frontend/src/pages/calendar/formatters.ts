/** Local-date utilities shared by the calendar grid, sidebar, and event forms. */
import type { CalendarEvent } from '../../types/calendarEvent'

/** Match any occupied day of a Google multi-day event, or the single local event date. */
export const isEventOnDate = (event: CalendarEvent, date: string) =>
  event.date <= date && (event.googleLastDate ?? event.date) >= date

/** Format the browser-local calendar date without converting it to UTC. */
export const getIsoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

// Use local noon rather than UTC parsing to keep the intended calendar date.
export const getDateFromIso = (isoDate: string) => new Date(`${isoDate}T12:00:00`)

/** Return local midnight on the Sunday starting the date's displayed week. */
export const startOfWeek = (date: Date) => {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  result.setDate(result.getDate() - result.getDay())
  return result
}

export const getMonthName = (date: Date) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date)

export const formatFullDate = (isoDate: string) =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(getDateFromIso(isoDate))

export const formatTime = (time: string) =>
  new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(`2000-01-01T${time}:00`))
