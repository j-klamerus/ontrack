import type { EventCategory } from './calendarEvent'

export type Priority = 'High' | 'Medium' | 'Low'
export type CommitmentStatus = 'Upcoming' | 'Overdue' | 'Completed'

export type Commitment = {
  id: number
  name: string
  course: string
  dueDate: string
  dueTime: string
  category: EventCategory
  priority: Priority
  completed: boolean
  sourceEmail: string
}
