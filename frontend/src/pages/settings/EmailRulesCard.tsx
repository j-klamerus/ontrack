// Settings UI for building, loading, ordering, and saving email classification rules.
import { useState } from 'react'
import { getEmailRules, saveEmailRules } from '../../services/emailRules'
import type { EmailRule, EmailRuleField, EmailRuleOperator } from '../../types/emailRule'
import { buildRegexFromPhrases } from './regexBuilder'

const baselineRuleDefinitions: Array<{
  id: string
  field: EmailRuleField
  pattern: string
  label: string
}> = [
  {
    id: 'baseline-assignment-subject',
    field: 'subject',
    pattern: '\\b(?:assignment|homework|coursework|lab report|essay|proposal|project milestone|prototype|practice set|worksheet|problem set|submission)\\b',
    label: 'Assignment'
  },
  {
    id: 'baseline-assignment-body',
    field: 'body',
    pattern: '\\b(?:assignment|homework|coursework|lab report|essay|proposal|project milestone|prototype|practice set|worksheet|problem set|submission|submit(?:ted|ting)?)\\b',
    label: 'Assignment'
  },
  {
    id: 'baseline-exam-subject',
    field: 'subject',
    pattern: '\\b(?:exam|midterm|quizzes?|test|lab practical|final (?:exam|assessment|test)|finals week)\\b',
    label: 'Exam'
  },
  {
    id: 'baseline-exam-body',
    field: 'body',
    pattern: '\\b(?:exam|midterm|quizzes?|test|lab practical|final (?:exam|assessment|test)|finals week)\\b',
    label: 'Exam'
  },
  {
    id: 'baseline-appointment-subject',
    field: 'subject',
    pattern: '\\b(?:appointments?|consultation|advising session|counseling session|office visit)\\b',
    label: 'Appointment'
  },
  {
    id: 'baseline-appointment-body',
    field: 'body',
    pattern: '\\b(?:appointments?|consultation|advising session|counseling session|office visit)\\b',
    label: 'Appointment'
  },
  {
    id: 'baseline-meeting-subject',
    field: 'subject',
    pattern: '\\b(?:meeting|office hours|review session|study session|workshop|seminar|group discussion|volunteer fair|career fair|orientation)\\b',
    label: 'Meeting'
  },
  {
    id: 'baseline-meeting-body',
    field: 'body',
    pattern: '\\b(?:meeting|office hours|review session|study session|workshop|seminar|group discussion|volunteer fair|career fair|orientation)\\b',
    label: 'Meeting'
  },
  {
    id: 'baseline-deadline-subject',
    field: 'subject',
    pattern: '\\b(?:deadlines?|due(?: date)?|closes?|registration window|pickup window|return by|renew by)\\b',
    label: 'Deadline'
  },
  {
    id: 'baseline-deadline-body',
    field: 'body',
    pattern: '\\b(?:deadlines?|due(?: date)?|closes?|registration window|pickup window|return by|renew by)\\b',
    label: 'Deadline'
  },
  {
    id: 'baseline-other-subject',
    field: 'subject',
    pattern: '\\b(?:general announcement|campus news|campus update|security alert|account security|flu shot clinic|student notice)\\b',
    label: 'Other'
  },
  {
    id: 'baseline-other-body',
    field: 'body',
    pattern: '\\b(?:general announcement|campus news|campus update|security alert|account security|flu shot clinic|student notice)\\b',
    label: 'Other'
  }
]

const baselineRules: EmailRule[] = baselineRuleDefinitions.map((rule) => ({
  ...rule,
  enabled: true,
  operator: 'regex'
}))

// Extra examples are optional; baseline rules handle the six shared categories.
const optionalRules: EmailRule[] = [
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
  },
  {
    id: 'campus-services-advising',
    enabled: true,
    field: 'sender',
    operator: 'contains',
    pattern: 'Academic Advising',
    label: 'Advising'
  },
  {
    id: 'campus-services-library',
    enabled: true,
    field: 'sender',
    operator: 'contains',
    pattern: 'Library',
    label: 'Library'
  },
  {
    id: 'campus-services-career',
    enabled: true,
    field: 'sender',
    operator: 'contains',
    pattern: 'Career Center',
    label: 'Career Center'
  }
]

type EmailRuleSet = {
  id: string
  name: string
  description: string
  rules: EmailRule[]
}

