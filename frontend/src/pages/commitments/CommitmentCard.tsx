import { PlannerItemAction, PlannerItemCard } from '../../components/PlannerItemCard'
import type { Commitment } from '../../types/commitment'
import type { PlannerItemSelection } from '../../types/plannerItemSelection'
import { formatDueDate, getStatus } from './utils'

type CommitmentCardProps = {
  commitment: Commitment
  onToggleCompletion: (id: number) => void
  onEdit: (commitment: Commitment) => void
  onDelete: (id: number) => void
  onViewInCalendar: (request: PlannerItemSelection) => void
  isSelected: boolean
}

function CommitmentCard({
  commitment,
  onToggleCompletion,
  onEdit,
  onDelete,
  onViewInCalendar,
  isSelected
}: CommitmentCardProps) {
  return (
    <PlannerItemCard
      id={`commitment-card-${commitment.id}`}
      className={`commitment-card${commitment.completed ? ' commitment-card-completed' : ''}${isSelected ? ' planner-item-card-selected' : ''}`}
      kind="Commitment"
      title={commitment.name}
      category={commitment.category}
      priority={commitment.priority}
      dateLabel={`Due ${formatDueDate(commitment.dueDate, commitment.dueTime)}`}
      subtitle={commitment.course}
      description={commitment.sourceEmail ? `Source email: ${commitment.sourceEmail}` : undefined}
      status={getStatus(commitment)}
      expandActionsOnClick
      initialActionsOpen={isSelected}
      actionsPlacement="bottom"
      actions={(
        <>
          <PlannerItemAction kind="edit" onClick={() => onEdit(commitment)} />
          <PlannerItemAction kind="delete" onClick={() => onDelete(commitment.id)} />
          <PlannerItemAction
            kind="calendar"
            onClick={() => onViewInCalendar({
              kind: 'Commitment',
              id: commitment.id,
              date: commitment.dueDate
            })}
          />
        </>
      )}
      trailingContent={
        <label className="checkbox-wrap" aria-label={`Mark ${commitment.name} completed`}>
          <input
            type="checkbox"
            checked={commitment.completed}
            onChange={() => onToggleCompletion(commitment.id)}
          />
          <span className="checkbox-custom" aria-hidden="true" />
        </label>
      }
    />
  )
}

export default CommitmentCard
