// Backend matching and ordering for category rules and separate priority rules.
export type EmailRuleField = 'sender' | 'email' | 'subject' | 'body'
export type EmailRuleOperator = 'contains' | 'regex'
export type EmailPriority = 'High' | 'Medium' | 'Low'

export type EmailRule = {
  id: string
  enabled: boolean
  field: EmailRuleField
  operator: EmailRuleOperator
  pattern: string
  label: string
}

// Rule order is meaningful: the first enabled match sets the email's priority.
export type EmailPriorityRule = {
  id: string
  enabled: boolean
  field: EmailRuleField
  operator: EmailRuleOperator
  pattern: string
  priority: EmailPriority
}

export type RuleEvaluationEmail = {
  id: number
  sender: string
  email: string
  subject: string
  body: string
  date: string
}

export type EmailRuleEvaluation = {
  emailId: number
  labels: string[]
  groupId: string
  groupLabel: string
  groupOrder: number
  priority: EmailPriority | null
}

type RuleMatcher = Pick<EmailRule, 'field' | 'operator' | 'pattern'>

type CompiledRule<TRule extends RuleMatcher> = {
  rule: TRule
  regex: RegExp | null
}

type OrderedEvaluation = {
  result: EmailRuleEvaluation
  dateTime: number
  originalIndex: number
}

// Match either case-insensitive text or the rule's already-compiled regex against its chosen field.
const ruleMatches = <TRule extends RuleMatcher>(
  email: RuleEvaluationEmail,
  compiledRule: CompiledRule<TRule>
): boolean => {
  const { rule, regex } = compiledRule
  const fieldValue = email[rule.field]

  if (rule.operator === 'contains') {
    return fieldValue.toLocaleLowerCase().includes(rule.pattern.toLocaleLowerCase())
  }

  return regex?.test(fieldValue) ?? false
}

/** Applies category and priority rules, returning null priority when none match. */
export function evaluateEmailRules(
  emails: RuleEvaluationEmail[],
  rules: EmailRule[],
  priorityRules: EmailPriorityRule[] = []
): EmailRuleEvaluation[] {
  const activeRules: CompiledRule<EmailRule>[] = rules
    .filter((rule) => rule.enabled)
    .map((rule) => ({
      rule,
      regex: rule.operator === 'regex' ? new RegExp(rule.pattern, 'i') : null
    }))
  const activePriorityRules: CompiledRule<EmailPriorityRule>[] = priorityRules
    .filter((rule) => rule.enabled)
    .map((rule) => ({
      rule,
      regex: rule.operator === 'regex' ? new RegExp(rule.pattern, 'i') : null
    }))

  // Keep every matching label, but use the first match as the sorting group.
  const orderedResults: OrderedEvaluation[] = emails.map((email, originalIndex) => {
    const matchingRules = activeRules.filter((compiledRule) => ruleMatches(email, compiledRule))
    const firstMatchingRule = matchingRules[0]?.rule
    const firstMatchingPriorityRule = activePriorityRules.find((compiledRule) =>
      ruleMatches(email, compiledRule)
    )
    const labels = [...new Set(matchingRules.map(({ rule }) => rule.label.trim()))]
    const groupOrder = firstMatchingRule
      ? activeRules.findIndex(({ rule }) => rule === firstMatchingRule)
      : activeRules.length

    return {
      result: {
        emailId: email.id,
        labels,
        groupId: firstMatchingRule?.id ?? 'other',
        groupLabel: firstMatchingRule?.label.trim() ?? 'Other',
        groupOrder,
        priority: firstMatchingPriorityRule?.rule.priority ?? null
      },
      dateTime: Date.parse(email.date) || 0,
      originalIndex
    }
  })

  // Rule order sets group order; dates sort newest-first within each group.
  return orderedResults
    .sort((left, right) =>
      left.result.groupOrder - right.result.groupOrder ||
      right.dateTime - left.dateTime ||
      left.originalIndex - right.originalIndex
    )
    .map(({ result }) => result)
}
