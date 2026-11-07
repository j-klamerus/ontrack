import { AlertCircle, CalendarDays, ClipboardCheck, Mail } from 'lucide-react'
import type { DashboardSummary } from './types'

type SummaryCardsProps = {
  summary: DashboardSummary
}

function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="summary-grid">
      <div className="summary-card total-emails">
        <Mail className="summary-icon" size={30} strokeWidth={1.8} />
        <span className="summary-number">{summary.totalEmails.toLocaleString()}</span>
        <span className="summary-label">Total Emails</span>
      </div>

      <div className="summary-card high-priority">
        <AlertCircle className="summary-icon" size={30} strokeWidth={1.8} />
        <span className="summary-number">{summary.highPriorityEmails.toLocaleString()}</span>
        <span className="summary-label">High Priority</span>
      </div>

      <div className="summary-card commitments">
        <ClipboardCheck className="summary-icon" size={30} strokeWidth={1.8} />
        <span className="summary-number">{summary.commitments.toLocaleString()}</span>
        <span className="summary-label">Commitments</span>
      </div>

      <div className="summary-card events">
        <CalendarDays className="summary-icon" size={30} strokeWidth={1.8} />
        <span className="summary-number">{summary.events.toLocaleString()}</span>
        <span className="summary-label">Events</span>
      </div>
    </div>
  )
}

export default SummaryCards
