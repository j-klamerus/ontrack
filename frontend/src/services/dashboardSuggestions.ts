import { getReviewedSuggestionIds } from './reviewedSuggestions'
import { getGmailCommitmentSuggestions } from './gmailCommitmentSuggestions'
import type { DashboardSuggestion } from '../types/dashboardSuggestion'

/** Returns unreviewed commitment suggestions extracted from this user's Gmail. */
export async function getDashboardSuggestions(): Promise<DashboardSuggestion[]> {
  const reviewedIds = getReviewedSuggestionIds()

  return getGmailCommitmentSuggestions()
    .filter((suggestion) => !reviewedIds.has(suggestion.id))
}
