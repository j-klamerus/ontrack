export type EmailPriority = 'High' | 'Medium' | 'Low'
export type EmailSignal = 'Assignment' | 'Exam' | 'Meeting' | 'Appointment' | 'Deadline' | 'Other'

export type StudentEmail = {
  id: number
  sender: string
  email: string
  subject: string
  preview: string
  body: string
  date: string
  priority: EmailPriority
  important: boolean
  read: boolean
  spam: boolean
  // LEGACY: Demo records used to store these manually; Inbox now derives them after a rule scan.
  signals: EmailSignal[]
  summary: string
  warning?: string
}
