import { CheckCheck, Search, X } from 'lucide-react'
import type { EmailPriority, EmailSignal, StudentEmail } from '../../types/email'
import { filterOptions, formatDate, priorityOptions, signalOptions, type EmailFilter } from './types'

type EmailListPanelProps = {
  emails: StudentEmail[]
  filteredEmails: StudentEmail[]
  selectedId: number | null
  searchTerm: string
  activeFilter: EmailFilter
  priorityFilter: EmailPriority | 'All'
  signalFilter: EmailSignal | 'All'
  hasActiveSearchFilters: boolean
  onSelectEmail: (id: number) => void
  onSearchChange: (value: string) => void
  onFilterChange: (value: EmailFilter) => void
  onPriorityChange: (value: EmailPriority | 'All') => void
  onSignalChange: (value: EmailSignal | 'All') => void
  onClearFilters: () => void
  onMarkAllRead: () => void
}

function EmailListPanel({
  emails,
  filteredEmails,
  selectedId,
  searchTerm,
  activeFilter,
  priorityFilter,
  signalFilter,
  hasActiveSearchFilters,
  onSelectEmail,
  onSearchChange,
  onFilterChange,
  onPriorityChange,
  onSignalChange,
  onClearFilters,
  onMarkAllRead
}: EmailListPanelProps) {
  return (
    <aside className="email-list-panel">
      <div className="inbox-toolbar">
        <div className="inbox-toolbar-heading">
          <div>
            <h2>Inbox</h2>
            <span>{filteredEmails.length} {filteredEmails.length === 1 ? 'message' : 'messages'}</span>
          </div>
          <button
            type="button"
            className="action-button mark-all-read-button"
            onClick={onMarkAllRead}
            disabled={!emails.some((email) => !email.read)}
          >
            <CheckCheck size={15} strokeWidth={2.2} />
            Mark all read
          </button>
        </div>

        <label className="inbox-search-field" htmlFor="inbox-search">
          <Search size={17} aria-hidden="true" />
          <input
            id="inbox-search"
            type="text"
            placeholder="Search emails..."
            aria-label="Search emails"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          {searchTerm && (
            <button type="button" aria-label="Clear search" onClick={() => onSearchChange('')}>
              <X size={15} />
            </button>
          )}
        </label>

        <div className="filter-row" aria-label="Inbox filters">
          {filterOptions.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`filter-button ${activeFilter === filter ? 'active' : ''}`}
              onClick={() => onFilterChange(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="search-facets" aria-label="Filter inbox">
          <label className="inbox-facet">
            <span>Priority</span>
            <select
              aria-label="Filter by priority"
              value={priorityFilter}
              onChange={(event) => onPriorityChange(event.target.value as EmailPriority | 'All')}
            >
              <option value="All">All priorities</option>
              {priorityOptions.map((priority) => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </label>
          <label className="inbox-facet">
            <span>Category</span>
            <select
              aria-label="Filter by category"
              value={signalFilter}
              onChange={(event) => onSignalChange(event.target.value as EmailSignal | 'All')}
            >
              <option value="All">All categories</option>
              {signalOptions.map((signal) => (
                <option key={signal} value={signal}>{signal}</option>
              ))}
            </select>
          </label>
          {hasActiveSearchFilters && (
            <button type="button" className="clear-search-button" onClick={onClearFilters}>
              <X size={14} />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="email-list">
        {filteredEmails.length > 0 ? (
          filteredEmails.map((email) => (
            <button
              key={email.id}
              type="button"
              className={`email-item ${selectedId === email.id ? 'selected' : ''} ${!email.read ? 'unread' : ''}`}
              onClick={() => onSelectEmail(email.id)}
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
  )
}

export default EmailListPanel
