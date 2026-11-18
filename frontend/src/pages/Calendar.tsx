import { useEffect, useMemo, useState } from 'react'
import { PlannerKey } from '../components/PlannerKey'
import CalendarEventFormModal from './calendar/CalendarEventFormModal'
import CommitmentFormModal from './commitments/CommitmentFormModal'
import CalendarGrid from './calendar/CalendarGrid'
import CalendarSidebar from './calendar/CalendarSidebar'
import CalendarSuggestionsPanel from './calendar/CalendarSuggestionsPanel'
import CalendarToolbar from './calendar/CalendarToolbar'
import {
  getDateFromIso,
  getIsoDate,
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

type CalendarProps = {
  selectionRequest: PlannerItemSelection | null
  onSelectionHandled: () => void
  onViewInCommitments: (request: PlannerItemSelection) => void
}

function Calendar({ selectionRequest, onSelectionHandled, onViewInCommitments }: CalendarProps) {
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
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formKind, setFormKind] = useState<'Calendar event' | 'Commitment'>('Calendar event')
  const [formData, setFormData] = useState<EventFormState>(() => createEmptyForm(new Date()))
  const [formError, setFormError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
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

  useEffect(() => {
    Promise.all([getCalendarEvents(), getCommitments(), getDashboardSuggestions(), getEmails()])
      .then(([loadedEvents, loadedCommitments, loadedSuggestions, loadedEmails]) => {
        setEvents(loadedEvents)
        setCommitments(loadedCommitments)
        setSuggestions(
          loadedSuggestions.filter(
            (suggestion): suggestion is CalendarSuggestion => suggestion.kind === 'Calendar event'
          )
        )
        setEmails(loadedEmails)
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : 'Unable to load calendar events.')
      })
      .finally(() => setIsLoading(false))
  }, [])

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
        title: event.title,
        date: event.date,
        time: event.time,
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
        .filter((event) => event.date === selectedDateIso)
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

  const handleDeleteEvent = (eventId: number) => {
    setEvents((currentEvents) => currentEvents.filter((event) => event.id !== eventId))
    recordPlannerPageChange('calendar')
    setShowEventForm(false)
    setEditingId(null)
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

  const handleFormSubmit = () => {
    const trimmedTitle = formData.title.trim()
    const trimmedCourse = formData.course.trim()
    const trimmedDescription = formData.description.trim()

    if (!trimmedTitle || !trimmedCourse || !formData.date || !formData.time) {
      setFormError('Enter a title, course, date, and time.')
      return
    }

    if (formKind === 'Commitment' && editingId === null) {
      const commitment: Commitment = {
        id: Math.max(Date.now(), ...commitments.map((item) => item.id), ...events.map((item) => item.id)) + 1,
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

    const preparedEvent: CalendarEvent = {
      id: editingId ?? Date.now(),
      title: trimmedTitle,
      course: trimmedCourse,
      date: formData.date,
      time: formData.time,
      category: formData.category,
      priority: formData.priority,
      description: trimmedDescription || 'No additional notes provided.'
    }

    if (editingId !== null) {
      try {
        saveItemCategoryOverride('event', preparedEvent.id, preparedEvent.category)
      } catch (error) {
        setFormError(error instanceof Error ? error.message : 'Unable to save the event category.')
        return
      }
    }

    setEvents((currentEvents) => {
      if (editingId === null) {
        return [...currentEvents, preparedEvent]
      }

      return currentEvents.map((event) =>
        event.id === editingId ? preparedEvent : event
      )
    })
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

  const getScheduleItemsForDay = (day: Date): CalendarScheduleItem[] => {
    const date = getIsoDate(day)

    return [
      ...events
        .filter((event) => event.date === date)
        .map((event) => ({
          id: `event-${event.id}`,
          sourceId: event.id,
          title: event.title,
          date: event.date,
          time: event.time,
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
      <div className={`calendar-layout ${viewMode === 'week' ? 'week-layout' : ''}`}>
        <div className="calendar-panel">
          <CalendarToolbar
            currentMonth={currentMonth}
            viewMode={viewMode}
            onMonthChange={handleMonthChange}
            onMonthSelect={handleMonthSelect}
            onJumpToToday={jumpToToday}
            onViewModeChange={setViewMode}
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