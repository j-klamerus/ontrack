import type { Dispatch, SetStateAction } from 'react'
import { PlannerItemAction, PlannerItemCard } from '../../components/PlannerItemCard'
import type { EventCategory } from '../../types/calendarEvent'
import type { StudentEmail } from '../../types/email'
import type { CommitmentSuggestion } from './types'
import { formatDueDate } from './utils'
import { priorityOptions } from './types'

type SuggestedCommitmentsPanelProps = {
  suggestions: CommitmentSuggestion[]
  emails: StudentEmail[]
  categories: EventCategory[]
  editingSuggestion: CommitmentSuggestion | null
  savingSuggestionId: number | null
  error: string | null
  onEditingSuggestionChange: Dispatch<SetStateAction<CommitmentSuggestion | null>>
  onConfirm: (suggestion: CommitmentSuggestion) => void
  onDismiss: (suggestionId: number) => void
  onSave: () => void
}

function SuggestedCommitmentsPanel({
  suggestions,
  emails,
  categories,
  editingSuggestion,
  savingSuggestionId,
  error,
  onEditingSuggestionChange,
  onConfirm,
  onDismiss,
  onSave
}: SuggestedCommitmentsPanelProps) {
  return (
    <section className="commitment-section suggested-commitments" aria-labelledby="suggested-commitments-heading">
      <div className="suggested-commitments-header">
        <div>
          <h2 id="suggested-commitments-heading">Suggested Commitments</h2>
          <p>Review commitments identified from your emails.</p>
        </div>
        <span className="panel-count">{suggestions.length}</span>
      </div>

      {error && <p className="suggestion-error" role="alert">{error}</p>}

      {suggestions.length > 0 ? (
        <div className="suggested-commitment-list">
          {suggestions.map((suggestion) => {
            const sourceEmail = emails.find((email) => email.id === suggestion.sourceEmailId)
            const isEditing = editingSuggestion?.id === suggestion.id

            return (
              <PlannerItemCard
                key={suggestion.id}
                kind="Commitment"
                title={suggestion.title}
                category={suggestion.category}
                priority={suggestion.priority}
                dateLabel={`Due ${formatDueDate(suggestion.date, suggestion.time)}`}
                subtitle={sourceEmail ? `From: ${sourceEmail.subject}` : undefined}
                description={suggestion.description}
                isSuggestion
                isEditing={isEditing}
                actionsPlacement="right"
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
                  <div className="commitment-suggestion-edit-form">
                    <div className="commitment-suggestion-edit-grid">
                      <label>
                        <span>Title</span>
                        <input
                          type="text"
                          required
                          value={editingSuggestion.title}
                          onChange={(event) =>
                            onEditingSuggestionChange((current) =>
                              current ? { ...current, title: event.target.value } : current
                            )
                          }
                        />
                      </label>
                      <label>
                        <span>Due date</span>
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
                        <span>Due time</span>
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
                      <label>
                        <span>Category</span>
                        <select
                          value={editingSuggestion.category}
                          onChange={(event) =>
                            onEditingSuggestionChange((current) =>
                              current
                                ? { ...current, category: event.target.value as EventCategory }
                                : current
                            )
                          }
                        >
                          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                        </select>
                      </label>
                      <label>
                        <span>Priority</span>
                        <select
                          value={editingSuggestion.priority}
                          onChange={(event) =>
                            onEditingSuggestionChange((current) =>
                              current ? { ...current, priority: event.target.value as CommitmentSuggestion['priority'] } : current
                            )
                          }
                        >
                          {priorityOptions.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                        </select>
                      </label>
                    </div>
                  </div>
                )}
              </PlannerItemCard>
            )
          })}
        </div>
      ) : (
        <div className="empty-state">
          <p>No suggested commitments to review.</p>
        </div>
      )}
    </section>
  )
}

export default SuggestedCommitmentsPanel
