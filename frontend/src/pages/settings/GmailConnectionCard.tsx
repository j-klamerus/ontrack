import { Mail } from 'lucide-react'
import type { UserProfile } from '../../types/user'

type GmailConnectionCardProps = {
  user: UserProfile
  connected: boolean
  busy: boolean
  error: string | null
  onConnect: () => void
}

function GmailConnectionCard({ user, connected, busy, error, onConnect }: GmailConnectionCardProps) {
  return (
    <section className="settings-card gmail-connection-card" aria-labelledby="gmail-connection-heading">
      <div className="gmail-connection-main">
        <div className="gmail-connection-icon">
          <Mail size={26} strokeWidth={1.8} aria-hidden="true" />
        </div>
        <div className="gmail-connection-copy">
          <p className="settings-eyebrow">EMAIL INTEGRATION</p>
          <div className="gmail-connection-title-row">
            <h2 id="gmail-connection-heading">Connect Gmail</h2>
            <span className={`status-pill ${connected ? 'connected' : 'disconnected'}`}>
              {connected ? 'Connected' : 'Not connected'}
            </span>
          </div>
          <p className="gmail-connection-description">
            Choose a scan size from 10 to 50 in Premium. Gmail is read-only, and email bodies
            aren&apos;t saved. Dated commitments are sent to Commitments for your review.
          </p>
          <section className="gmail-account-profile" aria-labelledby="student-profile-heading">
            <div className="gmail-account-profile-heading">
              <h3 id="student-profile-heading">Student profile</h3>
              <p>From your signed-in account</p>
            </div>
            <dl className="gmail-account-profile-fields">
              <div>
                <dt>Student name</dt>
                <dd>{user.name || 'Not available'}</dd>
              </div>
              <div>
                <dt>Email address</dt>
                <dd>{user.email || 'Not available'}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
      <div className="gmail-connection-action">
        <button type="button" className="primary-button" onClick={onConnect} disabled={busy}>
          {busy ? 'Connecting...' : connected ? 'Reconnect Gmail' : 'Connect Gmail'}
        </button>
      </div>
      {error && <p className="settings-error gmail-connection-error" role="alert">{error}</p>}
    </section>
  )
}

export default GmailConnectionCard
