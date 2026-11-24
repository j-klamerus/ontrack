import type { EventCategory, EventPriority } from './calendarEvent'

type DashboardSuggestionBase = {
  id: number
  title: string
  description: string
  date: string
  time: string
  sourceEmailId: number
  sourceEmail?: string
}

export type DashboardSuggestion =
  | (DashboardSuggestionBase & {
      kind: 'Commitment'
      category: EventCategory
      priority: EventPriority
    })
  | (DashboardSuggestionBase & {
      kind: 'Calendar event'
      course: string
      category: EventCategory
      priority: EventPriority
    })
