import SuggestedReplyCard from './SuggestedReplyCard'
import { getSuggestedReplies } from '../services/suggestedReplies'
import type { StudentEmail } from '../types/email'
import './SuggestedRepliesPanel.css'

type SuggestedRepliesPanelProps = {
  emails: StudentEmail[]
  replies: Record<string, string>
  error?: string | null
  onRepliesChange: (replies: Record<string, string>) => void
}

function SuggestedRepliesPanel({
  emails,
  replies,
  error,
  onRepliesChange
}: SuggestedRepliesPanelProps) {
  const replyItems = emails.filter((email) => Boolean(replies[email.id]))

  const refreshReplies = () => onRepliesChange(getSuggestedReplies())

  return (
    <section className="dashboard-panel suggested-replies-panel" aria-labelledby="suggested-replies-heading">
      <header className="dashboard-panel-header">
        <div>
          <h3 id="suggested-replies-heading">Suggested replies</h3>
          <p>Drafts for messages that may need a response.</p>
        </div>
        <span className="panel-count" aria-label={`${replyItems.length} suggested replies`}>
          {replyItems.length}
        </span>
      </header>

      {error && <p className="suggested-replies-error" role="alert">{error}</p>}

      {replyItems.length > 0 ? (
        <div className="suggested-replies-list">
          {replyItems.map((email) => (
            <SuggestedReplyCard
              key={email.id}
              email={email}
              reply={replies[email.id]}
              onResolve={refreshReplies}
              onSave={refreshReplies}
            />
          ))}
        </div>
      ) : (
        <div className="dashboard-suggestion-empty">
          <p>No suggested replies to review.</p>
        </div>
      )}
    </section>
  )
}

export default SuggestedRepliesPanel
