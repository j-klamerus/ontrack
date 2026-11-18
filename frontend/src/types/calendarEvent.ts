export type EventCategory = string
export type EventPriority = 'High' | 'Medium' | 'Low'

export type CalendarEvent = {
  id: number | string
  title: string
  course: string
  date: string
  time: string
  category: EventCategory
  priority: EventPriority
  description: string
  googleEventId?: string
  googleCalendarId?: string
  googleDurationMinutes?: number
  googleAllDay?: boolean
  googleLastDate?: string
}

export type EventFormState = Omit<
  CalendarEvent,
  'id' | 'googleEventId' | 'googleCalendarId' | 'googleDurationMinutes' | 'googleAllDay' | 'googleLastDate'
>
