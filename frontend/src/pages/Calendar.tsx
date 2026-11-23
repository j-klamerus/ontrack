/**
 * Calendar page orchestration: local planner data, the selected Google calendar,
 * month/week navigation, event actions, and the add-only sync dialog.
 */
import { useEffect, useMemo, useState } from 'react'
import { PlannerKey } from '../components/PlannerKey'
import CalendarEventFormModal from './calendar/CalendarEventFormModal'
import CommitmentFormModal from './commitments/CommitmentFormModal'
import CalendarGrid from './calendar/CalendarGrid'
import CalendarSidebar from './calendar/CalendarSidebar'
import CalendarSuggestionsPanel from './calendar/CalendarSuggestionsPanel'
import CalendarToolbar from './calendar/CalendarToolbar'
import SyncGoogleEventsModal from './calendar/SyncGoogleEventsModal'
import {
  getDateFromIso,
  getIsoDate,
  isEventOnDate,
  startOfWeek
} from './calendar/formatters'
import type {
  CalendarScheduleItem,
  CalendarSuggestion,
  CalendarViewMode
} from './calendar/types'
import '../styles/Calendar.css'

import { getCalendarEvents } from '../services/calendarEvents'
import { getDashboardSuggestions } from '../services/dashboardSuggestions'
import { getEmails } from '../services/emails'
import {
  canWriteGoogleCalendar,
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  getGoogleCalendarEvents,
  getGoogleCalendars,
  getGoogleCalendarStatus,
  getSelectedGoogleCalendarId,
  resolveSelectedGoogleCalendar,
  toGoogleCalendarEventInput,
  updateGoogleCalendarEvent,
} from '../services/googleCalendar'
import {
  confirmDashboardSuggestion,
  dismissDashboardSuggestion
} from '../services/reviewedSuggestions'
import { recordPlannerPageChange } from '../services/plannerNavigation'
import {
  getEventCategories,
  getEventCategoryColor,
  saveItemCategoryOverride
} from '../constants/eventCategories'
import type { CalendarEvent, EventFormState, EventPriority } from '../types/calendarEvent'
import type { PlannerItemSelection } from '../types/plannerItemSelection'
import {
  addCommitment,
  deleteCommitment,
  getCommitments,
  updateCommitment
} from '../services/commitments'
import type { Commitment } from '../types/commitment'
import type { StudentEmail } from '../types/email'

const priorityOptions: EventPriority[] = ['High', 'Medium', 'Low']

const createEmptyForm = (selectedDate: Date): EventFormState => ({
  title: '',
  course: '',
  date: getIsoDate(selectedDate),
  time: '09:00',
  category: 'Other',
  priority: 'Medium',
  description: ''
})

/** Coordinates calendar views, planner items, and reviewable event suggestions. */
type CalendarProps = {
  userId: string
  selectionRequest: PlannerItemSelection | null
  onSelectionHandled: () => void
  onViewInCommitments: (request: PlannerItemSelection) => void
}

