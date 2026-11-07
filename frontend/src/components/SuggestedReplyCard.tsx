import { useState } from 'react'
import { PlannerItemAction } from './PlannerItemCard'
import { resolveSuggestedReply, saveSuggestedReply } from '../services/suggestedReplies'
import type { StudentEmail } from '../types/email'
import './SuggestedReplyCard.css'

type SuggestedReplyCardProps = {
  email: StudentEmail
  reply: string
  onResolve: (emailId: number) => void
  onSave: (emailId: number, reply: string) => void
}

function SuggestedReplyCard({ email, reply, onResolve, onSave }: SuggestedReplyCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(reply)
  const [error, setError] = useState<string | null>(null)

  const handleResolve = (status: 'confirmed' | 'dismissed') => {
    try {
      resolveSuggestedReply(email.id, status)
      onResolve(email.id)
      setError(null)
    } catch (resolveError) {
      setError(resolveError instanceof Error ? resolveError.message : 'Unable to update the suggested reply.')
    }
  }

  const handleSave = () => {
    const updatedReply = draft.trim()
    if (!updatedReply) {
      setError('Enter a reply before saving.')
      return
    }

    try {
      saveSuggestedReply(email.id, updatedReply)
      onSave(email.id, updatedReply)
      setIsEditing(false)
      setError(null)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save the suggested reply.')
    }
  }

  return (
    <article className="planner-item-card planner-item-card-suggestion suggested-reply-item">
      <div className="planner-item-content">
        <div className="planner-item-labels">
          <span className="planner-item-kind">Suggested reply</span>
          {email.signals.map((signal) => (
            <span className="planner-item-category" key={signal}>{signal}</span>
          ))}
          <span className={`priority-badge priority-${email.priority.toLowerCase()}`}>
            {email.priority}
          </span>
        </div>
        <h4 className="planner-item-title">{email.subject}</h4>
        <p className="planner-item-subtitle">To: {email.sender}</p>
        {isEditing ? (
          <textarea
            className="suggested-reply-editor"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={5}
            aria-label={`Edit suggested reply to ${email.sender}`}
          />
        ) : (
          <p className="planner-item-description suggested-reply-content">{reply}</p>
        )}
        {error && <p className="suggested-reply-card-error" role="alert">{error}</p>}
      </div>
      <div className="planner-item-actions suggested-reply-actions">
        {isEditing ? (
          <>
            <PlannerItemAction kind="save" onClick={handleSave} />
            <PlannerItemAction
              kind="cancel"
              onClick={() => {
                setDraft(reply)
                setIsEditing(false)
                setError(null)
              }}
            />
          </>
        ) : (
          <>
            <PlannerItemAction kind="send" onClick={() => handleResolve('confirmed')} />
            <PlannerItemAction
              kind="edit"
              onClick={() => {
                setDraft(reply)
                setIsEditing(true)
                setError(null)
              }}
            />
            <PlannerItemAction
              kind="delete"
              label="Dismiss"
              onClick={() => handleResolve('dismissed')}
            />
          </>
        )}
      </div>
    </article>
  )
}

export default SuggestedReplyCard
