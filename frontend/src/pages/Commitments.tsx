import { useMemo, useState } from 'react'
import '../styles/Commitments.css'

type Priority = 'High' | 'Medium' | 'Low'
type CommitmentStatus = 'Upcoming' | 'Overdue' | 'Completed'
type Filter = 'All' | CommitmentStatus

type Commitment = {
  id: number
  name: string
  course: string
  dueDate: string
  dueTime: string
  priority: Priority
  completed: boolean
  sourceEmail: string
}

const initialCommitments: Commitment[] = [
  {
    id: 1,
    name: 'Capstone Proposal Draft',
    course: 'CIT 485',
    dueDate: '2026-10-21',
    dueTime: '09:00',
    priority: 'High',
    completed: false,
    sourceEmail: 'instructor@college.edu'
  },
  {
    id: 2,
    name: 'Biology Lab Report',
    course: 'BIO 210',
    dueDate: '2026-10-18',
    dueTime: '17:30',
    priority: 'High',
    completed: false,
    sourceEmail: 'bio-lab@college.edu'
  },
  {
    id: 3,
    name: 'Math Quiz Review',
    course: 'MATH 220',
    dueDate: '2026-10-24',
    dueTime: '18:15',
    priority: 'Medium',
    completed: false,
    sourceEmail: 'math-help@college.edu'
  },
  {
    id: 4,
    name: 'Group Project Meeting',
    course: 'CS 350',
    dueDate: '2026-10-20',
    dueTime: '14:00',
    priority: 'Low',
    completed: false,
    sourceEmail: 'team-project@college.edu'
  },
  {
    id: 5,
    name: 'History Reading Notes',
    course: 'HIST 120',
    dueDate: '2026-10-15',
    dueTime: '08:00',
    priority: 'Medium',
    completed: true,
    sourceEmail: 'history@college.edu'
  },
  {
    id: 6,
    name: 'Portfolio Check-In',
    course: 'ART 110',
    dueDate: '2026-10-17',
    dueTime: '12:00',
    priority: 'Low',
    completed: true,
    sourceEmail: 'design-review@college.edu'
  }
]

const filterOptions: Filter[] = ['All', 'Upcoming', 'Overdue', 'Completed']

const getStatus = (commitment: Commitment): CommitmentStatus => {
  if (commitment.completed) {
    return 'Completed'
  }

  const dueAt = new Date(`${commitment.dueDate}T${commitment.dueTime}:00`)

  return dueAt < new Date() ? 'Overdue' : 'Upcoming'
}

const formatDueDate = (date: string, time: string) => {
  const dueAt = new Date(`${date}T${time}:00`)

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(dueAt)
}

function Commitments() {
  const [commitments, setCommitments] = useState(initialCommitments)
  const [activeFilter, setActiveFilter] = useState<Filter>('All')
  const [searchTerm, setSearchTerm] = useState('')

  const summary = useMemo(() => {
    const total = commitments.length
    const upcoming = commitments.filter((item) => getStatus(item) === 'Upcoming').length
    const overdue = commitments.filter((item) => getStatus(item) === 'Overdue').length
    const completed = commitments.filter((item) => getStatus(item) === 'Completed').length

    return { total, upcoming, overdue, completed }
  }, [commitments])

  const filteredCommitments = commitments.filter((commitment) => {
    const status = getStatus(commitment)
    const matchesFilter = activeFilter === 'All' ? true : status === activeFilter
    const trimmedSearch = searchTerm.trim().toLowerCase()

    if (!matchesFilter) {
      return false
    }

    if (!trimmedSearch) {
      return true
    }

    const searchableText = [
      commitment.name,
      commitment.course,
      commitment.sourceEmail,
      commitment.priority,
      status
    ]
      .join(' ')
      .toLowerCase()

    return searchableText.includes(trimmedSearch)
  })

  const handleToggleCompletion = (id: number) => {
    setCommitments((currentCommitments) =>
      currentCommitments.map((commitment) =>
        commitment.id === id
          ? { ...commitment, completed: !commitment.completed }
          : commitment
      )
    )
  }

  return (
    <section className="commitments-page">
      <header className="commitments-header">
        <div>
          <p className="eyebrow">Student planning</p>
          <h2>Commitment Tracker</h2>
        </div>

        <button type="button" className="sync-button">
          Sync from Emails
        </button>
      </header>

      <div className="summary-grid">
        <div className="summary-card summary-total">
          <span className="summary-label">Total</span>
          <strong className="summary-value">{summary.total}</strong>
        </div>

        <div className="summary-card summary-upcoming">
          <span className="summary-label">Upcoming</span>
          <strong className="summary-value">{summary.upcoming}</strong>
        </div>

        <div className="summary-card summary-overdue">
          <span className="summary-label">Overdue</span>
          <strong className="summary-value">{summary.overdue}</strong>
        </div>

        <div className="summary-card summary-completed">
          <span className="summary-label">Completed</span>
          <strong className="summary-value">{summary.completed}</strong>
        </div>
      </div>

      <div className="tracker-controls">
        <label className="search-box" htmlFor="commitment-search">
          <span className="search-label">Search</span>
          <input
            id="commitment-search"
            type="text"
            placeholder="Search commitments"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>

        <div className="filter-group" aria-label="Commitment filters">
          {filterOptions.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`filter-button ${activeFilter === filter ? 'active' : ''}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="commitment-list">
        {filteredCommitments.length > 0 ? (
          filteredCommitments.map((commitment) => {
            const status = getStatus(commitment)

            return (
              <article key={commitment.id} className="commitment-card">
                <div className="commitment-main">
                  <label className="checkbox-wrap">
                    <input
                      type="checkbox"
                      checked={commitment.completed}
                      onChange={() => handleToggleCompletion(commitment.id)}
                    />
                    <span className="checkbox-custom" aria-hidden="true" />
                  </label>

                  <div className="commitment-info">
                    <div className="commitment-header-row">
                      <h3>{commitment.name}</h3>
                      <span className={`priority-badge priority-${commitment.priority.toLowerCase()}`}>
                        {commitment.priority}
                      </span>
                    </div>

                    <div className="meta-row">
                      <span className="meta-item">
                        <strong>Course:</strong> {commitment.course}
                      </span>
                      <span className="meta-item">
                        <strong>Due:</strong> {formatDueDate(commitment.dueDate, commitment.dueTime)}
                      </span>
                    </div>

                    <div className="meta-row meta-row-bottom">
                      <span className="meta-item">
                        <strong>Status:</strong>
                        <span className={`status-badge status-${status.toLowerCase()}`}>
                          {status}
                        </span>
                      </span>

                      <span className="meta-item source-email-item">
                        <strong>Source Email:</strong> {commitment.sourceEmail}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            )
          })
        ) : (
          <div className="empty-state">
            <h3>No commitments match this view.</h3>
            <p>Try a different filter or search term.</p>
          </div>
        )}
      </div>
    </section>
  )
}

export default Commitments