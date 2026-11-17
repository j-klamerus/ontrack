// Shared Inbox filter options and date formatting for its list and detail panels.
import type { EmailPriority, EmailSignal } from '../../types/email'

export type EmailFilter = 'All' | 'Important' | 'Unread' | 'Spam' | 'Suggested replies'
export type EmailSort = 'priority' | 'category' | 'date'

export const filterOptions: EmailFilter[] = ['All', 'Important', 'Unread', 'Spam', 'Suggested replies']
export const priorityOptions: EmailPriority[] = ['High', 'Medium', 'Low']
export const signalOptions: EmailSignal[] = [
  'Assignment',
  'Exam',
  'Meeting',
  'Appointment',
  'Deadline',
  'Other'
]

/** Formats an email timestamp consistently in the list and message detail views. */
export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value))
