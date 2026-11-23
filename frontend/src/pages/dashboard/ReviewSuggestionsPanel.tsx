import type { Dispatch, SetStateAction } from 'react'
import { PlannerItemAction, PlannerItemCard } from '../../components/PlannerItemCard'
import type { EventCategory, EventPriority } from '../../types/calendarEvent'
import type { DashboardSuggestion } from '../../types/dashboardSuggestion'
import type { StudentEmail } from '../../types/email'
import type { Priority } from '../../types/commitment'
import { formatDateTime } from './formatters'

type ReviewSuggestionsPanelProps = {
  title: string
  headingId: string
  emptyMessage: string
  suggestions: DashboardSuggestion[]
  emails: StudentEmail[]
  eventCategories: EventCategory[]
  eventPriorities: EventPriority[]
  editingSuggestion: DashboardSuggestion | null
  savingSuggestionId: number | null
  onEditingSuggestionChange: Dispatch<SetStateAction<DashboardSuggestion | null>>
  onConfirm: (suggestion: DashboardSuggestion) => void
  onDismiss: (suggestionId: number) => void
  onSave: () => void
}

function ReviewSuggestionsPanel({
  title,
  headingId,
  emptyMessage,
  suggestions,
  emails,
  eventCategories,
  eventPriorities,
  editingSuggestion,
  savingSuggestionId,
  onEditingSuggestionChange,
  onConfirm,
  onDismiss,
  onSave
}: ReviewSuggestionsPanelProps) {
  return (
    <section className="dashboard-panel" aria-labelledby={headingId}>
      <div className="dashboard-panel-header">
        <div>
          <h3 id={headingId}>{title}</h3>
          <p>Review these suggestions before adding them.</p>
        </div>
        <span className="panel-count">{suggestions.length}</span>
      </div>

      {suggestions.length ? (
        <div className="dashboard-item-list">
          {suggestions.map((suggestion) => {
            const sourceEmail = emails.find((email) => email.id === suggestion.sourceEmailId)
            const isEditing = editingSuggestion?.id === suggestion.id

            return (
              <PlannerItemCard
                key={suggestion.id}
                kind={suggestion.kind}
                title={suggestion.title}
                category={suggestion.category}
                priority={suggestion.priority}
                dateLabel={formatDateTime(suggestion.date, suggestion.time)}
                subtitle={suggestion.kind === 'Calendar event'
                  ? suggestion.course
                  : sourceEmail ? `From: ${sourceEmail.subject}` : undefined}
                description={suggestion.description}
                isSuggestion
                isEditing={isEditing}
                actionsPlacement="bottom"
                actions={isEditing ? (
                  <>
                    <PlannerItemAction kind="save" onClick={onSave} />
                    <PlannerItemAction kind="cancel" onClick={() => onEditingSuggestionChange(null)} />
                  </>
                ) : (
                  <>
                    <PlannerItemAction
                      kind="confirm"
                      disabled={savingSuggestionId === suggestion.id}
                      label={savingSuggestionId === suggestion.id ? 'Adding...' : undefined}
                      onClick={() => onConfirm(suggestion)}
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
                      onClick={() => onDismiss(suggestion.id)}
                    />
                  </>
                )}
              >
                {isEditing && editingSuggestion && (
                  <div className="suggestion-edit-form">
                    <div className="suggestion-edit-form-grid">
                      <label>
                        <span>Title</span>
                        <input
                          type="text"
                          value={editingSuggestion.title}
                          onChange={(event) =>
                            onEditingSuggestionChange((current) =>
                              current ? { ...current, title: event.target.value } : current
                            )
                          }
                        />
                      </label>

                      {editingSuggestion.kind === 'Commitment' && (
                        <>
                          <label>
                            <span>Category</span>
                            <select
                              value={editingSuggestion.category}
                              onChange={(event) =>
                                onEditingSuggestionChange((current) =>
                                  current?.kind === 'Commitment'
                                    ? { ...current, category: event.target.value as EventCategory }
                                    : current
                                )
                              }
                            >
                              {eventCategories.map((category) => (
                                <option key={category} value={category}>{category}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span>Priority</span>
                            <select
                              value={editingSuggestion.priority}
                              onChange={(event) =>
                                onEditingSuggestionChange((current) =>
                                  current?.kind === 'Commitment'
                                    ? { ...current, priority: event.target.value as Priority }
                                    : current
                                )
                              }
                            >
                              {eventPriorities.map((priority) => (
                                <option key={priority} value={priority}>{priority}</option>
                              ))}
                            </select>
                          </label>
                        </>
                      )}

                      {editingSuggestion.kind === 'Calendar event' && (
                        <label>
                          <span>Course</span>
                          <input
                            type="text"
                            value={editingSuggestion.course}
                            onChange={(event) =>
                              onEditingSuggestionChange((current) =>
                                current?.kind === 'Calendar event'
                                  ? { ...current, course: event.target.value }
                                  : current
                              )
                            }
                          />
                        </label>
                      )}

                      <label>
                        <span>Date</span>
                        <input
                          type="date"
                          value={editingSuggestion.date}
                          onChange={(event) =>
                            onEditingSuggestionChange((current) =>
                              current ? { ...current, date: event.target.value } : current
                            )
                          }
                        />
                      </label>
                      <label>
                        <span>Time</span>
                        <input
                          type="time"
                          value={editingSuggestion.time}
                          onChange={(event) =>
                            onEditingSuggestionChange((current) =>
                              current ? { ...current, time: event.target.value } : current
                            )
                          }
                        />
                      </label>

                      {editingSuggestion.kind === 'Calendar event' && (
                        <>
                          <label>
                            <span>Category</span>
                            <select
                              value={editingSuggestion.category}
                              onChange={(event) =>
                                onEditingSuggestionChange((current) =>
                                  current?.kind === 'Calendar event'
                                    ? { ...current, category: event.target.value as EventCategory }
                                    : current
                                )
                              }
                            >
                              {eventCategories.map((category) => (
                                <option key={category} value={category}>{category}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span>Priority</span>
                            <select
                              value={editingSuggestion.priority}
                              onChange={(event) =>
                                onEditingSuggestionChange((current) =>
                                  current?.kind === 'Calendar event'
                                    ? { ...current, priority: event.target.value as EventPriority }
                                    : current
                                )
                              }
                            >
                              {eventPriorities.map((priority) => (
                                <option key={priority} value={priority}>{priority}</option>
                              ))}
                            </select>
                          </label>
                          <label className="suggestion-full-width">
                            <span>Description</span>
                            <textarea
                              value={editingSuggestion.description}
                              onChange={(event) =>
                                onEditingSuggestionChange((current) =>
                                  current?.kind === 'Calendar event'
                                    ? { ...current, description: event.target.value }
                                    : current
                                )
                              }
                              rows={4}
                            />
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </PlannerItemCard>
            )
          })}
        </div>
      ) : (
        <div className="dashboard-suggestion-empty">
          <p>{emptyMessage}</p>
        </div>
      )}
    </section>
  )
}

export default ReviewSuggestionsPanel
