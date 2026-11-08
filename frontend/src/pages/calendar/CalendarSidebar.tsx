import type { Dispatch, SetStateAction } from 'react'
import { Plus } from 'lucide-react'
import { PlannerItemAction, PlannerItemCard } from '../../components/PlannerItemCard'
import type { EventCategory, EventPriority, CalendarEvent } from '../../types/calendarEvent'
import type { Commitment } from '../../types/commitment'
import type { CalendarScheduleItem, CalendarSuggestion } from './types'
import { formatFullDate, formatTime } from './formatters'

type CalendarSidebarProps = {
  selectedDateIso: string
  selectedDayEvents: CalendarEvent[]
  selectedDayCommitments: Commitment[]
  upcomingItems: CalendarScheduleItem[]
  suggestions: CalendarSuggestion[]
  categoryOptions: EventCategory[]
  priorityOptions: EventPriority[]
  suggestionError: string | null
  savingSuggestionId: number | null
  editingSuggestion: CalendarSuggestion | null
  onEditingSuggestionChange: Dispatch<SetStateAction<CalendarSuggestion | null>>
  onAddEvent: () => void
  onEditEvent: (event: CalendarEvent) => void
  onDeleteEvent: (id: number) => void
  onEditCommitment: (commitment: Commitment) => void
  onDeleteCommitment: (id: number) => void
  onConfirmSuggestion: (suggestion: CalendarSuggestion) => void
  onDismissSuggestion: (id: number) => void
  onSaveSuggestion: () => void
}

