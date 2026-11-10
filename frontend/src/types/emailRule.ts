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