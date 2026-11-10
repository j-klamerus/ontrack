export type EmailRuleField = 'sender' | 'email' | 'subject' | 'body'
export type EmailRuleOperator = 'contains' | 'regex'

export type EmailRule = {
  id: string
  enabled: boolean
  field: EmailRuleField
  operator: EmailRuleOperator
  pattern: string
  label: string
}