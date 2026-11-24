// Shared email types; Inbox derives signals and priority from rules after a manual scan.
export type EmailPriority = 'High' | 'Medium' | 'Low'
export type EmailSignal = 'Assignment' | 'Exam' | 'Meeting' | 'Appointment' | 'Deadline' | 'Other'

export type GmailAnalysisDetails = {
  spamLikelihood: number
  commitments: Array<{
    title: string
    dueAt: string
    confidence: number
  }>
}

export type StudentEmail = {
  id: number
  sender: string
  email: string
  subject: string
  preview: string
  body: string
  date: string
  // Null means the email has not received a priority from the current scan.
  priority: EmailPriority | null
  important: boolean
  read: boolean
  spam: boolean
  // Populated only by a successful Inbox scan; detection does not move the message to Spam.
  spamDetected?: boolean
  // LEGACY: Demo records used to store these manually; Inbox now derives them after a rule scan.
  signals: EmailSignal[]
  summary: string
  warning?: string
  source?: 'gmail'
  gmailAnalysis?: GmailAnalysisDetails
}
