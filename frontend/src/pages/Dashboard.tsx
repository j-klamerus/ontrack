import { useEffect, useMemo, useState } from 'react'
import { PlannerKey } from '../components/PlannerKey'
import SuggestedRepliesPanel from '../components/SuggestedRepliesPanel'
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
import { getEmails } from '../services/emails'
import { getSuggestedReplies } from '../services/suggestedReplies'
import {
  confirmDashboardSuggestion,
  dismissDashboardSuggestion
} from '../services/reviewedSuggestions'
import { recordPlannerPageChange } from '../services/plannerNavigation'
import { getUserProfile } from '../services/user'
import type { CalendarEvent, EventPriority } from '../types/calendarEvent'
import type { Commitment } from '../types/commitment'
import type { DashboardSuggestion } from '../types/dashboardSuggestion'
import type { StudentEmail } from '../types/email'
import type { UserProfile } from '../types/user'
import { getEventCategories } from '../constants/eventCategories'
import '../styles/Dashboard.css'

const eventPriorities: EventPriority[] = ['High', 'Medium', 'Low']

function Dashboard() {
  const eventCategories = getEventCategories()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [emails, setEmails] = useState<StudentEmail[]>([])
  const [suggestedReplies, setSuggestedReplies] = useState<Record<string, string>>({})
  const [replyError, setReplyError] = useState<string | null>(null)
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [suggestions, setSuggestions] = useState<DashboardSuggestion[]>([])
  const [user, setUser] = useState<UserProfile | null>(null)
  const [confirmedSuggestions, setConfirmedSuggestions] = useState<DashboardUpcomingItem[]>([])
  const [editingSuggestion, setEditingSuggestion] = useState<DashboardSuggestion | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [savingSuggestionId, setSavingSuggestionId] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([
      getEmails(),
      getCommitments(),
      getCalendarEvents(),
      getDashboardSuggestions(),
      getUserProfile()
    ])
      .then(([loadedEmails, loadedCommitments, loadedEvents, loadedSuggestions, loadedUser]) => {
        setEmails(loadedEmails)
        try {
          setSuggestedReplies(getSuggestedReplies())
        } catch (error) {
          setReplyError(error instanceof Error ? error.message : 'Unable to load suggested replies.')
        }
        setCommitments(loadedCommitments)
        setEvents(loadedEvents)
        setSuggestions(loadedSuggestions)
        setUser(loadedUser)
        setSummary({
          totalEmails: loadedEmails.length,
          highPriorityEmails: loadedEmails.filter((email) => email.priority === 'High').length,
          commitments: loadedCommitments.length,
          events: loadedEvents.length
        })
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : 'Unable to load dashboard data.')
      })
  }, [])

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

  const handleConfirmSuggestion = async (suggestion: DashboardSuggestion) => {
    setSavingSuggestionId(suggestion.id)
    setActionError(null)

    try {
      const sourceEmail = emails.find((email) => email.id === suggestion.sourceEmailId)
      const confirmed = confirmDashboardSuggestion(suggestion, sourceEmail?.email ?? '')

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

  if (!summary || !user) {
    return <section className="dashboard-page" role="status">Loading dashboard...</section>
  }

  return (
    <section className="dashboard-page">
      <div className="summary-container">
        <h2>Your Overview</h2>

        <p className="summary-description">
          Welcome back, {user.name}! Stay on top of important emails, commitments, and upcoming events.
        </p>

        {actionError && <p className="suggestion-action-error" role="alert">{actionError}</p>}

        <SummaryCards summary={summary} />

        <div className="dashboard-sections">
          <PlannerKey categories={eventCategories} page="dashboard" />
          <ReviewSuggestionsPanel
            suggestions={suggestions}
            emails={emails}
            eventCategories={eventCategories}
            eventPriorities={eventPriorities}
            editingSuggestion={editingSuggestion}
            savingSuggestionId={savingSuggestionId}
            onEditingSuggestionChange={setEditingSuggestion}
            onConfirm={handleConfirmSuggestion}
            onDismiss={handleDismissSuggestion}
            onSave={handleSaveSuggestion}
          />
          <UpcomingPanel items={upcomingItems} />
        </div>

        <SuggestedRepliesPanel
          emails={emails}
          replies={suggestedReplies}
          error={replyError}
          onRepliesChange={setSuggestedReplies}
        />
      </div>
    </section>
  )
}

export default Dashboard
