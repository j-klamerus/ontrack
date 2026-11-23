import { useRef, type ReactNode } from 'react'
import { CalendarDays, Check, ClipboardList, Pencil, Save, Send, Trash2, X } from 'lucide-react'
import type { EventCategory, EventPriority } from '../types/calendarEvent'
import { getEventCategoryColor } from '../constants/eventCategories'
import { useExpandableCardActions } from './useExpandableCardActions'
import '../styles/PlannerItemCard.css'

export type PlannerItemKind = 'Calendar event' | 'Commitment'
export type PlannerActionKind = 'confirm' | 'send' | 'edit' | 'delete' | 'save' | 'cancel' | 'calendar' | 'commitments'

type PlannerItemCardProps = {
  id?: string
  className?: string
  kind: PlannerItemKind
  title: string
  category: EventCategory
  priority: EventPriority
  dateLabel: string
  subtitle?: string
  description?: string
  status?: string
  isSuggestion?: boolean
  expandActionsOnClick?: boolean
  initialActionsOpen?: boolean
  isEditing?: boolean
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
  calendar: CalendarDays,
  commitments: ClipboardList,
  confirm: Check,
  send: Send,
  edit: Pencil,
  delete: Trash2,
  save: Save,
  cancel: X
}

const actionLabels: Record<PlannerActionKind, string> = {
  calendar: 'View in Calendar',
  commitments: 'View in Commitments',
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
  id,
  className,
  kind,
  title,
  category,
  priority,
  dateLabel,
  subtitle,
  description,
  status,
  isSuggestion = false,
  expandActionsOnClick = false,
  initialActionsOpen = false,
  isEditing = false,
  actionsPlacement = 'bottom',
  leadingAction,
  actions,
  trailingContent,
  children
}: PlannerItemCardProps) {
  const categoryColor = getEventCategoryColor(category)
  const isActionExpandable = isSuggestion || expandActionsOnClick
  const cardRef = useRef<HTMLElement | null>(null)
  const actionDisclosure = useExpandableCardActions(cardRef, isEditing, initialActionsOpen)

  return (
    <article
      id={id}
      ref={isActionExpandable ? cardRef : undefined}
      className={[
        'planner-item-card',
        className,
        isSuggestion && 'planner-item-card-suggestion',
        isActionExpandable && 'planner-item-card-expandable',
        isActionExpandable && (actionDisclosure.isOpen || isEditing) && 'planner-item-card-actions-open',
        isEditing && 'planner-item-card-editing'
      ].filter(Boolean).join(' ')}
      tabIndex={isActionExpandable ? 0 : undefined}
      aria-label={isActionExpandable ? `${isSuggestion ? `${kind} suggestion` : kind}: ${title}` : undefined}
      aria-expanded={isActionExpandable ? actionDisclosure.isOpen || isEditing : undefined}
      aria-controls={isActionExpandable && actions ? actionDisclosure.actionsId : undefined}
      onClick={(event) => {
        if (
          !isActionExpandable ||
          isEditing ||
          (event.target instanceof Element &&
            event.target.closest('button, input, textarea, select, a, label, [contenteditable="true"]'))
        ) {
          return
        }

        actionDisclosure.toggle()
      }}
      onKeyDown={(event) => {
        if (
          isActionExpandable &&
          !isEditing &&
          event.target === event.currentTarget &&
          (event.key === 'Enter' || event.key === ' ')
        ) {
          event.preventDefault()
          actionDisclosure.toggle()
        }
      }}
    >
      {leadingAction && <div className="planner-item-leading">{leadingAction}</div>}
      <div className="planner-item-content">
        <div className="planner-item-labels">
          <span className="planner-item-kind-group">
            <span
              className={`type-marker ${kind === 'Commitment' ? 'type-marker-commitment' : 'type-marker-event'}`}
              style={{ backgroundColor: categoryColor }}
              aria-hidden="true"
            />
            <span className="planner-item-kind">
              {isSuggestion ? `${kind} suggestion` : kind}
            </span>
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
          <div
            id={isActionExpandable ? actionDisclosure.actionsId : undefined}
            className="planner-item-actions"
            onClick={isActionExpandable ? actionDisclosure.close : undefined}
          >
            {actions}
          </div>
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
