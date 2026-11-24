// Browser persistence and validation for the ordered rules used to set email priority.
import type { EmailPriorityRule } from '../types/emailRule'
import { getUserDataItem, setUserDataItem } from './userData'

const STORAGE_KEY = 'ontrack-email-priority-rules'
const priorityOrder: Record<EmailPriorityRule['priority'], number> = {
  High: 0,
  Medium: 1,
  Low: 2
}

// Keep the saved order for rules with the same priority.
export function sortEmailPriorityRulesByPriority(rules: EmailPriorityRule[]): EmailPriorityRule[] {
  return rules
    .map((rule, index) => ({ rule, index }))
    .sort((left, right) =>
      priorityOrder[left.rule.priority] - priorityOrder[right.rule.priority] ||
      left.index - right.index
    )
    .map(({ rule }) => rule)
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isEmailPriorityRule = (value: unknown): value is EmailPriorityRule =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  value.id.length > 0 &&
  value.id.length <= 100 &&
  typeof value.enabled === 'boolean' &&
  ['sender', 'email', 'subject', 'body'].includes(String(value.field)) &&
  ['contains', 'regex'].includes(String(value.operator)) &&
  typeof value.pattern === 'string' &&
  (value.priority === 'High' || value.priority === 'Medium' || value.priority === 'Low')

// Validate rule content and regex syntax before it is stored or evaluated.
function validateRule(rule: unknown): asserts rule is EmailPriorityRule {
  if (!isEmailPriorityRule(rule)) {
    throw new Error('An email priority rule has an invalid format.')
  }

  if (!rule.pattern.trim()) {
    throw new Error('A priority rule needs a pattern.')
  }

  if (rule.pattern.length > 200) {
    throw new Error('Priority rule patterns must be 200 characters or fewer.')
  }

  if (rule.operator === 'regex') {
    try {
      new RegExp(rule.pattern, 'i')
    } catch {
      throw new Error(`The regex pattern "${rule.pattern}" is invalid.`)
    }
  }
}

/** Loads saved priority rules; a browser with no saved rules starts without priorities. */
export function getEmailPriorityRules(): EmailPriorityRule[] {
  const savedRules = getUserDataItem(STORAGE_KEY)
  if (!savedRules) {
    return []
  }

  let parsedRules: unknown
  try {
    parsedRules = JSON.parse(savedRules)
  } catch {
    throw new Error('Saved email priority rules could not be read.')
  }

  if (!Array.isArray(parsedRules)) {
    throw new Error('Saved email priority rules have an invalid format.')
  }

  parsedRules.forEach(validateRule)
  return sortEmailPriorityRulesByPriority(parsedRules)
}

/** Validates the ordered priority rules before storing them in browser storage. */
export function saveEmailPriorityRules(rules: EmailPriorityRule[]): void {
  const sortedRules = sortEmailPriorityRulesByPriority(rules)
  sortedRules.forEach(validateRule)
  setUserDataItem(STORAGE_KEY, JSON.stringify(sortedRules))
}