const ruleSets: EmailRuleSet[] = [
  {
    id: 'baseline',
    name: 'Baseline categories',
    description: 'Classifies email into Assignment, Exam, Meeting, Appointment, Deadline, and Other.',
    rules: baselineRules
  },
  {
    id: 'optional',
    name: 'Campus & study extras',
    description: 'Adds academic and campus-service labels such as Academic, Advising, Library, and Career Center.',
    rules: optionalRules
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

/** Provides rule-set controls and individual rule editing backed by local browser storage. */
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
  const [regexPhrases, setRegexPhrases] = useState('')
  const [wholeWordRegex, setWholeWordRegex] = useState(true)
  const { rules, error } = state

  // Persist first so failed validation/storage never leaves the UI showing unsaved rules.
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

  // Append custom rules so their default priority follows the currently loaded rules.
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

  // Transfer the generated phrase pattern into the normal regex rule form.
  const buildRegex = () => {
    const builtPattern = buildRegexFromPhrases(regexPhrases, wholeWordRegex)
    if (!builtPattern) {
      return
    }

    setOperator('regex')
    setPattern(builtPattern)
  }

  // Rule order controls which matching rule determines an email's display group.
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

  // Restore only missing preset rules, preserving custom rules and current rule order.
  const loadRuleSet = (ruleSet: EmailRuleSet) => {
    const existingIds = new Set(rules.map(({ id }) => id))
    const missingRules = ruleSet.rules.filter(({ id }) => !existingIds.has(id))
    if (missingRules.length === 0) {
      return
    }

    const existingSetIds = new Set(ruleSet.rules.map(({ id }) => id))
    const existingSetIndexes = rules
      .map(({ id }, index) => existingSetIds.has(id) ? index : -1)
      .filter((index) => index >= 0)
    const baselineIndexes = rules
      .map(({ id }, index) => baselineRules.some((rule) => rule.id === id) ? index : -1)
      .filter((index) => index >= 0)
    const insertionIndex = existingSetIndexes.length > 0
      ? existingSetIndexes[existingSetIndexes.length - 1] + 1
      : ruleSet.id === 'baseline'
        ? 0
        : baselineIndexes.length > 0
          ? baselineIndexes[baselineIndexes.length - 1] + 1
          : 0
    const nextRules = [...rules]
    nextRules.splice(insertionIndex, 0, ...missingRules)
    updateRules(nextRules)
  }

  // Remove preset-owned rules as a group without affecting custom rules.
  const unloadRuleSet = (ruleSet: EmailRuleSet) => {
    const ruleSetIds = new Set(ruleSet.rules.map(({ id }) => id))
    updateRules(rules.filter(({ id }) => !ruleSetIds.has(id)))
  }

  return (
    <div className="settings-card email-rules-card">
      <div className="card-header-row">
        <h3>Email Rules</h3>
      </div>
      <p className="field-note email-rules-note">
        Load a rule set to classify matching emails. Matching rules add labels, and the first matching rule sets the email group. Move rules to change group priority.
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

      <details className="email-regex-help">
        <summary>Regex guide and simple pattern builder</summary>
        <div className="email-regex-help-content">
          <div>
            <p className="email-rules-note">
              Regex looks for patterns in the selected field. Matches ignore capitalization.
            </p>
            <ul className="email-regex-examples">
              <li><code>quiz|exam</code> matches “quiz” or “exam”.</li>
              <li><code>\b</code> marks a word boundary; <code>\d</code> matches a digit.</li>
              <li><code>.*</code> matches any amount of text.</li>
            </ul>
          </div>
          <div className="email-regex-builder">
            <label htmlFor="email-regex-phrases">
              Phrases to match (separate with commas or new lines)
              <textarea
                id="email-regex-phrases"
                value={regexPhrases}
                onChange={(event) => setRegexPhrases(event.target.value)}
                placeholder={'quiz, exam, lab practical'}
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

      <div className="email-rule-sets" aria-label="Rule sets">
        {ruleSets.map((ruleSet) => {
          const ruleSetIds = new Set(ruleSet.rules.map(({ id }) => id))
          const loadedCount = rules.filter(({ id }) => ruleSetIds.has(id)).length
          const missingCount = ruleSet.rules.length - loadedCount

          return (
            <section className="email-rule-set" key={ruleSet.id} aria-labelledby={`email-rule-set-${ruleSet.id}`}>
              <div className="email-rule-set-copy">
                <div className="email-rule-title-row">
                  <strong className="email-rule-title" id={`email-rule-set-${ruleSet.id}`}>{ruleSet.name}</strong>
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
        Rule sets can be loaded or unloaded together. Individual rules can still be enabled, disabled, reordered, or deleted below; custom rules are kept when a set is unloaded. Rules are saved in this browser.
      </p>

      {error && <p className="email-rules-error" role="alert">{error}</p>}

      {rules.length === 0 ? (
        <div className="email-rules-empty-state">
          <strong>No email rules yet</strong>
          <span>Add your first rule above, or load a rule set to try classification on the sample inbox.</span>
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