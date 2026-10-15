import { useEffect, useState } from 'react'
import {
  Mail,
  AlertCircle,
  ClipboardCheck,
  CalendarDays,
  ScanSearch
} from 'lucide-react'
import '../styles/Dashboard.css'

function Dashboard() {
  const [progress, setProgress] = useState(0)
  const [scanningComplete, setScanningComplete] = useState(false)

  const scannedEmails = Math.round(progress * 10)
  const totalEmails = 1000
  const circumference = 2 * Math.PI * 82

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((current) => {
        if (current >= 100) {
          clearInterval(interval)
          setScanningComplete(true)
          return 100
        }

        return current + 1
      })
    }, 100)

    return () => clearInterval(interval)
  }, [])

  return (
    <section className="dashboard-page">
      {!scanningComplete ? (
        <div className="scanning-container">
          <h2>Scanning Your Emails</h2>

          <p className="scanning-description">
            We're analyzing your inbox to find what matters.
          </p>

          <div className="progress-circle">
            <svg className="progress-ring" viewBox="0 0 190 190">
              <circle
                className="progress-ring-background"
                cx="95"
                cy="95"
                r="82"
              />

              <circle
                className="progress-ring-value"
                cx="95"
                cy="95"
                r="82"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress / 100)}
              />
            </svg>

            <div className="progress-circle-inner">
              <span className="progress-percentage">{progress}%</span>
            </div>
          </div>

          <h3 className="scanning-status">
            <ScanSearch size={20} />
            Scanning emails...
          </h3>

          <p className="scanning-count">
            {scannedEmails.toLocaleString()} of {totalEmails.toLocaleString()} emails
          </p>
        </div>
      ) : (
        <div className="summary-container">
          <h2>Welcome back, Jace!</h2>

          <p className="summary-description">
            Here's what we found in your emails.
          </p>

          <div className="summary-grid">
            <div className="summary-card total-emails">
              <Mail className="summary-icon" size={30} strokeWidth={1.8} />
              <span className="summary-number">1,000</span>
              <span className="summary-label">Total Emails</span>
            </div>

            <div className="summary-card high-priority">
              <AlertCircle className="summary-icon" size={30} strokeWidth={1.8} />
              <span className="summary-number">24</span>
              <span className="summary-label">High Priority</span>
            </div>

            <div className="summary-card commitments">
              <ClipboardCheck className="summary-icon" size={30} strokeWidth={1.8} />
              <span className="summary-number">8</span>
              <span className="summary-label">Commitments</span>
            </div>

            <div className="summary-card events">
              <CalendarDays className="summary-icon" size={30} strokeWidth={1.8} />
              <span className="summary-number">12</span>
              <span className="summary-label">Events</span>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default Dashboard