import { useMemo, useState } from 'react'
import '../styles/Inbox.css'

type EmailPriority = 'High' | 'Medium' | 'Low'
type EmailFilter = 'All' | 'Important' | 'Unread' | 'Spam'
type EmailSignal = 'Assignment' | 'Deadline' | 'Exam' | 'Meeting' | 'General'

type StudentEmail = {
  id: number
  sender: string
  email: string
  subject: string
  preview: string
  body: string
  date: string
  priority: EmailPriority
  important: boolean
  read: boolean
  spam: boolean
  signals: EmailSignal[]
  summary: string
  warning?: string
}

const demoEmails: StudentEmail[] = [
  {
    id: 1,
    sender: 'Dr. Martin Chen',
    email: 'martin.chen@northlake.edu',
    subject: 'CIT 485 Capstone Proposal Draft due Friday',
    preview: 'Your proposal draft is due Friday by 5:00 PM. Please send the updated version...',
    body:
      'Hello student team,\n\nYour Capstone Proposal Draft is due Friday by 5:00 PM in the project portal. Please review the rubric and confirm that your problem statement, research plan, and timeline are included. I suggest you schedule your final review session before Thursday evening.\n\nPlease submit your draft before the deadline so I can provide feedback.\n\nBest,\nDr. Martin Chen',
    date: '2026-10-21T09:40:00',
    priority: 'High',
    important: true,
    read: false,
    spam: false,
    signals: ['Assignment', 'Deadline'],
    summary:
      'Simulated AI summary: This message is a high-priority assignment reminder for the Capstone Proposal Draft. It includes a firm Friday deadline and gives a clear action to submit the draft before the review cutoff.',
    warning: undefined
  },
  {
    id: 2,
    sender: 'Campus Health Center',
    email: 'wellness@northlake.edu',
    subject: 'Flu shot clinic and appointment reminder',
    preview: 'The annual vaccine clinic is next Wednesday in the student center. Please bring...',
    body:
      'Hello students,\n\nThe campus flu shot clinic will be held next Wednesday from 10:00 AM to 2:00 PM in the Student Center Ballroom. Students who are enrolled this fall may reserve an appointment online.\n\nIf you already scheduled a time, please bring your student ID and arrive 10 minutes early.\n\nThank you,\nCampus Health Center',
    date: '2026-10-20T14:05:00',
    priority: 'Low',
    important: false,
    read: true,
    spam: false,
    signals: ['General'],
    summary:
      'Simulated AI summary: This is a routine campus health notice about a flu clinic. It is informational and does not appear to contain a deadline or academic action item.',
    warning: undefined
  },
  {
    id: 3,
    sender: 'Professor Rivera',
    email: 'rivera@northlake.edu',
    subject: 'BIO 210 Lab practical rescheduled',
    preview: 'The lab practical originally set for Tuesday has been moved to Wednesday...',
    body:
      'Students,\n\nThe BIO 210 lab practical has been rescheduled from Tuesday to Wednesday at 1:30 PM in Room 205. Please review the specimen list before class and bring your lab notebook.\n\nThe structure and format remain the same, but the timing has changed.\n\nProfessor Rivera',
    date: '2026-10-19T16:12:00',
    priority: 'Medium',
    important: true,
    read: false,
    spam: false,
    signals: ['Exam', 'Meeting'],
    summary:
      'Simulated AI summary: This message reschedules an exam and gives students a new time and location. It is important because the test date changed and students must adjust their study plan.',
    warning: undefined
  },
  {
    id: 4,
    sender: 'Student Union Events',
    email: 'events@northlake.edu',
    subject: 'Volunteer fair this Friday',
    preview: 'Over 40 student organizations will be at the volunteer fair from 11 AM to 2 PM...',
    body:
      'Students,\n\nJoin us for the Volunteer Fair this Friday from 11:00 AM to 2:00 PM in the Commons. Representatives from over 40 campus organizations will be present to talk about service opportunities, leadership roles, and community events.\n\nFree coffee and snacks will be available.\n\nStudent Union Events Team',
    date: '2026-10-18T11:30:00',
    priority: 'Low',
    important: false,
    read: true,
    spam: false,
    signals: ['Meeting'],
    summary:
      'Simulated AI summary: This is a campus event invitation. It mentions an upcoming meeting-style event in the Commons and does not include an assignment deadline.',
    warning: undefined
  },
  {
    id: 5,
    sender: 'IT Security Alerts',
    email: 'alerts@northlake.edu',
    subject: 'Urgent: verify your campus portal password',
    preview: 'Your account security settings were updated. Click here to confirm your identity...',
    body:
      'Attention student,\n\nWe detected unusual sign-in activity on your campus portal. To protect your account, please verify your identity immediately by clicking the link below. This action is required before your account is frozen.\n\nhttps://portal-security-update.northlake.edu/verify\n\nIT Security Team',
    date: '2026-10-17T08:05:00',
    priority: 'High',
    important: false,
    read: true,
    spam: false,
    signals: ['General'],
    summary:
      'Simulated AI summary: This message uses urgency and a suspicious verification link, which may be part of a phishing attempt. It should be treated cautiously and checked through official campus channels.',
    warning:
      'Suspicious email detected: This message uses urgent language, requests immediate action, and includes a shortened or untrusted verification link. It may be a phishing or scam attempt.'
  },
  {
    id: 6,
    sender: 'MATH 220 Workshop',
    email: 'math.help@northlake.edu',
    subject: 'Practice set for Friday quiz',
    preview: 'The review packet for Friday’s quiz is now posted. Please complete problems 7-12...',
    body:
      'Hello class,\n\nThe practice set for Friday’s quiz is now posted on the course site. Please complete problems 7 through 12 before the workshop on Thursday. Bring your notes to class and come with questions.\n\nThanks,\nMATH 220 Workshop Team',
    date: '2026-10-16T12:15:00',
    priority: 'Medium',
    important: true,
    read: true,
    spam: false,
    signals: ['Assignment', 'Exam'],
    summary:
      'Simulated AI summary: This email includes a study task and a quiz preparation deadline. It is relevant because students need to complete the practice set before the Friday quiz.',
    warning: undefined
  },
  {
    id: 7,
    sender: 'Career Center',
    email: 'careers@northlake.edu',
    subject: 'Internship workshop at 3:00 PM Tuesday',
    preview: 'The Career Center is hosting an internship workshop this Tuesday. Register by today...',
    body:
      'Hello students,\n\nThe Career Center is hosting an internship workshop this Tuesday at 3:00 PM in the Innovation Lab. We will cover resume building, interview prep, and internship search strategy. Registration closes tonight at 9:00 PM.\n\nPlease RSVP if you plan to attend.\n\nCareer Center Team',
    date: '2026-10-15T09:45:00',
    priority: 'Medium',
    important: false,
    read: false,
    spam: false,
    signals: ['Meeting'],
    summary:
      'Simulated AI summary: This is a career workshop invitation with a meeting time and deadline to register. It is relevant but not an academic assignment.',
    warning: undefined
  },
  {
    id: 8,
    sender: 'Northlake Library',
    email: 'library@northlake.edu',
    subject: 'Loan reminder for reserved textbook',
    preview: 'Your reserved textbook for HIST 120 is ready for pickup. Please collect it by...',
    body:
      'Student,\n\nYour reserved textbook for HIST 120 is available for pickup at the library desk on the second floor. The pickup window closes on Friday at 6:00 PM.\n\nPlease bring your student ID to collect the book.\n\nNorthlake Library Support',
    date: '2026-10-14T17:10:00',
    priority: 'Low',
    important: false,
    read: true,
    spam: false,
    signals: ['Deadline'],
    summary:
      'Simulated AI summary: This is a library pickup reminder with a deadline for collecting a reserved textbook. It matters because it affects course materials for upcoming classes.',
    warning: undefined
  },
  {
    id: 9,
    sender: 'Finesse Tech Support',
    email: 'support@finesse-updates.com',
    subject: 'Final Notice: Your Student Account Has Been Locked',
    preview: 'Your account is locked due to a pending verification. Complete the secure form now...',
    body:
      'This is a final notice: your student account has been locked due to a verification issue. To restore access immediately, complete the secure form below and confirm your payment details.\n\nFailure to act may result in suspension.\n\nFinesse Tech Support',
    date: '2026-10-13T08:55:00',
    priority: 'High',
    important: false,
    read: true,
    spam: true,
    signals: ['General'],
    summary:
      'Simulated AI summary: This is a spam-like security alert that uses fear-based language and vague account locking language. It resembles a scam email and should be ignored or reported.',
    warning:
      'Spam and scam warning: The sender address and message content match common scam patterns: urgency, account lock pressure, and a request for personal or payment information.'
  },
  {
    id: 10,
    sender: 'Academic Advising',
    email: 'advising@northlake.edu',
    subject: 'Registration hold cleared for fall advising',
    preview: 'Your registration hold has been lifted. Please review your recommended course plan...',
    body:
      'Hello student,\n\nYour registration hold has been cleared and your advisor has approved your fall plan. Please review the recommended course schedule and confirm your selections before the priority registration window closes.\n\nAcademic Advising Office',
    date: '2026-10-12T10:00:00',
    priority: 'Medium',
    important: true,
    read: true,
    spam: false,
    signals: ['Deadline'],
    summary:
      'Simulated AI summary: This email confirms a registration clearance and includes a priority registration deadline. It is highly relevant to current enrollment tasks.',
    warning: undefined
  }
]

