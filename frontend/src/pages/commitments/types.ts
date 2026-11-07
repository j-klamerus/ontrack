import type { CommitmentStatus, Priority } from '../../types/commitment'
import type { DashboardSuggestion } from '../../types/dashboardSuggestion'

export type CommitmentSuggestion = Extract<DashboardSuggestion, { kind: 'Commitment' }>
export type CommitmentFilter = 'All' | CommitmentStatus

export const filterOptions: CommitmentFilter[] = ['All', 'Upcoming', 'Overdue', 'Completed']
export const priorityOptions: Priority[] = ['High', 'Medium', 'Low']
export const allFilterOption = 'All'
