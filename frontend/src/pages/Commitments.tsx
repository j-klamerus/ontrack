import { useEffect, useMemo, useState } from 'react'
import CommitmentFormModal from './commitments/CommitmentFormModal'
import CommitmentSummaryCards from './commitments/CommitmentSummaryCards'
import CommitmentTracker from './commitments/CommitmentTracker'
import SuggestedCommitmentsPanel from './commitments/SuggestedCommitmentsPanel'
import {
  allFilterOption,
  type CommitmentFilter,
  type CommitmentSuggestion
} from './commitments/types'
import { getStatus } from './commitments/utils'
import { getEventCategories, saveItemCategoryOverride } from '../constants/eventCategories'
import {
  addCommitment,
  deleteCommitment,
  deleteCommitments,
  getCommitments,
  updateCommitment
} from '../services/commitments'
import { getDashboardSuggestions } from '../services/dashboardSuggestions'
import { getEmails } from '../services/emails'
import {
  confirmDashboardSuggestion,
  dismissDashboardSuggestion
} from '../services/reviewedSuggestions'
import { recordPlannerPageChange } from '../services/plannerNavigation'
import type { Commitment } from '../types/commitment'
import type { StudentEmail } from '../types/email'
import type { PlannerItemSelection } from '../types/plannerItemSelection'
import '../styles/Commitments.css'

type CommitmentsProps = {
  onViewInCalendar: (request: PlannerItemSelection) => void
  selectionRequest: PlannerItemSelection | null
  onSelectionHandled: () => void
}

