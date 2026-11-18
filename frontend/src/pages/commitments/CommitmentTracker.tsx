import { Plus, Trash2 } from 'lucide-react'
import { PlannerKey } from '../../components/PlannerKey'
import type { Commitment, Priority } from '../../types/commitment'
import type { EventCategory } from '../../types/calendarEvent'
import type { PlannerItemSelection } from '../../types/plannerItemSelection'
import CommitmentCard from './CommitmentCard'
import { allFilterOption, filterOptions, priorityOptions, type CommitmentFilter } from './types'

type CommitmentTrackerProps = {
  commitments: Commitment[]
  onAddCommitment: () => void
  selectedCommitmentId: number | null
  activeCommitments: Commitment[]
  completedCommitments: Commitment[]
  categories: EventCategory[]
  activeFilter: CommitmentFilter
  categoryFilter: string
  priorityFilter: string
  searchTerm: string
  hasActiveSearchFilters: boolean
  onFilterChange: (filter: CommitmentFilter) => void
  onCategoryChange: (category: string) => void
  onPriorityChange: (priority: string) => void
  onSearchChange: (term: string) => void
  onClearFilters: () => void
  onClearCompleted: () => void
  onToggleCompletion: (id: number) => void
  onEdit: (commitment: Commitment) => void
  onDelete: (id: number) => void
  onViewInCalendar: (request: PlannerItemSelection) => void
}

function CommitmentTracker({
  commitments,
  onAddCommitment,
  selectedCommitmentId,
  activeCommitments,
  completedCommitments,
  categories,
  activeFilter,
  categoryFilter,
  priorityFilter,
  searchTerm,
  hasActiveSearchFilters,
  onFilterChange,
  onCategoryChange,
  onPriorityChange,
  onSearchChange,
  onClearFilters,
  onClearCompleted,
  onToggleCompletion,
  onEdit,
  onDelete,
  onViewInCalendar
}: CommitmentTrackerProps) {
  const renderCard = (commitment: Commitment) => (
    <CommitmentCard
      key={commitment.id}
      commitment={commitment}
      onToggleCompletion={onToggleCompletion}
      onEdit={onEdit}
      onDelete={onDelete}
      onViewInCalendar={onViewInCalendar}
      isSelected={selectedCommitmentId === commitment.id}
    />
  )

  return (
    <section className="commitment-section commitment-tracker" aria-labelledby="commitment-tracker-heading">
      <div className="commitment-tracker-header">
        <div>
          <h2 id="commitment-tracker-heading">All Commitments</h2>
          <p>Track and manage your tasks and deadlines.</p>
        </div>
        <div className="commitment-tracker-header-actions">
          <button
            type="button"
            className="primary-button commitment-tracker-add-button"
            onClick={onAddCommitment}
          >
            <Plus size={16} aria-hidden="true" />
            Add Commitment
          </button>
          <span className="panel-count">{activeCommitments.length + completedCommitments.length}</span>
        </div>
      </div>

      <PlannerKey categories={categories} page="commitments" />

      <div className="tracker-controls">
        <label className="search-box" htmlFor="commitment-search">
          <span className="search-label">Search</span>
          <input
            id="commitment-search"
            type="text"
            placeholder="Name, course, category, priority, date..."
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>

        <div className="tracker-filter-row">
          <div className="filter-group" aria-label="Commitment filters">
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

          <div className="search-facets" aria-label="Filter commitments">
            <label>
              <span>Category</span>
              <select value={categoryFilter} onChange={(event) => onCategoryChange(event.target.value)}>
                <option value={allFilterOption}>All categories</option>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label>
              <span>Priority</span>
              <select value={priorityFilter} onChange={(event) => onPriorityChange(event.target.value)}>
                <option value={allFilterOption}>All priorities</option>
                {priorityOptions.map((priority: Priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
            </label>
            {hasActiveSearchFilters && (
              <button type="button" className="clear-search-button" onClick={onClearFilters}>
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="commitment-groups">
        {activeFilter !== 'Completed' && (
          <section className="commitment-group" aria-labelledby="active-commitments-heading">
            <header className="commitment-group-header">
              <h3 id="active-commitments-heading">Active</h3>
              <span className="panel-count">{activeCommitments.length}</span>
            </header>
            <div className="commitment-list">
              {activeCommitments.length > 0
                ? activeCommitments.map(renderCard)
                : <p className="commitment-group-empty">No active commitments match this view.</p>}
            </div>
          </section>
        )}

        {(activeFilter === 'All' || activeFilter === 'Completed') && (
          <section className="commitment-group" aria-labelledby="completed-commitments-heading">
            <header className="commitment-group-header">
              <h3 id="completed-commitments-heading">Completed</h3>
              {commitments.some((commitment) => commitment.completed) && (
                <button type="button" className="completed-toggle-button" onClick={onClearCompleted}>
                  <Trash2 size={14} aria-hidden="true" />
                  Delete completed
                </button>
              )}
              <span className="panel-count">{completedCommitments.length}</span>
            </header>
            <div className="commitment-list">
              {completedCommitments.length > 0
                ? completedCommitments.map(renderCard)
                : <p className="commitment-group-empty">No completed commitments match this view.</p>}
            </div>
          </section>
        )}
      </div>
    </section>
  )
}

export default CommitmentTracker
