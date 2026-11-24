import { Mail } from 'lucide-react'

type GmailConnectionCardProps = {
  connected: boolean
  busy: boolean
  error: string | null
  onConnect: () => void
}

function GmailConnectionCard({ connected, busy, error, onConnect }: GmailConnectionCardProps) {
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
          <p>
            Fetch and analyze up to 20 recent messages. Gmail is read-only, and email bodies
            aren&apos;t saved. Dated commitments are sent to Commitments for your review.
          </p>
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
