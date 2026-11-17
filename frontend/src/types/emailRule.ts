import type { EmailPriority } from './email'

// Shared rule contract for browser rule management and backend matching.
export type EmailRuleField = 'sender' | 'email' | 'subject' | 'body'
export type EmailRuleOperator = 'contains' | 'regex'

export type EmailRule = {
  // Array order is meaningful: the first matching enabled rule chooses the display group.
  id: string
  enabled: boolean
  field: EmailRuleField
  operator: EmailRuleOperator
  pattern: string
  label: string
}

export type EmailPriorityRule = {
  // Array order is meaningful: the first matching enabled rule sets priority.
  id: string
  enabled: boolean
  field: EmailRuleField
  operator: EmailRuleOperator
  pattern: string
  priority: EmailPriority
}