import { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  Clock3
} from 'lucide-react'
import '../styles/Calendar.css'

type EventCategory = 'Assignment' | 'Exam' | 'Meeting' | 'Appointment' | 'Deadline'
type EventPriority = 'High' | 'Medium' | 'Low'

type CalendarEvent = {
  id: number
  title: string
  course: string
  date: string
  time: string
  category: EventCategory
  priority: EventPriority
  description: string
}

type EventFormState = Omit<CalendarEvent, 'id'>

const categoryColors: Record<EventCategory, string> = {
  Assignment: '#1c8afd',
  Exam: '#d92d20',
  Meeting: '#7c3aed',
  Appointment: '#14b8a6',
  Deadline: '#f59e0b'
}

const categoryOptions: EventCategory[] = [
  'Assignment',
  'Exam',
  'Meeting',
  'Appointment',
  'Deadline'
]

const priorityOptions: EventPriority[] = ['High', 'Medium', 'Low']

const getIsoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const getDateFromIso = (isoDate: string) => new Date(`${isoDate}T12:00:00`)

const startOfWeek = (date: Date) => {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  result.setDate(result.getDate() - result.getDay())
  return result
}

const getMonthName = (date: Date) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date)

const formatFullDate = (isoDate: string) =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(getDateFromIso(isoDate))

const formatTime = (time: string) =>
  new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(`2000-01-01T${time}:00`))

const buildSampleEvents = (): CalendarEvent[] => {
  const today = new Date()
  const makeIsoDate = (offsetDays: number) => {
    const date = new Date(today)
    date.setHours(0, 0, 0, 0)
    date.setDate(today.getDate() + offsetDays)
    return getIsoDate(date)
  }

  return [
    {
      id: 1,
      title: 'Capstone Proposal Draft',
      course: 'CIT 485',
      date: makeIsoDate(1),
      time: '09:00',
      category: 'Assignment',
      priority: 'High',
      description: 'Finalize the proposal outline and submit the first draft for review.'
    },
    {
      id: 2,
      title: 'Biology Exam',
      course: 'BIO 210',
      date: makeIsoDate(3),
      time: '13:30',
      category: 'Exam',
      priority: 'High',
      description: 'Unit 3 exam covering cell respiration and lab techniques.'
    },
    {
      id: 3,
      title: 'Group Project Meeting',
      course: 'CS 350',
      date: makeIsoDate(5),
      time: '14:00',
      category: 'Meeting',
      priority: 'Medium',
      description: 'Team check-in to review sprint progress and assign next tasks.'
    },
    {
      id: 4,
      title: 'Career Center Advising',
      course: 'Career Development',
      date: makeIsoDate(7),
      time: '11:00',
      category: 'Appointment',
      priority: 'Medium',
      description: 'Advisor appointment to review internship application strategy.'
    },
    {
      id: 5,
      title: 'History Essay Deadline',
      course: 'HIST 120',
      date: makeIsoDate(-2),
      time: '23:59',
      category: 'Deadline',
      priority: 'High',
      description: 'Final draft submission for the primary source analysis essay.'
    },
    {
      id: 6,
      title: 'Math Quiz Review',
      course: 'MATH 220',
      date: makeIsoDate(10),
      time: '18:15',
      category: 'Assignment',
      priority: 'Medium',
      description: 'Review worksheets for derivatives and optimization practice.'
    },
    {
      id: 7,
      title: 'Professor Office Hours',
      course: 'CHEM 130',
      date: makeIsoDate(12),
      time: '16:00',
      category: 'Meeting',
      priority: 'Low',
      description: 'Office hours for lab report feedback and concept clarification.'
    }
  ]
}

const createEmptyForm = (selectedDate: Date): EventFormState => ({
  title: '',
  course: '',
  date: getIsoDate(selectedDate),
  time: '09:00',
  category: 'Assignment',
  priority: 'Medium',
  description: ''
})

