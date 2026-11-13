import { Plus } from 'lucide-react'
import { PlannerItemAction, PlannerItemCard } from '../../components/PlannerItemCard'
import type { CalendarEvent } from '../../types/calendarEvent'
import type { Commitment } from '../../types/commitment'
import type { PlannerItemSelection } from '../../types/plannerItemSelection'
import type { CalendarScheduleItem } from './types'
import { formatFullDate, formatTime } from './formatters'

type CalendarSidebarProps = {
  selectedDateIso: string
  selectedDayEvents: CalendarEvent[]
  selectedDayCommitments: Commitment[]
  upcomingItems: CalendarScheduleItem[]
  onAddEvent: () => void
  onEditEvent: (event: CalendarEvent) => void
  onDeleteEvent: (id: number) => void
  onEditCommitment: (commitment: Commitment) => void
  onDeleteCommitment: (id: number) => void
  onViewInCommitments: (request: PlannerItemSelection) => void
  selectedCalendarItem: Pick<PlannerItemSelection, 'kind' | 'id'> | null
}

function CalendarSidebar({
  selectedDateIso,
  selectedDayEvents,
  selectedDayCommitments,
  upcomingItems,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  onEditCommitment,
  onDeleteCommitment,
  onViewInCommitments,
  selectedCalendarItem
}: CalendarSidebarProps) {
  return (
    <aside className="event-sidebar">
      <div className="selected-day-header">
        <div>
          <p className="mini-label">Selected day</p>
          <h3>{formatFullDate(selectedDateIso)}</h3>
        </div>
        <button type="button" className="add-event-button primary-button" onClick={onAddEvent}>
          <Plus size={16} />
          Add
        </button>
      </div>

      <div className="day-event-list">
        {selectedDayEvents.length + selectedDayCommitments.length > 0 ? (
          <>
            {selectedDayEvents.map((event) => (
              <PlannerItemCard
                id={`calendar-event-card-${event.id}`}
                key={event.id}
                className={
                  selectedCalendarItem?.kind === 'Calendar event' && selectedCalendarItem.id === event.id
                    ? 'planner-item-card-selected'
                    : undefined
                }
                initialActionsOpen={selectedCalendarItem?.kind === 'Calendar event' && selectedCalendarItem.id === event.id}
                kind="Calendar event"
                title={event.title}
                category={event.category}
                priority={event.priority}
                dateLabel={`${formatFullDate(event.date)} · ${formatTime(event.time)}`}
                subtitle={event.course}
                description={event.description}
                expandActionsOnClick
                actionsPlacement="bottom"
                actions={(
                  <>
                    <PlannerItemAction kind="edit" onClick={() => onEditEvent(event)} />
                    <PlannerItemAction kind="delete" onClick={() => onDeleteEvent(event.id)} />
                  </>
                )}
              />
            ))}
            {selectedDayCommitments.map((commitment) => (
              <PlannerItemCard
                id={`calendar-commitment-card-${commitment.id}`}
                key={commitment.id}
                className={
                  selectedCalendarItem?.kind === 'Commitment' && selectedCalendarItem.id === commitment.id
                    ? 'planner-item-card-selected'
                    : undefined
                }
                initialActionsOpen={selectedCalendarItem?.kind === 'Commitment' && selectedCalendarItem.id === commitment.id}
                kind="Commitment"
                title={commitment.name}
                category={commitment.category}
                priority={commitment.priority}
                dateLabel={`Due ${formatFullDate(commitment.dueDate)} · ${formatTime(commitment.dueTime)}`}
                subtitle={commitment.course}
                status={commitment.completed ? 'Completed' : undefined}
                expandActionsOnClick
                actionsPlacement="bottom"
                actions={(
                  <>
                    <PlannerItemAction kind="edit" onClick={() => onEditCommitment(commitment)} />
                    <PlannerItemAction kind="delete" onClick={() => onDeleteCommitment(commitment.id)} />
                    <PlannerItemAction
                      kind="commitments"
                      onClick={() => onViewInCommitments({
                        kind: 'Commitment',
                        id: commitment.id,
                        date: commitment.dueDate
                      })}
                    />
                  </>
                )}
              />
            ))}
          </>
        ) : (
          <div className="no-events-card">
            <p>No events or commitments scheduled for this day.</p>
          </div>
        )}
      </div>

      <div className="upcoming-section">
        <h3>Coming up</h3>
        {upcomingItems.length > 0 ? (
          <div className="upcoming-list">
            {upcomingItems.map((item) => (
              <PlannerItemCard
                key={item.id}
                kind={item.kind}
                title={item.title}
                category={item.category}
                priority={item.priority}
                dateLabel={`${formatFullDate(item.date)} · ${formatTime(item.time)}`}
                expandActionsOnClick={item.kind === 'Commitment'}
                actionsPlacement="bottom"
                actions={item.kind === 'Commitment' ? (
                  <PlannerItemAction
                    kind="commitments"
                    onClick={() => onViewInCommitments({
                      kind: 'Commitment',
                      id: item.sourceId,
                      date: item.date
                    })}
                  />
                ) : undefined}
              />
            ))}
          </div>
        ) : (
          <p className="empty-upcoming">No upcoming items.</p>
        )}
      </div>

    </aside>
  )
}

export default CalendarSidebar
