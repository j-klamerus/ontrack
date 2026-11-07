import { AlertCircle, CalendarClock, CheckCircle2, ClipboardList } from 'lucide-react'

type Summary = {
  total: number
  upcoming: number
  overdue: number
  completed: number
}

type CommitmentSummaryCardsProps = {
  summary: Summary
}

function CommitmentSummaryCards({ summary }: CommitmentSummaryCardsProps) {
  return (
    <div className="summary-grid">
      <div className="commitment-summary-card summary-total">
        <ClipboardList className="commitment-summary-icon" size={28} strokeWidth={1.8} />
        <strong className="commitment-summary-value">{summary.total}</strong>
        <span className="commitment-summary-label">Total</span>
      </div>
      <div className="commitment-summary-card summary-upcoming">
        <CalendarClock className="commitment-summary-icon" size={28} strokeWidth={1.8} />
        <strong className="commitment-summary-value">{summary.upcoming}</strong>
        <span className="commitment-summary-label">Upcoming</span>
      </div>
      <div className="commitment-summary-card summary-overdue">
        <AlertCircle className="commitment-summary-icon" size={28} strokeWidth={1.8} />
        <strong className="commitment-summary-value">{summary.overdue}</strong>
        <span className="commitment-summary-label">Overdue</span>
      </div>
      <div className="commitment-summary-card summary-completed">
        <CheckCircle2 className="commitment-summary-icon" size={28} strokeWidth={1.8} />
        <strong className="commitment-summary-value">{summary.completed}</strong>
        <span className="commitment-summary-label">Completed</span>
      </div>
    </div>
  )
}

export default CommitmentSummaryCards
