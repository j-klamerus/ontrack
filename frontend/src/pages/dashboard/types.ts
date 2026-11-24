import type { CalendarEvent, EventCategory } from '../../types/calendarEvent'
import type { Commitment, Priority } from '../../types/commitment'

export type DashboardSummary = {
  totalEmails: number | null
  highPriorityEmails: number | null
  commitments: number
  events: number
}

type DashboardUpcomingItemBase = {
  id: string
  title: string
  date: string
  time: string
}

export type DashboardUpcomingItem = DashboardUpcomingItemBase & (
  | { kind: 'Commitment'; sourceId: number; category: EventCategory; priority: Priority }
  | { kind: 'Calendar event'; sourceId: number | string; category: EventCategory; priority: Priority }
)

export const toUpcomingCommitment = (commitment: Commitment): DashboardUpcomingItem => ({
  id: `commitment-${commitment.id}`,
  sourceId: commitment.id,
  title: commitment.name,
  date: commitment.dueDate,
  time: commitment.dueTime,
  kind: 'Commitment',
  category: commitment.category,
  priority: commitment.priority
})

export const toUpcomingEvent = (event: CalendarEvent): DashboardUpcomingItem => ({
  id: `event-${event.id}`,
  sourceId: event.id,
  title: event.title,
  date: event.date,
  time: event.time,
  kind: 'Calendar event',
  category: event.category,
  priority: event.priority
})

export const parseDashboardDateTime = (date: string, time: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null

  const parsed = new Date(`${date}T${time || '00:00'}:00`)
  if (Number.isNaN(parsed.getTime())) return null

  const [year, month, day] = date.split('-').map(Number)
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() + 1 !== month ||
    parsed.getDate() !== day
  ) {
    return null
  }

  return parsed
}

export const isUpcoming = ({ date, time }: DashboardUpcomingItem) => {
  const dueAt = parseDashboardDateTime(date, time)
  if (!dueAt) return false

  if (!time) {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    return dueAt >= startOfToday
  }

  return dueAt >= new Date()
}