function Calendar({
  userId,
  selectionRequest,
  onSelectionHandled,
  onViewInCommitments
}: CalendarProps) {
  const categoryOptions = getEventCategories()
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = selectionRequest ? getDateFromIso(selectionRequest.date) : new Date()
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState(() =>
    selectionRequest ? getDateFromIso(selectionRequest.date) : new Date()
  )
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [suggestions, setSuggestions] = useState<CalendarSuggestion[]>([])
  const [emails, setEmails] = useState<StudentEmail[]>([])
  const [showEventForm, setShowEventForm] = useState(false)
  const [editingId, setEditingId] = useState<number | string | null>(null)
  const [formKind, setFormKind] = useState<'Calendar event' | 'Commitment'>('Calendar event')
  const [formData, setFormData] = useState<EventFormState>(() => createEmptyForm(new Date()))
  const [formError, setFormError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [googleCalendarError, setGoogleCalendarError] = useState<string | null>(null)
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false)
  const [selectedGoogleCalendarId, setSelectedGoogleCalendarId] = useState<string | null>(null)
  const [selectedGoogleCalendarCanWrite, setSelectedGoogleCalendarCanWrite] = useState(false)
  const [selectedGoogleCalendarName, setSelectedGoogleCalendarName] = useState<string | null>(null)
  const [googleCalendarEventsLoaded, setGoogleCalendarEventsLoaded] = useState(false)
  const [googleAccountName, setGoogleAccountName] = useState<string | null>(null)
  const [isGoogleCalendarLoading, setIsGoogleCalendarLoading] = useState(true)
  const [googleRefresh, setGoogleRefresh] = useState(0)
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [suggestionError, setSuggestionError] = useState<string | null>(null)
  const [savingSuggestionId, setSavingSuggestionId] = useState<number | null>(null)
  const [editingSuggestion, setEditingSuggestion] = useState<CalendarSuggestion | null>(null)
  const [editingCommitment, setEditingCommitment] = useState<Commitment | null>(null)
  const [commitmentFormError, setCommitmentFormError] = useState<string | null>(null)
  const [selectedCalendarItem, setSelectedCalendarItem] = useState<Pick<PlannerItemSelection, 'kind' | 'id'> | null>(() =>
    selectionRequest
      ? { kind: selectionRequest.kind, id: selectionRequest.id }
      : null
  )

  // Load browser-backed planner data separately so Google refreshes preserve local edits.
  useEffect(() => {
    let isMounted = true
    const loadCalendar = async () => {
      setLoadError(null)
      try {
        const [loadedEvents, loadedCommitments, loadedSuggestions, loadedEmails] = await Promise.all([
          getCalendarEvents(),
          getCommitments(),
          getDashboardSuggestions(),
          getEmails()
        ])
        if (!isMounted) {
          return
        }

        setEvents((currentEvents) => [
          ...loadedEvents,
          ...currentEvents.filter((event) => event.googleEventId)
        ])
        setCommitments(loadedCommitments)
        setSuggestions(
          loadedSuggestions.filter(
            (suggestion): suggestion is CalendarSuggestion => suggestion.kind === 'Calendar event'
          )
        )
        setEmails(loadedEmails)
      } catch (error) {
        if (isMounted) {
          setLoadError(error instanceof Error ? error.message : 'Unable to load calendar events.')
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadCalendar()
    return () => {
      isMounted = false
    }
  }, [userId])

  const selectedWeekStart = viewMode === 'week' ? getIsoDate(startOfWeek(selectedDate)) : ''

  // Replace only Google events on range changes; cleanup prevents stale requests from updating state.
  useEffect(() => {
    let isMounted = true
    const loadGoogleCalendar = async () => {
      setIsGoogleCalendarLoading(true)
      setGoogleCalendarError(null)
      setGoogleCalendarConnected(false)
      setSelectedGoogleCalendarId(null)
      setSelectedGoogleCalendarCanWrite(false)
      setSelectedGoogleCalendarName(null)
      setGoogleCalendarEventsLoaded(false)
      setGoogleAccountName(null)
      setEvents((currentEvents) => currentEvents.filter((event) => !event.googleEventId))

      try {
        const isConnected = await getGoogleCalendarStatus()
        if (!isMounted) {
          return
        }
        setGoogleCalendarConnected(isConnected)
        if (!isConnected) {
          setSelectedGoogleCalendarId(null)
          setSelectedGoogleCalendarCanWrite(false)
          return
        }

        const calendars = await getGoogleCalendars()
        if (!isMounted) {
          return
        }
        // Google's primary calendar is conventionally named for the account; no extra OAuth scope is needed.
        setGoogleAccountName(calendars.find((calendar) => calendar.primary)?.summary ?? null)
        const savedCalendarId = await getSelectedGoogleCalendarId(userId)
        if (!isMounted) return
        const selectedCalendar = resolveSelectedGoogleCalendar(calendars, savedCalendarId)
        if (!selectedCalendar) {
          setSelectedGoogleCalendarId(null)
          setSelectedGoogleCalendarCanWrite(false)
          setGoogleCalendarError(savedCalendarId
            ? 'Your selected Google Calendar is no longer available. Choose another calendar in Settings.'
            : 'No Google calendars are available for this account.')
          return
        }

        setSelectedGoogleCalendarId(selectedCalendar.id)
        setSelectedGoogleCalendarCanWrite(canWriteGoogleCalendar(selectedCalendar))
        setSelectedGoogleCalendarName(selectedCalendar.summary)

        // The month grid always renders six weeks; Google timeMax is exclusive.
        const rangeStart = viewMode === 'week'
          ? startOfWeek(getDateFromIso(selectedWeekStart))
          : startOfWeek(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1))
        const rangeEnd = new Date(rangeStart)
        rangeEnd.setDate(rangeEnd.getDate() + (viewMode === 'week' ? 7 : 42))
        const googleEvents = await getGoogleCalendarEvents(
          selectedCalendar.id,
          rangeStart.toISOString(),
          rangeEnd.toISOString()
        )
        if (isMounted) {
          setEvents((currentEvents) => [
            ...currentEvents.filter((event) => !event.googleEventId),
            ...googleEvents
          ])
          setGoogleCalendarEventsLoaded(true)
        }
      } catch (error) {
        if (isMounted) {
          setGoogleCalendarError(
            error instanceof Error ? error.message : 'Unable to load Google Calendar events.'
          )
        }
      } finally {
        if (isMounted) {
          setIsGoogleCalendarLoading(false)
        }
      }
    }

    void loadGoogleCalendar()
    return () => {
      isMounted = false
    }
  }, [currentMonth, googleRefresh, selectedWeekStart, userId, viewMode])

  useEffect(() => {
    if (!selectionRequest || isLoading) {
      return
    }

    const selectedCardId = selectionRequest.kind === 'Calendar event'
      ? `calendar-event-card-${selectionRequest.id}`
      : `calendar-commitment-card-${selectionRequest.id}`
    document
      .getElementById(selectedCardId)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    onSelectionHandled()
  }, [isLoading, onSelectionHandled, selectionRequest])

  const selectedDateIso = getIsoDate(selectedDate)

  const monthDays = useMemo(() => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const start = new Date(firstDay)
    start.setDate(start.getDate() - start.getDay())

    return Array.from({ length: 42 }, (_, index) => {
      const nextDate = new Date(start)
      nextDate.setDate(start.getDate() + index)
      return nextDate
    })
  }, [currentMonth])

  const weekDates = useMemo(() => {
    const start = startOfWeek(selectedDate)

    return Array.from({ length: 7 }, (_, index) => {
      const nextDate = new Date(start)
      nextDate.setDate(start.getDate() + index)
      return nextDate
    })
  }, [selectedDate])

  const upcomingItems = useMemo(() => {
    const now = new Date()

    const items: CalendarScheduleItem[] = [
      ...events.map((event) => ({
        id: `event-${event.id}`,
        sourceId: event.id,
        title: event.googleSourceId !== undefined ? `${event.title} (Google copy)` : event.title,
        date: event.date,
        time: event.time,
        allDay: event.googleAllDay,
        kind: 'Calendar event' as const,
        color: getEventCategoryColor(event.category),
        category: event.category,
        priority: event.priority
      })),
      ...commitments
        .filter((commitment) => !commitment.completed)
        .map((commitment) => ({
          id: `commitment-${commitment.id}`,
          sourceId: commitment.id,
          title: commitment.name,
          date: commitment.dueDate,
          time: commitment.dueTime,
          kind: 'Commitment' as const,
          color: getEventCategoryColor(commitment.category),
          category: commitment.category,
          priority: commitment.priority
        }))
    ]

    return items
      .filter((item) => new Date(`${item.date}T${item.time}:00`) >= now)
      .sort((left, right) => new Date(`${left.date}T${left.time}:00`).getTime() - new Date(`${right.date}T${right.time}:00`).getTime())
      .slice(0, 5)
  }, [commitments, events])

  const selectedDayEvents = useMemo(
    () =>
      [...events]
        .filter((event) => isEventOnDate(event, selectedDateIso))
        .sort((left, right) => left.time.localeCompare(right.time)),
    [events, selectedDateIso]
  )

  const selectedDayCommitments = useMemo(
    () =>
      commitments
        .filter((commitment) =>
          commitment.dueDate === selectedDateIso &&
          (!commitment.completed ||
            (selectedCalendarItem?.kind === 'Commitment' && selectedCalendarItem.id === commitment.id))
        )
        .sort((left, right) => left.dueTime.localeCompare(right.dueTime)),
    [commitments, selectedCalendarItem, selectedDateIso]
  )

  const openAddForm = () => {
    setEditingId(null)
    setFormKind('Calendar event')
    setFormData(createEmptyForm(selectedDate))
    setFormError(null)
    setShowEventForm(true)
  }

  /** Require a connected, writable destination before allowing event selection. */
  const openSyncModal = () => {
    if (!googleCalendarConnected) {
      setGoogleCalendarError('Connect Google Calendar in Settings before syncing events.')
    } else if (!selectedGoogleCalendarId) {
      setGoogleCalendarError('Choose an available Google Calendar in Settings before syncing events.')
    } else if (!selectedGoogleCalendarCanWrite) {
      setGoogleCalendarError('The selected Google Calendar is read-only. Choose a calendar with write access in Settings.')
    } else {
      setShowSyncModal(true)
    }
  }

  const openEditForm = (event: CalendarEvent) => {
    setEditingId(event.id)
    setFormKind('Calendar event')
    setFormError(null)
    setFormData({
      title: event.title,
      course: event.course,
      date: event.date,
      time: event.time,
      category: event.category,
      priority: event.priority,
      description: event.description
    })
    setShowEventForm(true)
  }

  /** Delete Google events remotely; remove local events from this page's state. */
  const handleDeleteEvent = async (eventId: number | string) => {
    const event = events.find((item) => item.id === eventId)
    try {
      if (event?.googleEventId && event.googleCalendarId) {
        await deleteGoogleCalendarEvent(event.googleCalendarId, event.googleEventId)
      }
      setEvents((currentEvents) => currentEvents.filter((item) => item.id !== eventId))
      recordPlannerPageChange('calendar')
      setShowEventForm(false)
      setEditingId(null)
      setFormError(null)
      setGoogleCalendarError(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete the calendar event.'
      setGoogleCalendarError(message)
      setFormError(message)
    }
  }

  const openEditCommitment = (commitment: Commitment) => {
    setEditingCommitment({ ...commitment })
    setCommitmentFormError(null)
  }

  const handleSaveCommitment = () => {
    if (!editingCommitment) {
      return
    }

    if (
      !editingCommitment.name.trim() ||
      !editingCommitment.course.trim() ||
      !editingCommitment.dueDate ||
      !editingCommitment.dueTime
    ) {
      setCommitmentFormError('Enter a title, course, due date, and due time.')
      return
    }

    const updatedCommitment = {
      ...editingCommitment,
      name: editingCommitment.name.trim(),
      course: editingCommitment.course.trim(),
      sourceEmail: editingCommitment.sourceEmail.trim()
    }

    try {
      saveItemCategoryOverride('commitment', updatedCommitment.id, updatedCommitment.category)
      updateCommitment(updatedCommitment)
      setCommitments((current) =>
        current.map((commitment) =>
          commitment.id === updatedCommitment.id ? updatedCommitment : commitment
        )
      )
      recordPlannerPageChange('commitments')
      setEditingCommitment(null)
      setCommitmentFormError(null)
    } catch (error) {
      setCommitmentFormError(error instanceof Error ? error.message : 'Unable to save the commitment.')
    }
  }

  const handleDeleteCommitment = (commitmentId: number) => {
    try {
      deleteCommitment(commitmentId)
      setCommitments((current) =>
        current.filter((commitment) => commitment.id !== commitmentId)
      )
      recordPlannerPageChange('commitments')
      setEditingCommitment(null)
      setCommitmentFormError(null)
    } catch (error) {
      setCommitmentFormError(error instanceof Error ? error.message : 'Unable to delete the commitment.')
    }
  }

  /** Confirm a suggested event into browser-backed reviews, not directly into Google. */
  const handleConfirmSuggestion = (suggestion: CalendarSuggestion) => {
    setSavingSuggestionId(suggestion.id)
    setSuggestionError(null)

    try {
      const sourceEmail = emails.find((email) => email.id === suggestion.sourceEmailId)
      const confirmed = confirmDashboardSuggestion(suggestion, sourceEmail?.email ?? '')
      if (confirmed.kind !== 'Calendar event') {
        throw new Error('This suggestion is not a calendar event.')
      }

      setEvents((currentEvents) => [...currentEvents, confirmed.event])
      setSuggestions((currentSuggestions) =>
        currentSuggestions.filter((item) => item.id !== suggestion.id)
      )
      setEditingSuggestion(null)
    } catch (error) {
      setSuggestionError(error instanceof Error ? error.message : 'Unable to add this suggested event.')
    } finally {
      setSavingSuggestionId(null)
    }
  }

  const handleDismissSuggestion = (suggestionId: number) => {
    try {
      dismissDashboardSuggestion(suggestionId, 'Calendar event')
      setSuggestions((currentSuggestions) =>
        currentSuggestions.filter((suggestion) => suggestion.id !== suggestionId)
      )
      setEditingSuggestion(null)
      setSuggestionError(null)
    } catch (error) {
      setSuggestionError(error instanceof Error ? error.message : 'Unable to dismiss this suggestion.')
    }
  }

  const handleSaveSuggestion = () => {
    if (
      !editingSuggestion ||
      !editingSuggestion.title.trim() ||
      !editingSuggestion.course.trim() ||
      !editingSuggestion.date ||
      !editingSuggestion.time
    ) {
      return
    }

    const updatedSuggestion = {
      ...editingSuggestion,
      title: editingSuggestion.title.trim(),
      course: editingSuggestion.course.trim()
    }
    setSuggestions((currentSuggestions) =>
      currentSuggestions.map((suggestion) =>
        suggestion.id === updatedSuggestion.id ? updatedSuggestion : suggestion
      )
    )
    recordPlannerPageChange('calendar')
    setEditingSuggestion(null)
  }

  /** Route the form to commitments, Google create/update, or local page state. */
  const handleFormSubmit = async () => {
    if (isGoogleCalendarLoading) {
      setFormError('Wait for Google Calendar to finish refreshing before saving.')
      return
    }

    const trimmedTitle = formData.title.trim()
    const trimmedCourse = formData.course.trim()
    const trimmedDescription = formData.description.trim()

    if (!trimmedTitle || !trimmedCourse || !formData.date || !formData.time) {
      setFormError('Enter a title, course, date, and time.')
      return
    }

    if (formKind === 'Commitment' && editingId === null) {
      const commitment: Commitment = {
        id: Math.max(
          Date.now(),
          ...commitments.map((item) => item.id),
          ...events.map((item) => typeof item.id === 'number' ? item.id : 0)
        ) + 1,
        name: trimmedTitle,
        course: trimmedCourse,
        dueDate: formData.date,
        dueTime: formData.time,
        category: formData.category,
        priority: formData.priority,
        completed: false,
        sourceEmail: ''
      }

      try {
        addCommitment(commitment)
      } catch (error) {
        setFormError(error instanceof Error ? error.message : 'Unable to save the commitment.')
        return
      }

      setCommitments((currentCommitments) => [...currentCommitments, commitment])
      recordPlannerPageChange('commitments')
      setSelectedDate(getDateFromIso(formData.date))
      setShowEventForm(false)
      setFormError(null)
      return
    }

    const existingEvent = editingId === null
      ? undefined
      : events.find((event) => event.id === editingId)
    const preparedEvent: CalendarEvent = {
      id: editingId ?? Date.now(),
      title: trimmedTitle,
      course: trimmedCourse,
      date: formData.date,
      time: formData.time,
      category: formData.category,
      priority: formData.priority,
      description: trimmedDescription || 'No additional notes provided.',
      ...(existingEvent?.googleEventId ? { googleEventId: existingEvent.googleEventId } : {}),
      ...(existingEvent?.googleCalendarId ? { googleCalendarId: existingEvent.googleCalendarId } : {}),
      ...(existingEvent?.googleDurationMinutes
        ? { googleDurationMinutes: existingEvent.googleDurationMinutes }
        : {})
    }

    if (editingId !== null) {
      try {
        saveItemCategoryOverride('event', preparedEvent.id, preparedEvent.category)
      } catch (error) {
        setFormError(error instanceof Error ? error.message : 'Unable to save the event category.')
        return
      }
    }

    if (existingEvent?.googleEventId && existingEvent.googleCalendarId) {
      try {
        const eventInput = toGoogleCalendarEventInput(preparedEvent)
        const savedEvent = await updateGoogleCalendarEvent(
          existingEvent.googleCalendarId,
          existingEvent.googleEventId,
          eventInput
        )
        setEvents((currentEvents) =>
          currentEvents.map((event) => event.id === editingId ? savedEvent : event)
        )
      } catch (error) {
        setFormError(error instanceof Error ? error.message : 'Unable to update the Google Calendar event.')
        return
      }
    } else if (editingId === null && googleCalendarConnected) {
      if (!selectedGoogleCalendarId) {
        setFormError('Choose a Google Calendar in Settings before adding events.')
        return
      }
      if (!selectedGoogleCalendarCanWrite) {
        setFormError('The selected Google Calendar is read-only. Choose a calendar with write access in Settings.')
        return
      }

      try {
        const eventInput = toGoogleCalendarEventInput(preparedEvent)
        const savedEvent = await createGoogleCalendarEvent(selectedGoogleCalendarId, eventInput)
        setEvents((currentEvents) => [...currentEvents, savedEvent])
      } catch (error) {
        setFormError(error instanceof Error ? error.message : 'Unable to add the Google Calendar event.')
        return
      }
    } else {
      setEvents((currentEvents) => {
        if (editingId === null) {
          return [...currentEvents, preparedEvent]
        }

        return currentEvents.map((event) =>
          event.id === editingId ? preparedEvent : event
        )
      })
    }

    recordPlannerPageChange('calendar')

    setSelectedDate(getDateFromIso(formData.date))
    setShowEventForm(false)
    setEditingId(null)
    setFormError(null)
  }

  const handleMonthChange = (change: number) => {
    const nextMonth = new Date(currentMonth)
    nextMonth.setMonth(nextMonth.getMonth() + change)
    setCurrentMonth(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1))
    setSelectedDate(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1))
  }

  const handleMonthSelect = (year: number, month: number) => {
    setCurrentMonth(new Date(year, month, 1))
  }

  const jumpToToday = () => {
    const now = new Date()
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDate(now)
    setSelectedCalendarItem(null)
  }

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date)
    setSelectedCalendarItem(null)
  }

  /** Project events and incomplete commitments into the shared day-grid display shape. */
  const getScheduleItemsForDay = (day: Date): CalendarScheduleItem[] => {
    const date = getIsoDate(day)

    return [
      ...events
        .filter((event) => isEventOnDate(event, date))
        .map((event) => ({
          id: `event-${event.id}`,
          sourceId: event.id,
          title: event.googleSourceId !== undefined ? `${event.title} (Google copy)` : event.title,
          date: event.date,
          time: event.time,
          allDay: event.googleAllDay,
          kind: 'Calendar event' as const,
          color: getEventCategoryColor(event.category),
          category: event.category,
          priority: event.priority
        })),
      ...commitments
        .filter((commitment) => commitment.dueDate === date && !commitment.completed)
        .map((commitment) => ({
          id: `commitment-${commitment.id}`,
          sourceId: commitment.id,
          title: commitment.name,
          date: commitment.dueDate,
          time: commitment.dueTime,
          kind: 'Commitment' as const,
          color: getEventCategoryColor(commitment.category),
          category: commitment.category,
          priority: commitment.priority
        }))
    ].sort((left, right) => left.time.localeCompare(right.time))
  }

  if (isLoading) {
    return <section className="calendar-page" role="status">Loading calendar events...</section>
  }

  if (loadError) {
    return <section className="calendar-page" role="alert">{loadError}</section>
  }

  return (
    <section className="calendar-page">
      {googleCalendarError && (
        <p className="calendar-integration-error" role="alert">{googleCalendarError}</p>
      )}
      {googleCalendarConnected && (
        <p className="calendar-integration-status">
          Google Account Connected{googleAccountName ? `: ${googleAccountName}` : ''}
          {googleCalendarEventsLoaded && selectedGoogleCalendarName && (
            <><br />Name of Loaded Calendar: {selectedGoogleCalendarName}</>
          )}
        </p>
      )}
      <div className={`calendar-layout ${viewMode === 'week' ? 'week-layout' : ''}`}>
        <div className="calendar-panel">
          <CalendarToolbar
            currentMonth={currentMonth}
            viewMode={viewMode}
            onMonthChange={handleMonthChange}
            onMonthSelect={handleMonthSelect}
            onJumpToToday={jumpToToday}
            onViewModeChange={setViewMode}
            googleCalendarName={selectedGoogleCalendarName}
            isGoogleCalendarLoading={isGoogleCalendarLoading}
            onRefreshGoogleCalendar={() => setGoogleRefresh((current) => current + 1)}
            onSyncGoogleCalendar={openSyncModal}
          />

          <PlannerKey categories={categoryOptions} page="calendar" />

          <CalendarGrid
            viewMode={viewMode}
            monthDays={monthDays}
            weekDates={weekDates}
            currentMonth={currentMonth}
            selectedDateIso={selectedDateIso}
            getItemsForDay={getScheduleItemsForDay}
            onSelectDate={handleSelectDate}
          />
        </div>

        <CalendarSidebar
          selectedDateIso={selectedDateIso}
          selectedDayEvents={selectedDayEvents}
          selectedDayCommitments={selectedDayCommitments}
          upcomingItems={upcomingItems}
          onAddEvent={openAddForm}
          isGoogleCalendarLoading={isGoogleCalendarLoading}
          onEditEvent={openEditForm}
          onDeleteEvent={handleDeleteEvent}
          onEditCommitment={openEditCommitment}
          onDeleteCommitment={handleDeleteCommitment}
          onViewInCommitments={onViewInCommitments}
          selectedCalendarItem={selectedCalendarItem}
        />
      </div>

      <CalendarSuggestionsPanel
        suggestions={suggestions}
        categoryOptions={categoryOptions}
        priorityOptions={priorityOptions}
        suggestionError={suggestionError}
        savingSuggestionId={savingSuggestionId}
        editingSuggestion={editingSuggestion}
        onEditingSuggestionChange={setEditingSuggestion}
          onConfirmSuggestion={handleConfirmSuggestion}
          onDismissSuggestion={handleDismissSuggestion}
          onSaveSuggestion={handleSaveSuggestion}
      />

      {showEventForm && (
        <CalendarEventFormModal
          editingId={editingId}
          formKind={formKind}
          formData={formData}
          formError={formError}
          categories={categoryOptions}
          priorityOptions={priorityOptions}
          setFormKind={setFormKind}
          setFormData={setFormData}
          onClose={() => setShowEventForm(false)}
          onDelete={handleDeleteEvent}
          onSubmit={handleFormSubmit}
        />
      )}
      {showSyncModal && selectedGoogleCalendarId && selectedGoogleCalendarName && (
        <SyncGoogleEventsModal
          calendarId={selectedGoogleCalendarId}
          calendarName={selectedGoogleCalendarName}
          events={events.filter((event) => !event.googleEventId)}
          onClose={(refresh) => {
            setShowSyncModal(false)
            if (refresh) setGoogleRefresh((current) => current + 1)
          }}
        />
      )}
      {editingCommitment && (
        <CommitmentFormModal
          commitment={editingCommitment}
          isAdding={false}
          error={commitmentFormError}
          categories={categoryOptions}
          onChange={setEditingCommitment}
          onClose={() => {
            setEditingCommitment(null)
            setCommitmentFormError(null)
          }}
          onSave={handleSaveCommitment}
          onDelete={handleDeleteCommitment}
        />
      )}
    </section>
  )
}

export default Calendar