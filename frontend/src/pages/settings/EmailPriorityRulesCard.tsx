// Settings UI for building, loading, ordering, and saving email priority rules.
import { useState } from 'react'
import { getEmailPriorityRules, saveEmailPriorityRules } from '../../services/emailPriorityRules'
import type { EmailPriority } from '../../types/email'
import type { EmailPriorityRule, EmailRuleField, EmailRuleOperator } from '../../types/emailRule'
import { buildRegexFromPhrases } from './regexBuilder'

const priorityOptions: EmailPriority[] = ['High', 'Medium', 'Low']

const baselinePriorityRules: EmailPriorityRule[] = [
  {
    id: 'baseline-priority-high-subject',
    enabled: true,
    field: 'subject',
    operator: 'regex',
    pattern: '\\b(?:urgent|asap|immediate(?:ly)?|action required|overdue|past due|due today|due tomorrow|final notice|account (?:has been )?locked)\\b',
    priority: 'High'
  },
  {
    id: 'baseline-priority-high-body',
    enabled: true,
    field: 'body',
    operator: 'regex',
    pattern: '\\b(?:urgent|asap|immediate(?:ly)?|action required|overdue|past due|due today|due tomorrow|final notice|account (?:has been )?locked)\\b',
    priority: 'High'
  },
  {
    id: 'baseline-priority-medium-subject',
    enabled: true,
    field: 'subject',
    operator: 'regex',
    pattern: '\\b(?:assignment|homework|coursework|exam|midterm|quizzes?|deadline|due date|appointment|meeting|registration|consultation|lab practical|project milestone)\\b',
    priority: 'Medium'
  },
  {
    id: 'baseline-priority-medium-body',
    enabled: true,
    field: 'body',
    operator: 'regex',
    pattern: '\\b(?:assignment|homework|coursework|exam|midterm|quizzes?|deadlines?|due(?: date)?|appointment|meeting|registration|consultation|lab practical|project milestone|submit(?:ted|ting)?)\\b',
    priority: 'Medium'
  },
  {
    id: 'baseline-priority-low-subject',
    enabled: true,
    field: 'subject',
    operator: 'regex',
    pattern: '\\b(?:general announcement|campus news|campus update|volunteer fair|newsletter|flu shot clinic|student notice)\\b',
    priority: 'Low'
  },
  {
    id: 'baseline-priority-low-body',
    enabled: true,
    field: 'body',
    operator: 'regex',
    pattern: '\\b(?:general announcement|campus news|campus update|volunteer fair|newsletter|flu shot clinic|student notice)\\b',
    priority: 'Low'
  }
]

type EmailPriorityRuleSet = {
  id: string
  name: string
  description: string
  rules: EmailPriorityRule[]
}

const ruleSets: EmailPriorityRuleSet[] = [
  {
    id: 'baseline-priorities',
    name: 'Baseline priorities',
    description: 'Looks for urgent language first, then common school tasks, then general notices.',
    rules: baselinePriorityRules
  }
]

const fieldLabels: Record<EmailRuleField, string> = {
  sender: 'Sender name',
  email: 'Sender address',
  subject: 'Subject',
  body: 'Message body'
}

type EmailPriorityRulesState = {
  rules: EmailPriorityRule[]
  error: string
}

