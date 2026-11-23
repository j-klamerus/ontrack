/** Display-specific calendar item and view types shared by the page components. */
import type { EventCategory } from '../../types/calendarEvent'
import type { Priority } from '../../types/commitment'
import type { DashboardSuggestion } from '../../types/dashboardSuggestion'

export type CalendarSuggestion = Extract<DashboardSuggestion, { kind: 'Calendar event' }>

type CalendarScheduleItemBase = {
  id: string
  title: string
  date: string
  time: string
  allDay?: boolean
  color: string
  category: EventCategory
  priority: Priority
}

export type CalendarScheduleItem = CalendarScheduleItemBase & (
  | { kind: 'Commitment'; sourceId: number }
  | { kind: 'Calendar event'; sourceId: number | string }
)

export type CalendarViewMode = 'month' | 'week'