function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')
  const [events, setEvents] = useState<CalendarEvent[]>(() => buildSampleEvents())
  const [showEventForm, setShowEventForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<EventFormState>(() => createEmptyForm(new Date()))

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

  const upcomingEvents = useMemo(() => {
    const now = new Date()

    return [...events]
      .filter((event) => new Date(`${event.date}T${event.time}:00`) >= now)
      .sort((left, right) => new Date(`${left.date}T${left.time}:00`).getTime() - new Date(`${right.date}T${right.time}:00`).getTime())
      .slice(0, 5)
  }, [events])

  const selectedDayEvents = useMemo(
    () =>
      [...events]
        .filter((event) => event.date === selectedDateIso)
        .sort((left, right) => left.time.localeCompare(right.time)),
    [events, selectedDateIso]
  )

  const openAddForm = () => {
    setEditingId(null)
    setFormData(createEmptyForm(selectedDate))
    setShowEventForm(true)
  }

  const openEditForm = (event: CalendarEvent) => {
    setEditingId(event.id)
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
    setShowEventForm(false)
    setEditingId(null)
  }

  const handleFormSubmit = () => {
    const trimmedTitle = formData.title.trim()
    const trimmedCourse = formData.course.trim()
    const trimmedDescription = formData.description.trim()

    if (!trimmedTitle || !trimmedCourse || !formData.date || !formData.time) {
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

    setEvents((currentEvents) => {
      if (editingId === null) {
        return [...currentEvents, preparedEvent]
      }

      return currentEvents.map((event) =>
        event.id === editingId ? preparedEvent : event
      )
    })

    setSelectedDate(getDateFromIso(formData.date))
    setShowEventForm(false)
    setEditingId(null)
  }

  const handleMonthChange = (change: number) => {
    const nextMonth = new Date(currentMonth)
    nextMonth.setMonth(nextMonth.getMonth() + change)
    setCurrentMonth(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1))
  }

  const jumpToToday = () => {
    const now = new Date()
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDate(now)
  }

  const dayEventCount = (day: Date) =>
    events.filter((event) => event.date === getIsoDate(day)).length

  return (
    <section className="calendar-page">
      <header className="calendar-header">
        <div>
          <p className="eyebrow">Academic plan</p>
          <h2>Calendar</h2>
          <p className="calendar-subtitle">Demo data only — this will later connect to real student commitments and Google Calendar.</p>
        </div>

        <button type="button" className="future-sync-button" title="Future Google Calendar sync feature" disabled>
          Google Calendar Sync (Future)
        </button>
      </header>

      <div className="calendar-layout">
        <div className="calendar-panel">
          <div className="calendar-toolbar">
            <div className="month-controls">
              <button type="button" aria-label="Previous month" onClick={() => handleMonthChange(-1)}>
                <ChevronLeft size={18} />
              </button>

              <h3>{getMonthName(currentMonth)}</h3>

              <button type="button" aria-label="Next month" onClick={() => handleMonthChange(1)}>
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="toolbar-actions">
              <button type="button" className="today-button" onClick={jumpToToday}>
                Today
              </button>

              <div className="view-toggle">
                <button
                  type="button"
                  className={viewMode === 'month' ? 'active' : ''}
                  onClick={() => setViewMode('month')}
                >
                  Month
                </button>
                <button
                  type="button"
                  className={viewMode === 'week' ? 'active' : ''}
                  onClick={() => setViewMode('week')}
                >
                  Week
                </button>
              </div>
            </div>
          </div>

          <div className="legend" aria-label="Event legend">
            {categoryOptions.map((category) => (
              <div key={category} className="legend-item">
                <span
                  className="legend-dot"
                  style={{ backgroundColor: categoryColors[category] }}
                  aria-hidden="true"
                />
                <span>{category}</span>
              </div>
            ))}
          </div>

          {viewMode === 'month' ? (
            <div className="month-grid" role="grid" aria-label="Monthly calendar">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
                <div key={dayName} className="day-header">
                  {dayName}
                </div>
              ))}

              {monthDays.map((day) => {
                const isoDay = getIsoDate(day)
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
                const isSelected = isoDay === selectedDateIso
                const isToday = isoDay === getIsoDate(new Date())
                const count = dayEventCount(day)

                return (
                  <button
                    key={isoDay}
                    type="button"
                    className={`day-cell ${isCurrentMonth ? '' : 'muted'} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                    onClick={() => setSelectedDate(day)}
                  >
                    <span className="day-number">{day.getDate()}</span>

                    {count > 0 && (
                      <span className="event-badge">{count} event{count > 1 ? 's' : ''}</span>
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="week-view-scroll">
              <div className="week-view" role="grid" aria-label="Weekly calendar">
                {weekDates.map((day) => {
                  const isoDay = getIsoDate(day)
                  const isSelected = isoDay === selectedDateIso
                  const eventsForDay = events.filter((event) => event.date === isoDay)

                  return (
                    <div key={isoDay} className={`week-column ${isSelected ? 'selected-week' : ''}`}>
                      <button type="button" className="week-day-header" onClick={() => setSelectedDate(day)}>
                        <span>{new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(day)}</span>
                        <strong>{day.getDate()}</strong>
                      </button>

                      <div className="week-events">
                        {eventsForDay.length > 0 ? (
                          eventsForDay.map((event) => (
                            <div
                              key={event.id}
                              className="mini-event"
                              style={{ borderLeftColor: categoryColors[event.category] }}
                            >
                              <span className="mini-title">{event.title}</span>
                              <span className="mini-meta">{event.time}</span>
                            </div>
                          ))
                        ) : (
                          <span className="no-events">No events</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <aside className="event-sidebar">
          <div className="selected-day-header">
            <div>
              <p className="mini-label">Selected day</p>
              <h3>{formatFullDate(selectedDateIso)}</h3>
            </div>

            <button type="button" className="add-event-button" onClick={openAddForm}>
              <Plus size={16} />
              Add
            </button>
          </div>

          <div className="day-event-list">
            {selectedDayEvents.length > 0 ? (
              selectedDayEvents.map((event) => (
                <article key={event.id} className="event-card" style={{ borderLeftColor: categoryColors[event.category] }}>
                  <div className="event-card-header">
                    <span className="event-category" style={{ backgroundColor: `${categoryColors[event.category]}1A`, color: categoryColors[event.category] }}>
                      {event.category}
                    </span>
                    <span className={`event-priority priority-${event.priority.toLowerCase()}`}>
                      {event.priority}
                    </span>
                  </div>

                  <h4>{event.title}</h4>
                  <p className="course-name">{event.course}</p>

                  <div className="event-details">
                    <span>
                      <Clock3 size={14} />
                      {formatTime(event.time)}
                    </span>
                    <span>{formatFullDate(event.date)}</span>
                  </div>

                  <p className="event-description">{event.description}</p>

                  <div className="event-actions">
                    <button type="button" className="icon-button" onClick={() => openEditForm(event)} aria-label={`Edit ${event.title}`}>
                      <Pencil size={15} />
                    </button>
                    <button type="button" className="icon-button delete" onClick={() => handleDeleteEvent(event.id)} aria-label={`Delete ${event.title}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="no-events-card">
                <p>No events scheduled for this day.</p>
              </div>
            )}
          </div>

          <div className="upcoming-section">
            <h3>Upcoming Events</h3>

            {upcomingEvents.length > 0 ? (
              <ul className="upcoming-list">
                {upcomingEvents.map((event) => (
                  <li key={event.id} className="upcoming-item">
                    <span className="upcoming-dot" style={{ backgroundColor: categoryColors[event.category] }} aria-hidden="true" />
                    <div>
                      <strong>{event.title}</strong>
                      <span>{event.course}</span>
                      <small>{formatFullDate(event.date)} • {formatTime(event.time)}</small>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-upcoming">No upcoming events in the demo schedule.</p>
            )}
          </div>
        </aside>
      </div>

      {showEventForm && (
        <div className="event-modal-backdrop" onClick={() => setShowEventForm(false)}>
          <div className="event-modal" onClick={(event) => event.stopPropagation()}>
            <div className="event-modal-header">
              <h3>{editingId === null ? 'Add Event' : 'Edit Event'}</h3>
              <button type="button" className="close-button" onClick={() => setShowEventForm(false)} aria-label="Close form">
                ×
              </button>
            </div>

            <div className="form-grid">
              <label>
                <span>Title</span>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
                />
              </label>

              <label>
                <span>Course</span>
                <input
                  type="text"
                  value={formData.course}
                  onChange={(event) => setFormData((current) => ({ ...current, course: event.target.value }))}
                />
              </label>

              <label>
                <span>Date</span>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(event) => setFormData((current) => ({ ...current, date: event.target.value }))}
                />
              </label>

              <label>
                <span>Time</span>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(event) => setFormData((current) => ({ ...current, time: event.target.value }))}
                />
              </label>

              <label>
                <span>Category</span>
                <select
                  value={formData.category}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      category: event.target.value as EventCategory
                    }))
                  }
                >
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Priority</span>
                <select
                  value={formData.priority}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      priority: event.target.value as EventPriority
                    }))
                  }
                >
                  {priorityOptions.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </label>

              <label className="full-width">
                <span>Description</span>
                <textarea
                  value={formData.description}
                  onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                  rows={4}
                />
              </label>
            </div>

            <div className="modal-actions">
              {editingId !== null && (
                <button type="button" className="delete-button" onClick={() => handleDeleteEvent(editingId)}>
                  Delete
                </button>
              )}

              <div className="modal-right-actions">
                <button type="button" className="secondary-button" onClick={() => setShowEventForm(false)}>
                  Cancel
                </button>
                <button type="button" className="primary-button" onClick={handleFormSubmit}>
                  Save Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default Calendar