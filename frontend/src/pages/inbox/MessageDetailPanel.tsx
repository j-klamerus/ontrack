import SuggestedReplyCard from '../../components/SuggestedReplyCard'
import type { StudentEmail } from '../../types/email'
import { formatDate } from './types'

type MessageDetailPanelProps = {
  email: StudentEmail | null
  suggestedReply: string | null
  replyError: string | null
  onToggleRead: (id: number) => void
  onToggleImportant: (id: number) => void
  onToggleSpam: (id: number) => void
  onGenerateReply: () => void
  onResolveReply: () => void
  onSaveReply: (emailId: number, reply: string) => void
}

function MessageDetailPanel({
  email,
  suggestedReply,
  replyError,
  onToggleRead,
  onToggleImportant,
  onToggleSpam,
  onGenerateReply,
  onResolveReply,
  onSaveReply
}: MessageDetailPanelProps) {
  return (
    <main className="detail-panel">
      {email ? (
        <article className="message-card">
          <div className="message-header">
            <div>
              <p className="detail-label">From</p>
              <h3>{email.sender}</h3>
              <p className="detail-meta">{email.email}</p>
            </div>

            <div className="message-actions">
              <button type="button" className="action-button" onClick={() => onToggleRead(email.id)}>
                {email.read ? 'Mark unread' : 'Mark read'}
              </button>
              <button type="button" className="action-button" onClick={() => onToggleImportant(email.id)}>
                {email.important ? 'Remove importance' : 'Mark important'}
              </button>
              <button type="button" className="action-button danger" onClick={() => onToggleSpam(email.id)}>
                {email.spam ? 'Restore email' : 'Move to Spam'}
              </button>
            </div>
          </div>

          <div className="message-subject-row">
            <h4>{email.subject}</h4>
          </div>

          <div className="message-meta-row">
            <span>{formatDate(email.date)}</span>
            <span className={`priority-badge priority-${email.priority.toLowerCase()}`}>
              {email.priority}
            </span>
            {email.important && <span className="detail-chip">Important</span>}
            {email.spam && <span className="detail-chip spam-chip">Spam</span>}
          </div>

          <div className="signal-tags">
            {email.signals.map((signal) => (
              <span key={signal} className="signal-tag">{signal}</span>
            ))}
          </div>

          {email.warning && (
            <div className="warning-banner" role="alert">
              <strong>Scam warning:</strong> {email.warning}
            </div>
          )}

          <div className="message-body">
            {email.body.split('\n').map((line, index) => (
              <p key={`${email.id}-${index}`}>{line || ' '}</p>
            ))}
          </div>
          {suggestedReply ? (
            <SuggestedReplyCard
              email={email}
              reply={suggestedReply}
              onResolve={onResolveReply}
              onSave={onSaveReply}
            />
          ) : (
            <div className="generate-reply-row">
              <button
                type="button"
                className="action-button generate-reply-button"
                onClick={onGenerateReply}
              >
                Generate reply
              </button>
              {replyError && <p className="reply-error" role="alert">{replyError}</p>}
            </div>
          )}

          {email.important && (
            <div className="ai-card">
              <div className="ai-header">
                <span className="section-label">Simulated AI analysis</span>
              </div>
              <p className="ai-summary">{email.summary}</p>
              <div className="ai-detected">
                <h5>Detected items</h5>
                <ul>
                  {email.signals.map((signal) => <li key={signal}>{signal}</li>)}
                </ul>
              </div>
            </div>
          )}

          {!email.warning && !email.spam && email.important && (
            <div className="info-card">
              <span className="section-label">AI confidence</span>
              <p>High confidence. This message appears to contain a real student action item or deadline.</p>
            </div>
          )}

          {email.spam && (
            <div className="info-card danger-card">
              <span className="section-label">Spam review</span>
              <p>This message has been moved to the demo spam queue for safety review.</p>
            </div>
          )}
        </article>
      ) : (
        <div className="empty-state detail-empty">
          <h3>No email selected</h3>
          <p>Select a message to review the full contents and AI summary.</p>
        </div>
      )}
    </main>
  )
}

export default MessageDetailPanel
