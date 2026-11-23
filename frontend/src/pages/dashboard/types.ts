import type { CalendarEvent, EventCategory } from '../../types/calendarEvent'
import type { Commitment, Priority } from '../../types/commitment'

export type DashboardSummary = {
  totalEmails: number
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

export const isUpcoming = ({ date, time }: DashboardUpcomingItem) =>
  new Date(`${date}T${time}:00`) >= new Date()
