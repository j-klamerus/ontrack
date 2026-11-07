import type { Dispatch, SetStateAction } from 'react'
import type { EventCategory, EventFormState, EventPriority } from '../../types/calendarEvent'

type CalendarEventFormModalProps = {
  editingId: number | null
  formKind: 'Calendar event' | 'Commitment'
  formData: EventFormState
  formError: string | null
  categories: EventCategory[]
  priorityOptions: EventPriority[]
  setFormKind: (kind: 'Calendar event' | 'Commitment') => void
  setFormData: Dispatch<SetStateAction<EventFormState>>
  onClose: () => void
  onDelete: (eventId: number) => void
  onSubmit: () => void
}

function CalendarEventFormModal({
  editingId,
  formKind,
  formData,
  formError,
  categories,
  priorityOptions,
  setFormKind,
  setFormData,
  onClose,
  onDelete,
  onSubmit
}: CalendarEventFormModalProps) {
  return (
    <div className="event-modal-backdrop" onClick={onClose}>
      <div className="event-modal" onClick={(event) => event.stopPropagation()}>
        <div className="event-modal-header">
          <h3>
            {editingId !== null
              ? 'Edit Event'
              : `Add ${formKind === 'Commitment' ? 'Commitment' : 'Event'}`}
          </h3>
          <button type="button" className="close-button" onClick={onClose} aria-label="Close form">
            ×
          </button>
        </div>

        <div className="form-grid">
          {editingId === null && (
            <label>
              <span>Type</span>
              <select
                value={formKind}
                onChange={(event) => setFormKind(event.target.value as 'Calendar event' | 'Commitment')}
              >
                <option value="Calendar event">Calendar event</option>
                <option value="Commitment">Commitment</option>
              </select>
            </label>
          )}

          <label>
            <span>Title</span>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <label>
            <span>Course</span>
            <input
              type="text"
              required
              value={formData.course}
              onChange={(event) => setFormData((current) => ({ ...current, course: event.target.value }))}
            />
          </label>
          <label>
            <span>Date</span>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(event) => setFormData((current) => ({ ...current, date: event.target.value }))}
            />
          </label>
          <label>
            <span>Time</span>
            <input
              type="time"
              required
              value={formData.time}
              onChange={(event) => setFormData((current) => ({ ...current, time: event.target.value }))}
            />
          </label>
          <label>
            <span>Category</span>
            <select
              value={formData.category}
              onChange={(event) => setFormData((current) => ({
                ...current,
                category: event.target.value as EventCategory
              }))}
            >
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label>
            <span>Priority</span>
            <select
              value={formData.priority}
              onChange={(event) => setFormData((current) => ({
                ...current,
                priority: event.target.value as EventPriority
              }))}
            >
              {priorityOptions.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </select>
          </label>
          {formKind === 'Calendar event' && (
            <label className="full-width">
              <span>Description</span>
              <textarea
                value={formData.description}
                onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                rows={4}
              />
            </label>
          )}
        </div>

        {formError && <p className="event-form-error" role="alert">{formError}</p>}

        <div className="modal-actions">
          {editingId !== null && (
            <button type="button" className="delete-button" onClick={() => onDelete(editingId)}>
              Delete
            </button>
          )}
          <div className="modal-right-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="primary-button" onClick={onSubmit}>
              {editingId !== null
                ? 'Save Event'
                : `Add ${formKind === 'Commitment' ? 'Commitment' : 'Event'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CalendarEventFormModal