function CalendarSidebar({
  selectedDateIso,
  selectedDayEvents,
  selectedDayCommitments,
  upcomingItems,
  suggestions,
  categoryOptions,
  priorityOptions,
  suggestionError,
  savingSuggestionId,
  editingSuggestion,
  onEditingSuggestionChange,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  onEditCommitment,
  onDeleteCommitment,
  onConfirmSuggestion,
  onDismissSuggestion,
  onSaveSuggestion
}: CalendarSidebarProps) {
  return (
    <aside className="event-sidebar">
      <div className="selected-day-header">
        <div>
          <p className="mini-label">Selected day</p>
          <h3>{formatFullDate(selectedDateIso)}</h3>
        </div>
        <button type="button" className="add-event-button primary-button" onClick={onAddEvent}>
          <Plus size={16} />
          Add
        </button>
      </div>

      <div className="day-event-list">
        {selectedDayEvents.length + selectedDayCommitments.length > 0 ? (
          <>
            {selectedDayEvents.map((event) => (
              <PlannerItemCard
                key={event.id}
                kind="Calendar event"
                title={event.title}
                category={event.category}
                priority={event.priority}
                dateLabel={`${formatFullDate(event.date)} · ${formatTime(event.time)}`}
                subtitle={event.course}
                description={event.description}
                actionsOnHover
                actionsPlacement="right"
                actions={(
                  <>
                    <PlannerItemAction kind="edit" onClick={() => onEditEvent(event)} />
                    <PlannerItemAction kind="delete" onClick={() => onDeleteEvent(event.id)} />
                  </>
                )}
              />
            ))}
            {selectedDayCommitments.map((commitment) => (
              <PlannerItemCard
                key={commitment.id}
                kind="Commitment"
                title={commitment.name}
                category={commitment.category}
                priority={commitment.priority}
                dateLabel={`Due ${formatFullDate(commitment.dueDate)} · ${formatTime(commitment.dueTime)}`}
                subtitle={commitment.course}
                actionsOnHover
                actionsPlacement="right"
                actions={(
                  <>
                    <PlannerItemAction kind="edit" onClick={() => onEditCommitment(commitment)} />
                    <PlannerItemAction kind="delete" onClick={() => onDeleteCommitment(commitment.id)} />
                  </>
                )}
              />
            ))}
          </>
        ) : (
          <div className="no-events-card">
            <p>No events or commitments scheduled for this day.</p>
          </div>
        )}
      </div>

      <div className="upcoming-section">
        <h3>Coming up</h3>
        {upcomingItems.length > 0 ? (
          <div className="upcoming-list">
            {upcomingItems.map((item) => (
              <PlannerItemCard
                key={item.id}
                kind={item.kind}
                title={item.title}
                category={item.category}
                priority={item.priority}
                dateLabel={`${formatFullDate(item.date)} · ${formatTime(item.time)}`}
              />
            ))}
          </div>
        ) : (
          <p className="empty-upcoming">No upcoming items.</p>
        )}
      </div>

      <div className="suggested-events-section">
        <h3>Suggested Events</h3>
        {suggestionError && <p className="suggestion-error" role="alert">{suggestionError}</p>}
        {suggestions.length > 0 ? (
          <div className="suggested-events-list">
            {suggestions.map((suggestion) => {
              const isEditing = editingSuggestion?.id === suggestion.id

              return (
                <PlannerItemCard
                  key={suggestion.id}
                  kind="Calendar event"
                  title={suggestion.title}
                  category={suggestion.category}
                  priority={suggestion.priority}
                  dateLabel={`${formatFullDate(suggestion.date)} · ${formatTime(suggestion.time)}`}
                  subtitle={suggestion.course}
                  description={suggestion.description}
                  isSuggestion
                  isEditing={isEditing}
                  actionsPlacement="right"
                  actions={isEditing ? (
                    <>
                      <PlannerItemAction kind="save" onClick={onSaveSuggestion} />
                      <PlannerItemAction kind="cancel" onClick={() => onEditingSuggestionChange(null)} />
                    </>
                  ) : (
                    <>
                      <PlannerItemAction
                        kind="confirm"
                        disabled={savingSuggestionId === suggestion.id}
                        label={savingSuggestionId === suggestion.id ? 'Adding...' : undefined}
                        onClick={() => onConfirmSuggestion(suggestion)}
                      />
                      <PlannerItemAction
                        kind="edit"
                        disabled={savingSuggestionId === suggestion.id}
                        onClick={() => onEditingSuggestionChange({ ...suggestion })}
                      />
                      <PlannerItemAction
                        kind="delete"
                        label="Dismiss"
                        disabled={savingSuggestionId === suggestion.id}
                        onClick={() => onDismissSuggestion(suggestion.id)}
                      />
                    </>
                  )}
                >
                  {isEditing && editingSuggestion && (
                    <div className="calendar-suggestion-edit-form">
                      <div className="calendar-suggestion-edit-grid">
                        <label>
                          <span>Title</span>
                          <input
                            type="text"
                            value={editingSuggestion.title}
                            onChange={(event) => onEditingSuggestionChange((current) =>
                              current ? { ...current, title: event.target.value } : current
                            )}
                          />
                        </label>
                        <label>
                          <span>Course</span>
                          <input
                            type="text"
                            value={editingSuggestion.course}
                            onChange={(event) => onEditingSuggestionChange((current) =>
                              current ? { ...current, course: event.target.value } : current
                            )}
                          />
                        </label>
                        <label>
                          <span>Date</span>
                          <input
                            type="date"
                            value={editingSuggestion.date}
                            onChange={(event) => onEditingSuggestionChange((current) =>
                              current ? { ...current, date: event.target.value } : current
                            )}
                          />
                        </label>
                        <label>
                          <span>Time</span>
                          <input
                            type="time"
                            value={editingSuggestion.time}
                            onChange={(event) => onEditingSuggestionChange((current) =>
                              current ? { ...current, time: event.target.value } : current
                            )}
                          />
                        </label>
                        <label>
                          <span>Category</span>
                          <select
                            value={editingSuggestion.category}
                            onChange={(event) => onEditingSuggestionChange((current) =>
                              current ? { ...current, category: event.target.value as EventCategory } : current
                            )}
                          >
                            {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
                          </select>
                        </label>
                        <label>
                          <span>Priority</span>
                          <select
                            value={editingSuggestion.priority}
                            onChange={(event) => onEditingSuggestionChange((current) =>
                              current ? { ...current, priority: event.target.value as EventPriority } : current
                            )}
                          >
                            {priorityOptions.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                          </select>
                        </label>
                        <label className="calendar-suggestion-full-width">
                          <span>Description</span>
                          <textarea
                            rows={3}
                            value={editingSuggestion.description}
                            onChange={(event) => onEditingSuggestionChange((current) =>
                              current ? { ...current, description: event.target.value } : current
                            )}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </PlannerItemCard>
              )
            })}
          </div>
        ) : (
          <p className="empty-upcoming">No suggested events to review.</p>
        )}
      </div>
    </aside>
  )
}

export default CalendarSidebar
