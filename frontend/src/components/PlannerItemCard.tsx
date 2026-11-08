import type { ReactNode } from 'react'
import { Check, Pencil, Save, Send, Trash2, X } from 'lucide-react'
import type { EventCategory, EventPriority } from '../types/calendarEvent'
import { getEventCategoryColor } from '../constants/eventCategories'
import '../styles/PlannerItemCard.css'

export type PlannerItemKind = 'Calendar event' | 'Commitment'
export type PlannerActionKind = 'confirm' | 'send' | 'edit' | 'delete' | 'save' | 'cancel'

type PlannerItemCardProps = {
  kind: PlannerItemKind
  title: string
  category: EventCategory
  priority: EventPriority
  dateLabel: string
  subtitle?: string
  description?: string
  status?: string
  isSuggestion?: boolean
  isEditing?: boolean
  actionsOnHover?: boolean
  actionsPlacement?: 'bottom' | 'right'
  leadingAction?: ReactNode
  actions?: ReactNode
  trailingContent?: ReactNode
  children?: ReactNode
}

type PlannerItemActionProps = {
  kind: PlannerActionKind
  onClick: () => void
  disabled?: boolean
  label?: string
}

const actionIcons = {
  confirm: Check,
  send: Send,
  edit: Pencil,
  delete: Trash2,
  save: Save,
  cancel: X
}

const actionLabels: Record<PlannerActionKind, string> = {
  confirm: 'Confirm',
  send: 'Send',
  edit: 'Edit',
  delete: 'Delete',
  save: 'Save edit',
  cancel: 'Cancel'
}

export function PlannerItemAction({
  kind,
  onClick,
  disabled = false,
  label
}: PlannerItemActionProps) {
  const Icon = actionIcons[kind]

  return (
    <button
      type="button"
      className={`planner-item-action planner-item-action-${kind}`}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon size={14} aria-hidden="true" />
      {label ?? actionLabels[kind]}
    </button>
  )
}

export function PlannerItemCard({
  kind,
  title,
  category,
  priority,
  dateLabel,
  subtitle,
  description,
  status,
  isSuggestion = false,
  isEditing = false,
  actionsOnHover = false,
  actionsPlacement = 'bottom',
  leadingAction,
  actions,
  trailingContent,
  children
}: PlannerItemCardProps) {
  const categoryColor = getEventCategoryColor(category)

  return (
    <article
      className={[
        'planner-item-card',
        isSuggestion && 'planner-item-card-suggestion',
        actionsOnHover && 'planner-item-card-actions-on-hover',
        isEditing && 'planner-item-card-editing'
      ].filter(Boolean).join(' ')}
    >
      {leadingAction && <div className="planner-item-leading">{leadingAction}</div>}
      <div className="planner-item-content">
        <div className="planner-item-labels">
          <span
            className={`type-marker ${kind === 'Commitment' ? 'type-marker-commitment' : 'type-marker-event'}`}
            style={{ backgroundColor: categoryColor }}
            aria-hidden="true"
          />
          <span className="planner-item-kind">
            {isSuggestion ? `${kind} suggestion` : kind}
          </span>
          <span className="planner-item-category" style={{ color: categoryColor }}>
            {category}
          </span>
          <span className={`priority-badge priority-${priority.toLowerCase()}`}>
            {priority}
          </span>
          {status && <span className={`planner-item-status planner-item-status-${status.toLowerCase()}`}>{status}</span>}
        </div>

        {isEditing ? (
          <div className="planner-item-editor">{children}</div>
        ) : (
          <div className="planner-item-details">
            <h3 className="planner-item-title">{title}</h3>
            {subtitle && <p className="planner-item-subtitle">{subtitle}</p>}
            {dateLabel && <p className="planner-item-date">{dateLabel}</p>}
            {description && <p className="planner-item-description">{description}</p>}
          </div>
        )}

        {actions && actionsPlacement === 'bottom' && (
          <div className="planner-item-actions">{actions}</div>
        )}
      </div>
      {(trailingContent || (actions && actionsPlacement === 'right')) && (
        <aside className="planner-item-trailing">
          {trailingContent}
          {actions && actionsPlacement === 'right' && (
            <div className="planner-item-actions planner-item-actions-right">{actions}</div>
          )}
        </aside>
      )}
    </article>
  )
}
