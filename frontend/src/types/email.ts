export type EmailPriority = 'High' | 'Medium' | 'Low'
export type EmailSignal = 'Assignment' | 'Deadline' | 'Exam' | 'Meeting' | 'General'

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
  signals: EmailSignal[]
  summary: string
  warning?: string
}
