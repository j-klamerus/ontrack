import { PlannerItemAction, PlannerItemCard } from '../../components/PlannerItemCard'
import type { Commitment } from '../../types/commitment'
import { formatDueDate, getStatus } from './utils'

type CommitmentCardProps = {
  commitment: Commitment
  onToggleCompletion: (id: number) => void
  onEdit: (commitment: Commitment) => void
  onDelete: (id: number) => void
}

function CommitmentCard({ commitment, onToggleCompletion, onEdit, onDelete }: CommitmentCardProps) {
  return (
    <PlannerItemCard
      kind="Commitment"
      title={commitment.name}
      category={commitment.category}
      priority={commitment.priority}
      dateLabel=""
      subtitle={commitment.course}
      description={commitment.sourceEmail ? `Source email: ${commitment.sourceEmail}` : undefined}
      status={getStatus(commitment)}
      leadingAction={
        <label className="checkbox-wrap" aria-label={`Mark ${commitment.name} completed`}>
          <input
            type="checkbox"
            checked={commitment.completed}
            onChange={() => onToggleCompletion(commitment.id)}
          />
          <span className="checkbox-custom" aria-hidden="true" />
        </label>
      }
      trailingContent={
        <div className="commitment-card-trailing">
          <p className="planner-item-date">
            Due {formatDueDate(commitment.dueDate, commitment.dueTime)}
          </p>
          <PlannerItemAction kind="edit" onClick={() => onEdit(commitment)} />
          <PlannerItemAction kind="delete" onClick={() => onDelete(commitment.id)} />
        </div>
      }
    />
  )
}

export default CommitmentCard
