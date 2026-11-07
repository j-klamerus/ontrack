export type EventCategory = string
export type EventPriority = 'High' | 'Medium' | 'Low'

export type CalendarEvent = {
  id: number
  title: string
  course: string
  date: string
  time: string
  category: EventCategory
  priority: EventPriority
  description: string
}

export type EventFormState = Omit<CalendarEvent, 'id'>
