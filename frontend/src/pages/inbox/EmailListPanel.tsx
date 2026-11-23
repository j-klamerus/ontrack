// Inbox list UI for scanning, filtering, grouping, and selecting messages.
import { CheckCheck, Search, X } from 'lucide-react'
import type { EmailSignal, StudentEmail } from '../../types/email'
import {
  filterOptions,
  formatDate,
  priorityOptions,
  signalOptions,
  type EmailFilter,
  type EmailSort,
  type PriorityFilter
} from './types'

type EmailListPanelProps = {
  emails: StudentEmail[]
  filteredEmails: StudentEmail[]
  emailGroups: Array<{ id: string; label: string; emails: StudentEmail[] }>
  labelsByEmailId: Map<number, string[]>
  selectedId: number | null
  searchTerm: string
  activeFilter: EmailFilter
  priorityFilter: PriorityFilter
  signalFilter: EmailSignal | 'All'
  sortBy: EmailSort
  isScanned: boolean
  hasScanResults: boolean
  classificationCleared: boolean
  isScanning: boolean
  scanError: string | null
  sortError: string | null
  persistenceError: string | null
  hasActiveSearchFilters: boolean
  onSelectEmail: (id: number) => void
  onSearchChange: (value: string) => void
  onFilterChange: (value: EmailFilter) => void
  onPriorityChange: (value: PriorityFilter) => void
  onSignalChange: (value: EmailSignal | 'All') => void
  onSortChange: (value: EmailSort) => void
  onClearCategoriesAndPriorities: () => void
  onClearFilters: () => void
  onMarkAllRead: () => void
  onScanEmails: () => void
}

/** Renders scan controls and the grouped email list from Inbox's current results. */
function EmailListPanel({
  emails,
  filteredEmails,
  emailGroups,
  labelsByEmailId,
  selectedId,
  searchTerm,
  activeFilter,
  priorityFilter,
  signalFilter,
  sortBy,
  isScanned,
  hasScanResults,
  classificationCleared,
  isScanning,
  scanError,
  sortError,
  persistenceError,
  hasActiveSearchFilters,
  onSelectEmail,
  onSearchChange,
  onFilterChange,
  onPriorityChange,
  onSignalChange,
  onSortChange,
  onClearCategoriesAndPriorities,
  onClearFilters,
  onMarkAllRead,
  onScanEmails
}: EmailListPanelProps) {
  return (
    <aside className="email-list-panel">
      <div className="inbox-toolbar">
        <div className="inbox-toolbar-heading">
          <div>
            <h2>Inbox</h2>
            <span>{filteredEmails.length} {filteredEmails.length === 1 ? 'message' : 'messages'}</span>
          </div>
          <div className="inbox-toolbar-actions">
            <button
              type="button"
              className="action-button scan-emails-button"
              onClick={onScanEmails}
              disabled={isScanning}
            >
              <Search size={15} aria-hidden="true" />
              {isScanning ? 'Scanning...' : hasScanResults ? 'Rescan emails' : 'Scan emails'}
            </button>
            {isScanned && (
              <button
                type="button"
                className="action-button"
                onClick={onClearCategoriesAndPriorities}
                disabled={isScanning}
              >
                <X size={15} aria-hidden="true" />
                Clear categories &amp; priorities
              </button>
            )}
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
        </div>
        {scanError && <p className="inbox-scan-error" role="alert">{scanError}</p>}
        {sortError && <p className="inbox-scan-error" role="alert">{sortError}</p>}
        {persistenceError && <p className="inbox-scan-error" role="alert">{persistenceError}</p>}
        {classificationCleared && (
          <p className="inbox-scan-note">Categories and priorities were cleared. Spam detections remain visible.</p>
        )}
        {!hasScanResults && !scanError && (
          <p className="inbox-scan-note">Categories, tags, priorities, and spam matches are added when you scan emails.</p>
        )}

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
              onChange={(event) => onPriorityChange(event.target.value as PriorityFilter)}
              disabled={!isScanned}
            >
              <option value="All">{isScanned ? 'All priorities' : 'Scan emails to filter priorities'}</option>
              {priorityOptions.map((priority) => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
              <option value="None">No priority</option>
            </select>
          </label>
          <label className="inbox-facet">
            <span>Category</span>
            <select
              aria-label="Filter by category"
              value={signalFilter}
              onChange={(event) => onSignalChange(event.target.value as EmailSignal | 'All')}
              disabled={!isScanned}
            >
              <option value="All">{isScanned ? 'All categories' : 'Scan emails to filter categories'}</option>
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
          <label className="inbox-facet inbox-sort-facet">
            <span>Sort order</span>
            <select
              aria-label="Sort inbox emails"
              value={sortBy}
              onChange={(event) => onSortChange(event.target.value as EmailSort)}
            >
              <option value="priority">Sort by priority</option>
              <option value="category">Sort by category</option>
              <option value="date">Sort by date</option>
            </select>
          </label>
        </div>
      </div>

      <div className="email-list">
        {/* After scanning, groups and labels come from backend rule results. */}
        {emailGroups.length > 0 ? emailGroups.map((group) => (
          <section className="email-group" key={group.id}>
            <h3 className="email-group-heading">{group.label}</h3>
            {group.emails.map((email) => (
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

                {(labelsByEmailId.get(email.id) ?? []).length > 0 && (
                  <div className="email-rule-labels">
                    {(labelsByEmailId.get(email.id) ?? []).map((label) => (
                      <span className="email-rule-label" key={label}>{label}</span>
                    ))}
                  </div>
                )}

                <div className="meta-row">
                  <span>{formatDate(email.date)}</span>
                  <span className="email-meta-badges">
                    {email.spamDetected && (
                      <span className="detail-chip spam-detected-chip">Spam detected</span>
                    )}
                    {email.priority ? (
                      <span className={`priority-badge priority-${email.priority.toLowerCase()}`}>
                        {email.priority}
                      </span>
                    ) : isScanned ? (
                      <span className="priority-badge priority-none">No priority detected</span>
                    ) : null}
                  </span>
                </div>

                <p className="email-preview">{email.preview}</p>
              </button>
            ))}
          </section>
        )) : (
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