const filterOptions: EmailFilter[] = ['All', 'Important', 'Unread', 'Spam']

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value))

function Inbox() {
  const [emails, setEmails] = useState<StudentEmail[]>(demoEmails)
  const [selectedId, setSelectedId] = useState<number | null>(demoEmails[0].id)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState<EmailFilter>('All')

  const filteredEmails = useMemo(() => {
    return emails.filter((email) => {
      if (activeFilter === 'Important' && !email.important) {
        return false
      }

      if (activeFilter === 'Unread' && email.read) {
        return false
      }

      if (activeFilter === 'Spam' && !email.spam) {
        return false
      }

      if (!searchTerm.trim()) {
        return true
      }

      const query = searchTerm.trim().toLowerCase()
      const searchableText = [
        email.sender,
        email.email,
        email.subject,
        email.preview,
        email.body,
        email.priority,
        email.signals.join(' '),
        email.summary
      ]
        .join(' ')
        .toLowerCase()

      return searchableText.includes(query)
    })
  }, [activeFilter, emails, searchTerm])

  const visibleSelectedId = filteredEmails.some((email) => email.id === selectedId)
    ? selectedId
    : filteredEmails[0]?.id ?? null

  const selectedEmail = filteredEmails.find((email) => email.id === visibleSelectedId) ?? null

  const updateEmailState = (id: number, changes: Partial<StudentEmail>) => {
    setEmails((currentEmails) =>
      currentEmails.map((email) => (email.id === id ? { ...email, ...changes } : email))
    )
  }

  const toggleRead = (id: number) => {
    const email = emails.find((item) => item.id === id)

    if (!email) {
      return
    }

    updateEmailState(id, { read: !email.read })
  }

  const toggleImportant = (id: number) => {
    const email = emails.find((item) => item.id === id)

    if (!email) {
      return
    }

    updateEmailState(id, { important: !email.important })
  }

  const toggleSpam = (id: number) => {
    const email = emails.find((item) => item.id === id)

    if (!email) {
      return
    }

    updateEmailState(id, {
      spam: !email.spam,
      read: true,
      important: email.spam ? email.important : false
    })
  }

  return (
    <section className="inbox-page">
      <header className="inbox-header">
        <div>
          <p className="eyebrow">Student email triage</p>
          <h2>Inbox</h2>
        </div>

        <button type="button" className="sync-button">
          Demo Sync
        </button>
      </header>

      <div className="inbox-shell">
        <aside className="email-list-panel">
          <div className="inbox-toolbar">
            <label className="search-box" htmlFor="inbox-search">
              <span className="search-label">Search</span>
              <input
                id="inbox-search"
                type="text"
                placeholder="Search inbox"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>

            <div className="filter-row" aria-label="Inbox filters">
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

          <div className="email-list">
            {filteredEmails.length > 0 ? (
              filteredEmails.map((email) => (
                <button
                  key={email.id}
                  type="button"
                  className={`email-item ${visibleSelectedId === email.id ? 'selected' : ''} ${!email.read ? 'unread' : ''}`}
                  onClick={() => setSelectedId(email.id)}
                >
                  <div className="email-topline">
                    <span className="sender-name">{email.sender}</span>
                    {email.important && <span className="important-star">★</span>}
                  </div>

                  <div className="subject-row">
                    <span className="subject-text">{email.subject}</span>
                    {!email.read && <span className="unread-dot" aria-label="Unread email" />}
                  </div>

                  <div className="meta-row">
                    <span>{formatDate(email.date)}</span>
                    <span className={`priority-badge priority-${email.priority.toLowerCase()}`}>
                      {email.priority}
                    </span>
                  </div>

                  <p className="email-preview">{email.preview}</p>
                </button>
              ))
            ) : (
              <div className="empty-state">
                <h3>No matching emails</h3>
                <p>Try another keyword or switch to a different inbox filter.</p>
              </div>
            )}
          </div>
        </aside>

        <main className="detail-panel">
          {selectedEmail ? (
            <article className="message-card">
              <div className="message-header">
                <div>
                  <p className="detail-label">From</p>
                  <h3>{selectedEmail.sender}</h3>
                  <p className="detail-meta">{selectedEmail.email}</p>
                </div>

                <div className="message-actions">
                  <button type="button" className="action-button" onClick={() => toggleRead(selectedEmail.id)}>
                    {selectedEmail.read ? 'Mark unread' : 'Mark read'}
                  </button>
                  <button type="button" className="action-button" onClick={() => toggleImportant(selectedEmail.id)}>
                    {selectedEmail.important ? 'Remove importance' : 'Mark important'}
                  </button>
                  <button type="button" className="action-button danger" onClick={() => toggleSpam(selectedEmail.id)}>
                    {selectedEmail.spam ? 'Restore email' : 'Move to Spam'}
                  </button>
                </div>
              </div>

              <div className="message-subject-row">
                <span className="detail-tag">Subject</span>
                <h4>{selectedEmail.subject}</h4>
              </div>

              <div className="message-meta-row">
                <span>{formatDate(selectedEmail.date)}</span>
                <span className={`priority-badge priority-${selectedEmail.priority.toLowerCase()}`}>
                  {selectedEmail.priority}
                </span>
                {selectedEmail.important && <span className="detail-chip">Important</span>}
                {selectedEmail.spam && <span className="detail-chip spam-chip">Spam</span>}
              </div>

              <div className="signal-tags">
                {selectedEmail.signals.map((signal) => (
                  <span key={signal} className="signal-tag">
                    {signal}
                  </span>
                ))}
              </div>

              {selectedEmail.warning && (
                <div className="warning-banner" role="alert">
                  <strong>Scam warning:</strong> {selectedEmail.warning}
                </div>
              )}

              <div className="message-body">
                {selectedEmail.body.split('\n').map((line, index) => (
                  <p key={`${selectedEmail.id}-${index}`}>{line || ' '}</p>
                ))}
              </div>

              {selectedEmail.important && (
                <div className="ai-card">
                  <div className="ai-header">
                    <span className="section-label">Simulated AI analysis</span>
                    <span className="demo-note">Demo data</span>
                  </div>

                  <p className="ai-summary">{selectedEmail.summary}</p>

                  <div className="ai-detected">
                    <h5>Detected items</h5>
                    <ul>
                      {selectedEmail.signals.map((signal) => (
                        <li key={signal}>{signal}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {!selectedEmail.warning && !selectedEmail.spam && selectedEmail.important && (
                <div className="info-card">
                  <span className="section-label">AI confidence</span>
                  <p>High confidence. This message appears to contain a real student action item or deadline.</p>
                </div>
              )}

              {selectedEmail.spam && (
                <div className="info-card danger-card">
                  <span className="section-label">Spam review</span>
                  <p>This message has been moved to the demo spam queue for safety review.</p>
                </div>
              )}
            </article>
          ) : (
            <div className="empty-state detail-empty">
              <h3>No email selected</h3>
              <p>Select a message to review the full contents and AI summary.</p>
            </div>
          )}
        </main>
      </div>
    </section>
  )
}

export default Inbox