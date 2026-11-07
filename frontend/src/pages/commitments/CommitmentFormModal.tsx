import type { Commitment } from '../../types/commitment'
import type { EventCategory } from '../../types/calendarEvent'
import { priorityOptions } from './types'

type CommitmentFormModalProps = {
  commitment: Commitment
  isAdding: boolean
  error: string | null
  categories: EventCategory[]
  onChange: (commitment: Commitment) => void
  onClose: () => void
  onSave: () => void
  onDelete: (id: number) => void
}

function CommitmentFormModal({
  commitment,
  isAdding,
  error,
  categories,
  onChange,
  onClose,
  onSave,
  onDelete
}: CommitmentFormModalProps) {
  return (
    <div className="commitment-modal-backdrop" onClick={onClose}>
      <div
        className="commitment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-commitment-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="commitment-modal-header">
          <h3 id="edit-commitment-title">{isAdding ? 'Add Commitment' : 'Edit Commitment'}</h3>
          <button type="button" className="commitment-close-button" onClick={onClose} aria-label="Close form">
            ×
          </button>
        </div>

        <div className="commitment-form-grid">
          <label>
            <span>Title</span>
            <input
              type="text"
              required
              value={commitment.name}
              onChange={(event) => onChange({ ...commitment, name: event.target.value })}
            />
          </label>
          <label>
            <span>Course</span>
            <input
              type="text"
              required
              value={commitment.course}
              onChange={(event) => onChange({ ...commitment, course: event.target.value })}
            />
          </label>
          <label>
            <span>Due date</span>
            <input
              type="date"
              required
              value={commitment.dueDate}
              onChange={(event) => onChange({ ...commitment, dueDate: event.target.value })}
            />
          </label>
          <label>
            <span>Due time</span>
            <input
              type="time"
              required
              value={commitment.dueTime}
              onChange={(event) => onChange({ ...commitment, dueTime: event.target.value })}
            />
          </label>
          <label>
            <span>Category</span>
            <select
              value={commitment.category}
              onChange={(event) => onChange({ ...commitment, category: event.target.value as EventCategory })}
            >
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label>
            <span>Priority</span>
            <select
              value={commitment.priority}
              onChange={(event) => onChange({ ...commitment, priority: event.target.value as Commitment['priority'] })}
            >
              {priorityOptions.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </select>
          </label>
          <label>
            <span>Source email</span>
            <input
              type="email"
              value={commitment.sourceEmail}
              onChange={(event) => onChange({ ...commitment, sourceEmail: event.target.value })}
            />
          </label>
        </div>

        {error && <p className="commitment-action-error" role="alert">{error}</p>}

        <div className="commitment-modal-actions">
          {!isAdding && (
            <button type="button" className="commitment-modal-delete" onClick={() => onDelete(commitment.id)}>
              Delete
            </button>
          )}
          <div>
            <button type="button" className="commitment-modal-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="commitment-modal-save" onClick={onSave}>
              {isAdding ? 'Add Commitment' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CommitmentFormModal
