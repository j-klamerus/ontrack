import type { PlannerKeyDefaults } from '../../services/plannerKeyPreferences'

export type ReminderTiming = '15 minutes before' | '1 hour before' | '1 day before'

export type SettingsState = {
  studentName: string
  studentEmail: string
  priorityEmailFiltering: boolean
  highlightAssignments: boolean
  highlightDeadlines: boolean
  highlightImportant: boolean
  spamWarnings: boolean
  deadlineReminders: boolean
  importantEmailNotifications: boolean
  reminderTiming: ReminderTiming
  aiEmailSummaries: boolean
  aiDeadlineDetection: boolean
  emailAnalysisEnabled: boolean
  plannerKeyDefaults: PlannerKeyDefaults
}