/** Provides separate priority rules with the same ordered editing controls as category rules. */
function EmailPriorityRulesCard() {
  const [state, setState] = useState<EmailPriorityRulesState>(() => {
    try {
      return { rules: getEmailPriorityRules(), error: '' }
    } catch (loadError) {
      return {
        rules: [],
        error: loadError instanceof Error ? loadError.message : 'Unable to load email priority rules.'
      }
    }
  })
  const [field, setField] = useState<EmailRuleField>('subject')
  const [operator, setOperator] = useState<EmailRuleOperator>('contains')
  const [pattern, setPattern] = useState('')
  const [priority, setPriority] = useState<EmailPriority>('Medium')
  const [regexPhrases, setRegexPhrases] = useState('')
  const [wholeWordRegex, setWholeWordRegex] = useState(true)
  const { rules, error } = state

  const updateRules = (nextRules: EmailPriorityRule[]): boolean => {
    try {
      saveEmailPriorityRules(nextRules)
      setState({ rules: nextRules, error: '' })
      return true
    } catch (saveError) {
      setState((currentState) => ({
        ...currentState,
        error: saveError instanceof Error ? saveError.message : 'Unable to save email priority rules.'
      }))
      return false
    }
  }

  const addRule = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const newRule: EmailPriorityRule = {
      id: crypto.randomUUID(),
      enabled: true,
      field,
      operator,
      pattern,
      priority
    }

    if (updateRules([...rules, newRule])) {
      setPattern('')
    }
  }

  const buildRegex = () => {
    const builtPattern = buildRegexFromPhrases(regexPhrases, wholeWordRegex)
    if (!builtPattern) {
      return
    }

    setOperator('regex')
    setPattern(builtPattern)
  }

  // Rule order decides which priority wins when an email matches more than one rule.
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

  // Restore missing baseline rules without replacing custom rules or their order.
  const loadRuleSet = (ruleSet: EmailPriorityRuleSet) => {
    const existingIds = new Set(rules.map(({ id }) => id))
    const missingRules = ruleSet.rules.filter(({ id }) => !existingIds.has(id))
    if (missingRules.length === 0) {
      return
    }

    const existingSetIds = new Set(ruleSet.rules.map(({ id }) => id))
    const lastSetIndex = rules.reduce(
      (lastIndex, rule, index) => existingSetIds.has(rule.id) ? index : lastIndex,
      -1
    )
    const nextRules = [...rules]
    nextRules.splice(lastSetIndex + 1, 0, ...missingRules)
    updateRules(nextRules)
  }

  // Remove baseline rules as a group while leaving custom rules in place.
  const unloadRuleSet = (ruleSet: EmailPriorityRuleSet) => {
    const ruleSetIds = new Set(ruleSet.rules.map(({ id }) => id))
    updateRules(rules.filter(({ id }) => !ruleSetIds.has(id)))
  }

  return (
    <div className="settings-card email-rules-card">
      <div className="card-header-row">
        <h3>Email Priority Rules</h3>
      </div>
      <p className="field-note email-rules-note">
        Priority rules are separate from category rules. The first matching rule sets High, Medium, or Low; if none match, the email has no priority after scanning.
      </p>

      <form className="email-rule-form" onSubmit={addRule}>
        <label htmlFor="email-priority-rule-field">
          Field
          <select
            id="email-priority-rule-field"
            value={field}
            onChange={(event) => setField(event.target.value as EmailRuleField)}
          >
            <option value="subject">Subject</option>
            <option value="sender">Sender name</option>
            <option value="email">Sender address</option>
            <option value="body">Message body</option>
          </select>
        </label>

        <label htmlFor="email-priority-rule-operator">
          Match type
          <select
            id="email-priority-rule-operator"
            value={operator}
            onChange={(event) => setOperator(event.target.value as EmailRuleOperator)}
          >
            <option value="contains">Contains text</option>
            <option value="regex">Regex</option>
          </select>
        </label>

        <label htmlFor="email-priority-rule-pattern">
          {operator === 'regex' ? 'Regex pattern' : 'Text to find'}
          <input
            id="email-priority-rule-pattern"
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
            placeholder={operator === 'regex' ? 'e.g. urgent|due today' : 'e.g. action required'}
          />
        </label>

        <label htmlFor="email-priority-rule-value">
          Set priority
          <select
            id="email-priority-rule-value"
            value={priority}
            onChange={(event) => setPriority(event.target.value as EmailPriority)}
          >
            {priorityOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        <button type="submit" className="primary-button">Add priority rule</button>
      </form>

      <details className="email-regex-help">
        <summary>Regex guide and simple pattern builder</summary>
        <div className="email-regex-help-content">
          <div>
            <p className="email-rules-note">
              Regex looks for patterns in the selected field. Matches ignore capitalization.
            </p>
            <ul className="email-regex-examples">
              <li><code>urgent|action required</code> matches either phrase.</li>
              <li><code>\b</code> marks a word boundary; <code>\d</code> matches a digit.</li>
              <li><code>.*</code> matches any amount of text.</li>
            </ul>
          </div>
          <div className="email-regex-builder">
            <label htmlFor="email-priority-regex-phrases">
              Phrases to match (separate with commas or new lines)
              <textarea
                id="email-priority-regex-phrases"
                value={regexPhrases}
                onChange={(event) => setRegexPhrases(event.target.value)}
                placeholder="urgent, action required, due today"
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

      <div className="email-rule-sets" aria-label="Priority rule sets">
        {ruleSets.map((ruleSet) => {
          const ruleSetIds = new Set(ruleSet.rules.map(({ id }) => id))
          const loadedCount = rules.filter(({ id }) => ruleSetIds.has(id)).length
          const missingCount = ruleSet.rules.length - loadedCount

          return (
            <section
              className="email-rule-set"
              key={ruleSet.id}
              aria-labelledby={`email-priority-rule-set-${ruleSet.id}`}
            >
              <div className="email-rule-set-copy">
                <div className="email-rule-title-row">
                  <strong className="email-rule-title" id={`email-priority-rule-set-${ruleSet.id}`}>
                    {ruleSet.name}
                  </strong>
                  <span className={`email-rule-status ${loadedCount > 0 ? 'enabled' : 'disabled'}`}>
                    {loadedCount === ruleSet.rules.length
                      ? 'Loaded'
                      : loadedCount > 0
                        ? `${loadedCount} of ${ruleSet.rules.length} loaded`
                        : 'Not loaded'}
                  </span>
                </div>
                <p className="field-note email-rules-note">{ruleSet.description}</p>
              </div>
              <div className="email-rule-set-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => loadRuleSet(ruleSet)}
                  disabled={missingCount === 0}
                >
                  {loadedCount === 0 ? 'Load set' : 'Restore missing'}
                </button>
                <button
                  type="button"
                  className="email-rule-action email-rule-delete"
                  onClick={() => unloadRuleSet(ruleSet)}
                  disabled={loadedCount === 0}
                >
                  Unload set
                </button>
              </div>
            </section>
          )
        })}
      </div>

      <p className="field-note email-rules-note">
        You can also add, reorder, enable, disable, or delete rules individually. Rules are saved in this browser.
      </p>

      {error && <p className="email-rules-error" role="alert">{error}</p>}

      {rules.length === 0 ? (
        <div className="email-rules-empty-state">
          <strong>No priority rules yet</strong>
          <span>Load Baseline priorities or add a rule. Emails without a matching rule will have no priority after a scan.</span>
        </div>
      ) : (
        <div className="email-rule-list" aria-label="Saved email priority rules">
          {rules.map((rule, index) => (
            <div className="email-rule-row" key={rule.id}>
              <div className="email-rule-content">
                <div className="email-rule-title-row">
                  <strong className="email-rule-title">{rule.priority} priority</strong>
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
                  <span>Set priority</span>
                  <span className="email-rule-label-preview">{rule.priority}</span>
                </div>
              </div>
              <div className="email-rule-actions">
                <button
                  type="button"
                  className="email-rule-action"
                  aria-label={`Move ${rule.priority} priority rule up`}
                  disabled={index === 0}
                  onClick={() => moveRule(index, -1)}
                >
                  Move up
                </button>
                <button
                  type="button"
                  className="email-rule-action"
                  aria-label={`Move ${rule.priority} priority rule down`}
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

export default EmailPriorityRulesCard
