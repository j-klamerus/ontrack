// Settings UI for spam rules and exact sender-address blocks used during Inbox scans.
import { useState } from 'react'
import { getEmailSpamSettings, saveEmailSpamSettings } from '../../services/emailSpamSettings'
import type {
  EmailRuleField,
  EmailRuleOperator,
  EmailSpamRule,
  EmailSpamSettings
} from '../../types/emailRule'
import { buildRegexFromPhrases } from './regexBuilder'

const baselineSpamRules: EmailSpamRule[] = [
  {
    id: 'baseline-spam-account-pressure-subject',
    enabled: true,
    field: 'subject',
    operator: 'regex',
    pattern: '\\b(?:final notice|account (?:has been )?locked|verify your account|claim your prize|you have won)\\b'
  },
  {
    id: 'baseline-spam-sensitive-request-body',
    enabled: true,
    field: 'body',
    operator: 'regex',
    pattern: '\\b(?:verify your identity immediately|confirm your payment details|click here to (?:verify|confirm)|account (?:has been )?locked|claim your prize|gift cards?)\\b'
  }
]

const fieldLabels: Record<EmailRuleField, string> = {
  sender: 'Sender name',
  email: 'Sender address',
  subject: 'Subject',
  body: 'Message body'
}

type SpamSettingsState = EmailSpamSettings & { error: string }

