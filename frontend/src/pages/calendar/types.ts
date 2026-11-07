import type { EventCategory } from '../../types/calendarEvent'
import type { Priority } from '../../types/commitment'
import type { DashboardSuggestion } from '../../types/dashboardSuggestion'

export type CalendarSuggestion = Extract<DashboardSuggestion, { kind: 'Calendar event' }>

export type CalendarScheduleItem = {
  id: string
  title: string
  date: string
  time: string
  kind: 'Commitment' | 'Calendar event'
  color: string
  category: EventCategory
  priority: Priority
}

export type CalendarViewMode = 'month' | 'week'
