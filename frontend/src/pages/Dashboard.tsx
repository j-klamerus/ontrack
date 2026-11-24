import { useEffect, useMemo, useState } from 'react'
import { PlannerKey } from '../components/PlannerKey'
import ReviewSuggestionsPanel from './dashboard/ReviewSuggestionsPanel'
import SummaryCards from './dashboard/SummaryCards'
import UpcomingPanel from './dashboard/UpcomingPanel'
import {
  isUpcoming,
  toUpcomingCommitment,
  toUpcomingEvent,
  type DashboardSummary,
  type DashboardUpcomingItem
} from './dashboard/types'
import { getCalendarEvents } from '../services/calendarEvents'
import { getCommitments } from '../services/commitments'
import { getDashboardSuggestions } from '../services/dashboardSuggestions'
import {
  confirmDashboardSuggestion,
  dismissDashboardSuggestion
} from '../services/reviewedSuggestions'
import { recordPlannerPageChange } from '../services/plannerNavigation'
import type { CalendarEvent, EventPriority } from '../types/calendarEvent'
import type { Commitment } from '../types/commitment'
import type { DashboardSuggestion } from '../types/dashboardSuggestion'
import type { GmailScanSummary } from '../types/gmailScanSummary'
import type { UserProfile } from '../types/user'
import type { PlannerItemSelection } from '../types/plannerItemSelection'
import { getEventCategories } from '../constants/eventCategories'
import '../styles/Dashboard.css'

const eventPriorities: EventPriority[] = ['High', 'Medium', 'Low']

/** Summarizes this user's planner data and the latest Gmail scan in this app session. */
type DashboardProps = {
  user: UserProfile
  emailSummary: GmailScanSummary | null
  onViewInCalendar: (request: PlannerItemSelection) => void
  onViewInCommitments: (request: PlannerItemSelection) => void
}