/** Provides editable spam rules and a saved exact-address blocklist. */
function EmailSpamSettingsCard() {
  const [state, setState] = useState<SpamSettingsState>(() => {
    try {
      return { ...getEmailSpamSettings(), error: '' }
    } catch (loadError) {
      return {
        rules: [],
        blockedSenders: [],
        error: loadError instanceof Error ? loadError.message : 'Unable to load email spam settings.'
      }
    }
  })
  const [field, setField] = useState<EmailRuleField>('subject')
  const [operator, setOperator] = useState<EmailRuleOperator>('contains')
  const [pattern, setPattern] = useState('')
  const [regexPhrases, setRegexPhrases] = useState('')
  const [wholeWordRegex, setWholeWordRegex] = useState(true)
  const [senderAddress, setSenderAddress] = useState('')
  const { rules, blockedSenders, error } = state

  // Persist the complete configuration before reflecting it in the card.
  const updateSettings = (nextSettings: EmailSpamSettings): boolean => {
    try {
      saveEmailSpamSettings(nextSettings)
      setState({ ...nextSettings, error: '' })
      return true
    } catch (saveError) {
      setState((currentState) => ({
        ...currentState,
        error: saveError instanceof Error ? saveError.message : 'Unable to save email spam settings.'
      }))
      return false
    }
  }

  // Append a custom rule, leaving the built-in set and existing rules intact.
  const addRule = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const newRule: EmailSpamRule = {
      id: crypto.randomUUID(),
      enabled: true,
      field,
      operator,
      pattern
    }

    if (updateSettings({ rules: [...rules, newRule], blockedSenders })) {
      setPattern('')
    }
  }

  // Convert the shared phrase-builder input into the rule's regex pattern.
  const buildRegex = () => {
    const builtPattern = buildRegexFromPhrases(regexPhrases, wholeWordRegex)
    if (!builtPattern) {
      return
    }

    setOperator('regex')
    setPattern(builtPattern)
  }

  // Restore missing baseline rules without duplicating customized entries.
  const loadBaselineRules = () => {
    const existingIds = new Set(rules.map(({ id }) => id))
    const missingRules = baselineSpamRules.filter(({ id }) => !existingIds.has(id))
    if (missingRules.length > 0) {
      updateSettings({ rules: [...rules, ...missingRules], blockedSenders })
    }
  }

  // Remove only baseline-owned rules, preserving custom rules and sender blocks.
  const unloadBaselineRules = () => {
    const baselineIds = new Set(baselineSpamRules.map(({ id }) => id))
    updateSettings({
      rules: rules.filter(({ id }) => !baselineIds.has(id)),
      blockedSenders
    })
  }

  // Save an exact sender address once, normalized for case-insensitive matching.
  const addBlockedSender = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedAddress = senderAddress.trim().toLocaleLowerCase()
    if (blockedSenders.some((address) => address.toLocaleLowerCase() === normalizedAddress)) {
      setState((currentState) => ({ ...currentState, error: 'That sender is already blocked.' }))
      return
    }

    if (updateSettings({ rules, blockedSenders: [...blockedSenders, normalizedAddress] })) {
      setSenderAddress('')
    }
  }

  return (
    <div className="settings-card email-rules-card">
      <div className="card-header-row">
        <h3>Spam &amp; Phishing Detection</h3>
      </div>
      <p className="field-note email-rules-note">
        Scans flag messages that match an enabled rule or blocked sender. Detection does not move messages to Spam automatically.
        Spam rules and sender blocks are saved to your account.
      </p>

      <form className="email-rule-form" onSubmit={addRule}>
        <label htmlFor="email-spam-rule-field">
          Field
          <select
            id="email-spam-rule-field"
            value={field}
            onChange={(event) => setField(event.target.value as EmailRuleField)}
          >
            <option value="subject">Subject</option>
            <option value="sender">Sender name</option>
            <option value="email">Sender address</option>
            <option value="body">Message body</option>
          </select>
        </label>

        <label htmlFor="email-spam-rule-operator">
          Match type
          <select
            id="email-spam-rule-operator"
            value={operator}
            onChange={(event) => setOperator(event.target.value as EmailRuleOperator)}
          >
            <option value="contains">Contains text</option>
            <option value="regex">Regex</option>
          </select>
        </label>

        <label htmlFor="email-spam-rule-pattern">
          {operator === 'regex' ? 'Regex pattern' : 'Text to find'}
          <input
            id="email-spam-rule-pattern"
            required
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
            placeholder={operator === 'regex' ? 'e.g. claim your prize' : 'e.g. payment details'}
          />
        </label>

        <button type="submit" className="primary-button">Add spam rule</button>
      </form>

      <details className="email-regex-help">
        <summary>Regex guide and simple pattern builder</summary>
        <div className="email-regex-help-content">
          <div>
            <p className="email-rules-note">
              Regex rules search the selected email field and ignore capitalization.
            </p>
            <ul className="email-regex-examples">
              <li><code>urgent|claim your prize</code> matches either phrase.</li>
              <li><code>\b</code> marks a word boundary; <code>\d</code> matches a digit.</li>
              <li><code>.*</code> matches any amount of text.</li>
            </ul>
          </div>
          <div className="email-regex-builder">
            <label htmlFor="email-spam-regex-phrases">
              Phrases to match (separate with commas or new lines)
              <textarea
                id="email-spam-regex-phrases"
                value={regexPhrases}
                onChange={(event) => setRegexPhrases(event.target.value)}
                placeholder="claim your prize, confirm payment details"
                rows={2}
              />
            </label>
            <label className="email-regex-whole-words">
              <input
                type="checkbox"
                checked={wholeWordRegex}
                onChange={(event) => setWholeWordRegex(event.target.checked)}
              />
              Match whole words or phrases
            </label>
            <button
              type="button"
              className="secondary-button"
              onClick={buildRegex}
              disabled={!regexPhrases.trim()}
            >
              Build regex into pattern
            </button>
            <p className="email-rules-note">
              The builder treats your phrases as literal text and safely escapes regex symbols.
            </p>
          </div>
        </div>
      </details>

      <section className="email-rule-set" aria-labelledby="email-spam-baseline-title">
        <div className="email-rule-set-copy">
          <div className="email-rule-title-row">
            <strong className="email-rule-title" id="email-spam-baseline-title">
              Baseline spam rules
            </strong>
            <span className={`email-rule-status ${rules.some(({ id }) => baselineSpamRules.some((rule) => rule.id === id)) ? 'enabled' : 'disabled'}`}>
              {baselineSpamRules.every(({ id }) => rules.some((rule) => rule.id === id))
                ? 'Loaded'
                : rules.some(({ id }) => baselineSpamRules.some((rule) => rule.id === id))
                  ? 'Partially loaded'
                  : 'Not loaded'}
            </span>
          </div>
          <p className="field-note email-rules-note">
            Looks for common account-pressure and sensitive-information requests. These patterns are examples, not a guarantee of spam detection.
          </p>
        </div>
        <div className="email-rule-set-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={loadBaselineRules}
            disabled={baselineSpamRules.every(({ id }) => rules.some((rule) => rule.id === id))}
          >
            {rules.some(({ id }) => baselineSpamRules.some((rule) => rule.id === id))
              ? 'Restore missing'
              : 'Load set'}
          </button>
          <button
            type="button"
            className="email-rule-action email-rule-delete"
            onClick={unloadBaselineRules}
            disabled={!rules.some(({ id }) => baselineSpamRules.some((rule) => rule.id === id))}
          >
            Unload set
          </button>
        </div>
      </section>

      <section className="spam-sender-settings" aria-labelledby="blocked-senders-title">
        <div>
          <h4 id="blocked-senders-title">Blocked senders</h4>
          <p className="field-note email-rules-note">
            Add an exact email address to flag messages from that sender during a scan.
          </p>
        </div>
        <form className="spam-sender-form" onSubmit={addBlockedSender}>
          <label htmlFor="blocked-sender-address">
            Sender email address
            <input
              id="blocked-sender-address"
              type="email"
              required
              maxLength={320}
              value={senderAddress}
              onChange={(event) => setSenderAddress(event.target.value)}
              placeholder="sender@example.com"
            />
          </label>
          <button type="submit" className="secondary-button">Add sender</button>
        </form>
        {blockedSenders.length > 0 ? (
          <ul className="spam-sender-list">
            {blockedSenders.map((address) => (
              <li className="spam-sender-row" key={address}>
                <span>{address}</span>
                <button
                  type="button"
                  className="email-rule-action email-rule-delete"
                  aria-label={`Remove ${address} from blocked senders`}
                  onClick={() => updateSettings({
                    rules,
                    blockedSenders: blockedSenders.filter((sender) => sender !== address)
                  })}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="email-rules-empty-state">
            <strong>No blocked senders</strong>
            <span>Messages are not flagged by sender address unless you add one here.</span>
          </div>
        )}
      </section>

      {error && <p className="email-rules-error" role="alert">{error}</p>}

      {rules.length === 0 ? (
        <div className="email-rules-empty-state">
          <strong>No spam rules yet</strong>
          <span>Load Baseline spam rules or add your own. Blocked senders are managed separately above.</span>
        </div>
      ) : (
        <div className="email-rule-list" aria-label="Saved email spam rules">
          {rules.map((rule) => (
            <div className="email-rule-row" key={rule.id}>
              <div className="email-rule-content">
                <div className="email-rule-title-row">
                  <strong className="email-rule-title">Spam match rule</strong>
                  <span className={`email-rule-status ${rule.enabled ? 'enabled' : 'disabled'}`}>
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="email-rule-condition">
                  <span className="email-rule-step">IF</span>
                  <span>
                    {fieldLabels[rule.field]} {rule.operator === 'contains' ? 'contains' : 'matches this regex'}
                  </span>
                </div>
                <code className="email-rule-pattern">
                  {rule.operator === 'regex' ? `/${rule.pattern}/i` : `“${rule.pattern}”`}
                </code>
                <div className="email-rule-outcome">
                  <span className="email-rule-step">THEN</span>
                  <span>Flag as spam after scanning</span>
                </div>
              </div>
              <div className="email-rule-actions">
                <button
                  type="button"
                  className="email-rule-action"
                  onClick={() => updateSettings({
                    rules: rules.map((item) =>
                      item.id === rule.id ? { ...item, enabled: !item.enabled } : item
                    ),
                    blockedSenders
                  })}
                >
                  {rule.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  type="button"
                  className="email-rule-action email-rule-delete"
                  onClick={() => updateSettings({
                    rules: rules.filter((item) => item.id !== rule.id),
                    blockedSenders
                  })}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default EmailSpamSettingsCard
