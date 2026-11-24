import { useState } from 'react'
import { Mail, Sparkles } from 'lucide-react'
import {
  DEFAULT_EMAIL_SCAN_LIMIT,
  getEmailScanLimit,
  MAX_EMAIL_SCAN_LIMIT,
  MIN_EMAIL_SCAN_LIMIT,
  saveEmailScanLimit
} from '../services/emailScanLimit'
import EmailRulesCard from './settings/EmailRulesCard'
import EmailPriorityRulesCard from './settings/EmailPriorityRulesCard'
import EmailSpamSettingsCard from './settings/EmailSpamSettingsCard'
import '../styles/PremiumFeatures.css'

function getInitialScanLimit(): { value: number; error: string | null } {
  try {
    return { value: getEmailScanLimit(), error: null }
  } catch (error) {
    return {
      value: DEFAULT_EMAIL_SCAN_LIMIT,
      error: error instanceof Error ? error.message : 'Unable to load the email scan limit.'
    }
  }
}

function PremiumFeatures() {
  const [initialScanLimit] = useState(getInitialScanLimit)
  const [emailScanLimit, setEmailScanLimit] = useState(initialScanLimit.value)
  const [saveError, setSaveError] = useState<string | null>(initialScanLimit.error)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const handleScanLimitChange = (value: number) => {
    setEmailScanLimit(value)
    setSaveMessage(null)
    try {
      saveEmailScanLimit(value)
      setSaveError(null)
      setSaveMessage(`Saved. Your next Gmail scan will fetch up to ${value} messages.`)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save the email scan limit.')
    }
  }

  return (
    <section className="premium-page settings-page" aria-labelledby="premium-page-heading">
      <header className="premium-page-header">
        <p className="premium-eyebrow">ON TRACK PREMIUM</p>
        <div className="premium-title-row">
          <h2 id="premium-page-heading">Premium Features</h2>
          <span className="premium-demo-badge">PREVIEW</span>
        </div>
        <p>Explore upgrades designed to give you more room to stay organized.</p>
      </header>

      <article className="premium-feature-card" aria-labelledby="premium-email-heading">
        <div className="premium-feature-icon" aria-hidden="true">
          <Mail size={24} strokeWidth={1.8} />
        </div>
        <div className="premium-feature-content">
          <div className="premium-feature-title-row">
            <div>
              <p className="premium-feature-label">GMAIL</p>
              <h3 id="premium-email-heading">Emails scanned per request</h3>
            </div>
            <span className="premium-preview-badge">
              <Sparkles size={14} aria-hidden="true" />
              Premium feature
            </span>
          </div>
          <p className="premium-feature-description">
            Choose how many recent messages to fetch and analyze each time you scan Gmail.
            Your setting is saved to your account and used by the next scan.
          </p>

          <div className="premium-limit-control">
            <div className="premium-limit-value" aria-live="polite">
              <strong>{emailScanLimit}</strong>
              <span>emails per scan</span>
            </div>
            <label htmlFor="premium-email-scan-limit">Email scan size</label>
            <input
              id="premium-email-scan-limit"
              type="range"
              min={MIN_EMAIL_SCAN_LIMIT}
              max={MAX_EMAIL_SCAN_LIMIT}
              step={1}
              value={emailScanLimit}
              onChange={(event) => handleScanLimitChange(Number(event.target.value))}
              aria-valuetext={`${emailScanLimit} emails per scan`}
            />
            <div className="premium-limit-range" aria-hidden="true">
              <span>{MIN_EMAIL_SCAN_LIMIT} minimum</span>
              <span>{MAX_EMAIL_SCAN_LIMIT} maximum</span>
            </div>
          </div>

          {saveMessage && <p className="premium-save-message" role="status">{saveMessage}</p>}
          {saveError && <p className="premium-save-error" role="alert">{saveError}</p>}
        </div>
      </article>

      <section className="premium-email-rules" aria-labelledby="premium-rules-heading">
        <header className="premium-section-header">
          <div>
            <p className="premium-eyebrow">ADVANCED GMAIL CONTROLS</p>
            <h2 id="premium-rules-heading">Custom email rules</h2>
            <p>Build, prioritize, and manage rules that organize your scanned messages.</p>
          </div>
        </header>
        <div className="premium-email-rules-cards">
          <EmailRulesCard />
          <EmailPriorityRulesCard />
        </div>
      </section>

      <section className="premium-spam-settings" aria-labelledby="premium-spam-heading">
        <header className="premium-section-header">
          <div>
            <p className="premium-eyebrow">EMAIL PROTECTION</p>
            <h2 id="premium-spam-heading">Spam &amp; phishing protection</h2>
            <p>Manage detection rules and blocked senders for your Gmail scans.</p>
          </div>
        </header>
        <EmailSpamSettingsCard />
      </section>
    </section>
  )
}

export default PremiumFeatures
