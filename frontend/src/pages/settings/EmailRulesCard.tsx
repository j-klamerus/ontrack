import { useState } from 'react'
import { getEmailRules, saveEmailRules } from '../../services/emailRules'
import type { EmailRule, EmailRuleField, EmailRuleOperator } from '../../types/emailRule'

const demoRules: EmailRule[] = [
  {
    id: 'demo-academic',
    enabled: true,
    field: 'subject',
    operator: 'regex',
    pattern: '\\b(CIT|BIO|MATH|CS)\\s?\\d{3}\\b|quiz|assignment|proposal|project milestone|practice set',
    label: 'Academic'
  },
  {
    id: 'demo-deadline',
    enabled: true,
    field: 'body',
    operator: 'regex',
    pattern: '\\b(due|deadline|closes|by Friday|registration closes)\\b',
    label: 'Deadline'
  },
  {
    id: 'demo-campus-events',
    enabled: true,
    field: 'subject',
    operator: 'regex',
    pattern: 'workshop|volunteer fair|clinic|appointment',
    label: 'Campus events'
  }
]

const fieldLabels: Record<EmailRuleField, string> = {
  sender: 'Sender name',
  email: 'Sender address',
  subject: 'Subject',
  body: 'Message body'
}

type EmailRulesState = {
  rules: EmailRule[]
  error: string
}

function EmailRulesCard() {
  const [state, setState] = useState<EmailRulesState>(() => {
    try {
      return { rules: getEmailRules(), error: '' }
    } catch (loadError) {
      return {
        rules: [],
        error: loadError instanceof Error ? loadError.message : 'Unable to load email rules.'
      }
    }
  })
  const [field, setField] = useState<EmailRuleField>('subject')
  const [operator, setOperator] = useState<EmailRuleOperator>('contains')
  const [pattern, setPattern] = useState('')
  const [label, setLabel] = useState('')
  const { rules, error } = state

  const updateRules = (nextRules: EmailRule[]): boolean => {
    try {
      saveEmailRules(nextRules)
      setState({ rules: nextRules, error: '' })
      return true
    } catch (saveError) {
      setState((currentState) => ({
        ...currentState,
        error: saveError instanceof Error ? saveError.message : 'Unable to save email rules.'
      }))
      return false
    }
  }

  const addRule = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const newRule: EmailRule = {
      id: crypto.randomUUID(),
      enabled: true,
      field,
      operator,
      pattern,
      label
    }

    if (updateRules([...rules, newRule])) {
      setPattern('')
      setLabel('')
    }
  }

  const moveRule = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= rules.length) {
      return
    }

    const nextRules = [...rules]
    const movingRule = nextRules[index]
    if (!movingRule) {
      return
    }

    nextRules.splice(index, 1)
    nextRules.splice(targetIndex, 0, movingRule)
    updateRules(nextRules)
  }

  const loadDemoRules = () => {
    const demoRuleIds = new Set(demoRules.map((rule) => rule.id))
    updateRules([
      ...demoRules,
      ...rules.filter((rule) => !demoRuleIds.has(rule.id))
    ])
  }

  return (
    <div className="settings-card email-rules-card">
      <div className="card-header-row">
        <h3>Email Rules</h3>
      </div>
      <p className="field-note email-rules-note">
        No rules are active until you add one or load the demo set. Matching emails get labels; the first matching rule sets their group. Move rules to change group priority.
      </p>

      <form className="email-rule-form" onSubmit={addRule}>
        <label htmlFor="email-rule-field">
          Field
          <select id="email-rule-field" value={field} onChange={(event) => setField(event.target.value as EmailRuleField)}>
            <option value="subject">Subject</option>
            <option value="sender">Sender name</option>
            <option value="email">Sender address</option>
            <option value="body">Message body</option>
          </select>
        </label>

        <label htmlFor="email-rule-operator">
          Match type
          <select id="email-rule-operator" value={operator} onChange={(event) => setOperator(event.target.value as EmailRuleOperator)}>
            <option value="contains">Contains text</option>
            <option value="regex">Regex</option>
          </select>
        </label>

        <label htmlFor="email-rule-pattern">
          {operator === 'regex' ? 'Regex pattern' : 'Text to find'}
          <input
            id="email-rule-pattern"
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
            placeholder={operator === 'regex' ? 'e.g. quiz|exam' : 'e.g. BIO 210'}
          />
        </label>

        <label htmlFor="email-rule-label">
          Label to add
          <input
            id="email-rule-label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="e.g. Coursework"
          />
        </label>

        <button type="submit" className="primary-button">Add rule</button>
      </form>

      <button
        type="button"
        className="secondary-button email-demo-rules-button"
        onClick={loadDemoRules}
      >
        {rules.length === 0 ? 'Load demo rules' : 'Add demo rules'}
      </button>

      <p className="field-note email-rules-note">
        Demo rules classify messages as Academic, Deadline, or Campus events. Rules are saved in this browser.
      </p>

      {error && <p className="email-rules-error" role="alert">{error}</p>}

      {rules.length === 0 ? (
        <div className="email-rules-empty-state">
          <strong>No email rules yet</strong>
          <span>Add your first rule above, or load the demo rules to try classification on the sample inbox.</span>
        </div>
      ) : (
        <div className="email-rule-list" aria-label="Saved email rules">
          {rules.map((rule, index) => (
            <div className="email-rule-row" key={rule.id}>
              <div className="email-rule-content">
                <div className="email-rule-title-row">
                  <strong className="email-rule-title">{rule.label}</strong>
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
                  <span>Add label</span>
                  <span className="email-rule-label-preview">{rule.label}</span>
                </div>
              </div>
              <div className="email-rule-actions">
                <button
                  type="button"
                  className="email-rule-action"
                  aria-label={`Move ${rule.label} rule up`}
                  disabled={index === 0}
                  onClick={() => moveRule(index, -1)}
                >
                  Move up
                </button>
                <button
                  type="button"
                  className="email-rule-action"
                  aria-label={`Move ${rule.label} rule down`}
                  disabled={index === rules.length - 1}
                  onClick={() => moveRule(index, 1)}
                >
                  Move down
                </button>
                <button
                  type="button"
                  className="email-rule-action"
                  onClick={() => updateRules(
                    rules.map((item) =>
                      item.id === rule.id ? { ...item, enabled: !item.enabled } : item
                    )
                  )}
                >
                  {rule.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  type="button"
                  className="email-rule-action email-rule-delete"
                  onClick={() => updateRules(rules.filter((item) => item.id !== rule.id))}
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

export default EmailRulesCard