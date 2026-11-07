import type { EmailPriority, EmailSignal } from '../../types/email'

export type EmailFilter = 'All' | 'Important' | 'Unread' | 'Spam' | 'Suggested replies'

export const filterOptions: EmailFilter[] = ['All', 'Important', 'Unread', 'Spam', 'Suggested replies']
export const priorityOptions: EmailPriority[] = ['High', 'Medium', 'Low']
export const signalOptions: EmailSignal[] = ['Assignment', 'Deadline', 'Exam', 'Meeting', 'General']

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value))