function Commitments({
  onViewInCalendar,
  selectionRequest,
  onSelectionHandled
}: CommitmentsProps) {
  const eventCategories = getEventCategories()
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [suggestions, setSuggestions] = useState<CommitmentSuggestion[]>([])
  const [emails, setEmails] = useState<StudentEmail[]>([])
  const [activeFilter, setActiveFilter] = useState<CommitmentFilter>('All')
  const [categoryFilter, setCategoryFilter] = useState(allFilterOption)
  const [priorityFilter, setPriorityFilter] = useState(allFilterOption)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [suggestionError, setSuggestionError] = useState<string | null>(null)
  const [savingSuggestionId, setSavingSuggestionId] = useState<number | null>(null)
  const [editingSuggestion, setEditingSuggestion] = useState<CommitmentSuggestion | null>(null)
  const [editingCommitment, setEditingCommitment] = useState<Commitment | null>(null)
  const [isAddingCommitment, setIsAddingCommitment] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [commitmentFormError, setCommitmentFormError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getCommitments(), getDashboardSuggestions(), getEmails()])
      .then(([loadedCommitments, loadedSuggestions, loadedEmails]) => {
        setCommitments(loadedCommitments)
        setSuggestions(
          loadedSuggestions.filter(
            (suggestion): suggestion is CommitmentSuggestion => suggestion.kind === 'Commitment'
          )
        )
        setEmails(loadedEmails)
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : 'Unable to load commitments.')
      })
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    if (!selectionRequest || isLoading) {
      return
    }

    document
      .getElementById(`commitment-card-${selectionRequest.id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    onSelectionHandled()
  }, [isLoading, onSelectionHandled, selectionRequest])

  const summary = useMemo(() => ({
    total: commitments.length,
    upcoming: commitments.filter((item) => getStatus(item) === 'Upcoming').length,
    overdue: commitments.filter((item) => getStatus(item) === 'Overdue').length,
    completed: commitments.filter((item) => getStatus(item) === 'Completed').length
  }), [commitments])

  const filteredCommitments = commitments.filter((commitment) => {
    const status = getStatus(commitment)
    const matchesFilter = activeFilter === 'All' || status === activeFilter
    const matchesCategory = categoryFilter === allFilterOption || commitment.category === categoryFilter
    const matchesPriority = priorityFilter === allFilterOption || commitment.priority === priorityFilter
    const trimmedSearch = searchTerm.trim().toLowerCase()

    if (!matchesFilter || !matchesCategory || !matchesPriority) {
      return false
    }

    if (!trimmedSearch) {
      return true
    }

    const searchableText = [
      commitment.name,
      commitment.course,
      commitment.sourceEmail,
      commitment.category,
      commitment.priority,
      status,
      commitment.dueDate,
      commitment.dueTime,
      commitment.completed ? 'read done complete' : 'active incomplete'
    ].join(' ').toLowerCase()

    return searchableText.includes(trimmedSearch)
  })

  const hasActiveSearchFilters =
    searchTerm.trim().length > 0 ||
    activeFilter !== 'All' ||
    categoryFilter !== allFilterOption ||
    priorityFilter !== allFilterOption

  const visibleActiveCommitments = filteredCommitments.filter((item) => !item.completed)
  const completedCommitments = filteredCommitments.filter((item) => item.completed)

  const clearSearchFilters = () => {
    setSearchTerm('')
    setActiveFilter('All')
    setCategoryFilter(allFilterOption)
    setPriorityFilter(allFilterOption)
  }

  const handleClearCompleted = () => {
    const completedIds = commitments
      .filter((commitment) => commitment.completed)
      .map((commitment) => commitment.id)

    if (completedIds.length === 0) {
      return
    }

    const confirmed = window.confirm(
      `Permanently delete ${completedIds.length} completed commitment${completedIds.length === 1 ? '' : 's'}?`
    )
    if (!confirmed) {
      return
    }

    try {
      deleteCommitments(completedIds)
      setCommitments((current) =>
        current.filter((commitment) => !completedIds.includes(commitment.id))
      )
      recordPlannerPageChange('commitments')
      setActionError(null)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to delete completed commitments.')
    }
  }

  const handleToggleCompletion = (id: number) => {
    const commitment = commitments.find((item) => item.id === id)
    if (!commitment) {
      return
    }

    const updated = { ...commitment, completed: !commitment.completed }
    try {
      updateCommitment(updated)
      setCommitments((current) =>
        current.map((item) => item.id === id ? updated : item)
      )
      recordPlannerPageChange('commitments')
      setActionError(null)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update the commitment.')
    }
  }

  const handleSaveCommitment = () => {
    if (!editingCommitment) {
      return
    }

    if (
      !editingCommitment.name.trim() ||
      !editingCommitment.course.trim() ||
      !editingCommitment.dueDate ||
      !editingCommitment.dueTime
    ) {
      setCommitmentFormError('Enter a title, course, due date, and due time.')
      return
    }

    const preparedCommitment = {
      ...editingCommitment,
      name: editingCommitment.name.trim(),
      course: editingCommitment.course.trim(),
      sourceEmail: editingCommitment.sourceEmail.trim()
    }

    try {
      if (isAddingCommitment) {
        addCommitment(preparedCommitment)
        setCommitments((current) => [...current, preparedCommitment])
      } else {
        saveItemCategoryOverride('commitment', preparedCommitment.id, preparedCommitment.category)
        updateCommitment(preparedCommitment)
        setCommitments((current) =>
          current.map((item) => item.id === preparedCommitment.id ? preparedCommitment : item)
        )
      }
      recordPlannerPageChange('commitments')
      setActionError(null)
      setCommitmentFormError(null)
    } catch (error) {
      setCommitmentFormError(error instanceof Error ? error.message : 'Unable to save the commitment.')
      return
    }

    setEditingCommitment(null)
    setIsAddingCommitment(false)
    setCommitmentFormError(null)
  }

  const handleDeleteCommitment = (id: number) => {
    try {
      deleteCommitment(id)
      setCommitments((current) => current.filter((commitment) => commitment.id !== id))
      recordPlannerPageChange('commitments')
      setActionError(null)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to delete the commitment.')
      return
    }

    setEditingCommitment(null)
    setIsAddingCommitment(false)
  }

  const openAddCommitment = () => {
    const now = new Date()
    const date = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('-')

    setEditingCommitment({
      id: Math.max(Date.now(), ...commitments.map((item) => item.id)) + 1,
      name: '',
      course: '',
      dueDate: date,
      dueTime: '09:00',
      category: 'Other',
      priority: 'Medium',
      completed: false,
      sourceEmail: ''
    })
    setIsAddingCommitment(true)
    setActionError(null)
    setCommitmentFormError(null)
  }

  const openEditCommitment = (commitment: Commitment) => {
    setEditingCommitment({ ...commitment })
    setIsAddingCommitment(false)
    setCommitmentFormError(null)
  }

  const handleConfirmSuggestion = (suggestion: CommitmentSuggestion) => {
    setSavingSuggestionId(suggestion.id)
    setSuggestionError(null)

    try {
      const sourceEmail = emails.find((email) => email.id === suggestion.sourceEmailId)
      const confirmed = confirmDashboardSuggestion(suggestion, sourceEmail?.email ?? '')
      if (confirmed.kind !== 'Commitment') {
        throw new Error('This suggestion is not a commitment.')
      }

      setCommitments((current) => [...current, confirmed.commitment])
      setSuggestions((current) => current.filter((item) => item.id !== suggestion.id))
      setEditingSuggestion(null)
    } catch (error) {
      setSuggestionError(error instanceof Error ? error.message : 'Unable to add this suggested commitment.')
    } finally {
      setSavingSuggestionId(null)
    }
  }

  const handleDismissSuggestion = (suggestionId: number) => {
    try {
      dismissDashboardSuggestion(suggestionId, 'Commitment')
      setSuggestions((current) => current.filter((suggestion) => suggestion.id !== suggestionId))
      setEditingSuggestion(null)
      setSuggestionError(null)
    } catch (error) {
      setSuggestionError(error instanceof Error ? error.message : 'Unable to dismiss this suggestion.')
    }
  }

  const handleSaveSuggestion = () => {
    if (!editingSuggestion || !editingSuggestion.title.trim() || !editingSuggestion.date || !editingSuggestion.time) {
      return
    }

    const updatedSuggestion = { ...editingSuggestion, title: editingSuggestion.title.trim() }
    setSuggestions((current) =>
      current.map((suggestion) => suggestion.id === updatedSuggestion.id ? updatedSuggestion : suggestion)
    )
    recordPlannerPageChange('commitments')
    setEditingSuggestion(null)
  }

  const closeCommitmentForm = () => {
    setEditingCommitment(null)
    setIsAddingCommitment(false)
    setCommitmentFormError(null)
  }

  if (isLoading) {
    return <section className="commitments-page" role="status">Loading commitments...</section>
  }

  if (loadError) {
    return <section className="commitments-page" role="alert">{loadError}</section>
  }

  return (
    <section className="commitments-page">
      <header className="commitments-intro">
        <div>
          <h2>Your Commitments</h2>
          <p>Keep track of your tasks, deadlines, and suggested action items.</p>
        </div>
      </header>

      {actionError && <p className="commitment-action-error" role="alert">{actionError}</p>}

      <CommitmentSummaryCards summary={summary} />
      <SuggestedCommitmentsPanel
        suggestions={suggestions}
        emails={emails}
        categories={eventCategories}
        editingSuggestion={editingSuggestion}
        savingSuggestionId={savingSuggestionId}
        error={suggestionError}
        onEditingSuggestionChange={setEditingSuggestion}
        onConfirm={handleConfirmSuggestion}
        onDismiss={handleDismissSuggestion}
        onSave={handleSaveSuggestion}
      />
      <CommitmentTracker
        commitments={commitments}
        onAddCommitment={openAddCommitment}
        selectedCommitmentId={selectionRequest?.kind === 'Commitment' ? selectionRequest.id : null}
        activeCommitments={visibleActiveCommitments}
        completedCommitments={completedCommitments}
        categories={eventCategories}
        activeFilter={activeFilter}
        categoryFilter={categoryFilter}
        priorityFilter={priorityFilter}
        searchTerm={searchTerm}
        hasActiveSearchFilters={hasActiveSearchFilters}
        onFilterChange={setActiveFilter}
        onCategoryChange={setCategoryFilter}
        onPriorityChange={setPriorityFilter}
        onSearchChange={setSearchTerm}
        onClearFilters={clearSearchFilters}
        onClearCompleted={handleClearCompleted}
        onToggleCompletion={handleToggleCompletion}
        onEdit={openEditCommitment}
        onDelete={handleDeleteCommitment}
        onViewInCalendar={onViewInCalendar}
      />
      {editingCommitment && (
        <CommitmentFormModal
          commitment={editingCommitment}
          isAdding={isAddingCommitment}
          error={commitmentFormError}
          categories={eventCategories}
          onChange={setEditingCommitment}
          onClose={closeCommitmentForm}
          onSave={handleSaveCommitment}
          onDelete={handleDeleteCommitment}
        />
      )}
    </section>
  )
}

export default Commitments
