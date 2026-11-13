import type { Dispatch, SetStateAction } from 'react'
import { PlannerItemAction, PlannerItemCard } from '../../components/PlannerItemCard'
import type { EventCategory, EventPriority } from '../../types/calendarEvent'
import type { CalendarSuggestion } from './types'
import { formatFullDate, formatTime } from './formatters'

type CalendarSuggestionsPanelProps = {
  suggestions: CalendarSuggestion[]
  categoryOptions: EventCategory[]
  priorityOptions: EventPriority[]
  suggestionError: string | null
  savingSuggestionId: number | null
  editingSuggestion: CalendarSuggestion | null
  onEditingSuggestionChange: Dispatch<SetStateAction<CalendarSuggestion | null>>
  onConfirmSuggestion: (suggestion: CalendarSuggestion) => void
  onDismissSuggestion: (id: number) => void
  onSaveSuggestion: () => void
}

function CalendarSuggestionsPanel({
  suggestions,
  categoryOptions,
  priorityOptions,
  suggestionError,
  savingSuggestionId,
  editingSuggestion,
  onEditingSuggestionChange,
  onConfirmSuggestion,
  onDismissSuggestion,
  onSaveSuggestion
}: CalendarSuggestionsPanelProps) {
  return (
    <section className="calendar-panel suggested-events-panel" aria-labelledby="calendar-suggested-events-heading">
      <div className="suggested-events-panel-header">
        <h3 id="calendar-suggested-events-heading">Suggested Events</h3>
        <span className="suggested-events-count">{suggestions.length}</span>
      </div>
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
                actionsPlacement="bottom"
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
    </section>
  )
}

export default CalendarSuggestionsPanel
