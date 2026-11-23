export type PlannerItemSelection = {
  kind: 'Calendar event' | 'Commitment'
  id: number | string
  date: string
}