function Dashboard({ user, emailSummary, onViewInCalendar, onViewInCommitments }: DashboardProps) {
  const eventCategories = getEventCategories()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [suggestions, setSuggestions] = useState<DashboardSuggestion[]>([])
  const [confirmedSuggestions, setConfirmedSuggestions] = useState<DashboardUpcomingItem[]>([])
  const [editingSuggestion, setEditingSuggestion] = useState<DashboardSuggestion | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [savingSuggestionId, setSavingSuggestionId] = useState<number | null>(null)

  useEffect(() => {
    let isMounted = true
    Promise.all([
      getCommitments(),
      getCalendarEvents(),
      getDashboardSuggestions()
    ])
      .then(([loadedCommitments, loadedEvents, loadedSuggestions]) => {
        if (!isMounted) return
        setCommitments(loadedCommitments)
        setEvents(loadedEvents)
        setSuggestions(loadedSuggestions)
        setSummary({
          totalEmails: emailSummary?.totalEmails ?? null,
          highPriorityEmails: emailSummary?.highPriorityEmails ?? null,
          commitments: loadedCommitments.length,
          events: loadedEvents.length
        })
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setLoadError(error instanceof Error ? error.message : 'Unable to load dashboard data.')
        }
      })
    return () => {
      isMounted = false
    }
  }, [emailSummary])

  const upcomingItems = useMemo(() => {
    const plannedItems = [
      ...commitments
        .filter((commitment) => !commitment.completed)
        .map(toUpcomingCommitment),
      ...events.map(toUpcomingEvent),
      ...confirmedSuggestions
    ]

    return plannedItems
      .filter(isUpcoming)
      .sort((left, right) =>
        new Date(`${left.date}T${left.time}:00`).getTime() -
        new Date(`${right.date}T${right.time}:00`).getTime()
      )
      .slice(0, 5)
  }, [commitments, events, confirmedSuggestions])

  const eventSuggestions = suggestions.filter((suggestion) => suggestion.kind === 'Calendar event')
  const commitmentSuggestions = suggestions.filter((suggestion) => suggestion.kind === 'Commitment')

  const handleConfirmSuggestion = async (suggestion: DashboardSuggestion) => {
    setSavingSuggestionId(suggestion.id)
    setActionError(null)

    try {
      const confirmed = await confirmDashboardSuggestion(suggestion, suggestion.sourceEmail ?? '')

      setConfirmedSuggestions((current) => [
        ...current,
        confirmed.kind === 'Commitment'
          ? toUpcomingCommitment(confirmed.commitment)
          : toUpcomingEvent(confirmed.event)
      ])
      setSummary((current) =>
        current
          ? {
              ...current,
              commitments: current.commitments + (confirmed.kind === 'Commitment' ? 1 : 0),
              events: current.events + (confirmed.kind === 'Calendar event' ? 1 : 0)
            }
          : current
      )
      setSuggestions((current) => current.filter((item) => item.id !== suggestion.id))
      setEditingSuggestion(null)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to confirm this suggestion.')
    } finally {
      setSavingSuggestionId(null)
    }
  }

  const handleDismissSuggestion = (suggestionId: number) => {
    const suggestion = suggestions.find((item) => item.id === suggestionId)
    if (!suggestion) {
      return
    }

    try {
      dismissDashboardSuggestion(suggestionId, suggestion.kind)
      setSuggestions((current) => current.filter((item) => item.id !== suggestionId))
      setEditingSuggestion(null)
      setActionError(null)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to dismiss this suggestion.')
    }
  }

  const handleSaveSuggestion = () => {
    if (
      !editingSuggestion ||
      !editingSuggestion.title.trim() ||
      !editingSuggestion.date ||
      !editingSuggestion.time
    ) {
      return
    }

    setSuggestions((current) =>
      current.map((suggestion) =>
        suggestion.id === editingSuggestion.id
          ? { ...editingSuggestion, title: editingSuggestion.title.trim() }
          : suggestion
      )
    )
    recordPlannerPageChange(editingSuggestion.kind === 'Commitment' ? 'commitments' : 'calendar')
    setEditingSuggestion(null)
  }

  if (loadError) {
    return <section className="dashboard-page" role="alert">{loadError}</section>
  }

  if (!summary) {
    return <section className="dashboard-page" role="status">Loading dashboard...</section>
  }

  return (
    <section className="dashboard-page">
      <div className="summary-container">
        <h2>Your Overview</h2>

        <p className="summary-description">
          Welcome back{user.name || user.email ? `, ${user.name || user.email}` : ''}! Stay on top of important emails, commitments, and upcoming events.
        </p>

        {actionError && <p className="suggestion-action-error" role="alert">{actionError}</p>}
        <SummaryCards summary={summary} />

        <div className="dashboard-sections">
          <PlannerKey categories={eventCategories} page="dashboard" />
          <UpcomingPanel
            items={upcomingItems}
            onViewInCalendar={onViewInCalendar}
            onViewInCommitments={onViewInCommitments}
          />
          <div className="dashboard-suggestion-panels">
            <ReviewSuggestionsPanel
              title="Suggested Events"
              headingId="suggested-events-heading"
              emptyMessage="No suggested events to review."
              suggestions={eventSuggestions}
              eventCategories={eventCategories}
              eventPriorities={eventPriorities}
              editingSuggestion={editingSuggestion}
              savingSuggestionId={savingSuggestionId}
              onEditingSuggestionChange={setEditingSuggestion}
              onConfirm={handleConfirmSuggestion}
              onDismiss={handleDismissSuggestion}
              onSave={handleSaveSuggestion}
            />
            <ReviewSuggestionsPanel
              title="Suggested Commitments"
              headingId="suggested-commitments-heading"
              emptyMessage="No suggested commitments to review."
              suggestions={commitmentSuggestions}
              eventCategories={eventCategories}
              eventPriorities={eventPriorities}
              editingSuggestion={editingSuggestion}
              savingSuggestionId={savingSuggestionId}
              onEditingSuggestionChange={setEditingSuggestion}
              onConfirm={handleConfirmSuggestion}
              onDismiss={handleDismissSuggestion}
              onSave={handleSaveSuggestion}
            />
          </div>
        </div>

      </div>
    </section>
  )
}

export default Dashboard
