import { PlannerItemAction, PlannerItemCard } from '../../components/PlannerItemCard'
import { formatDateTime } from './formatters'
import type { DashboardUpcomingItem } from './types'
import type { PlannerItemSelection } from '../../types/plannerItemSelection'

type UpcomingPanelProps = {
  items: DashboardUpcomingItem[]
  onViewInCalendar: (request: PlannerItemSelection) => void
  onViewInCommitments: (request: PlannerItemSelection) => void
}

function UpcomingPanel({ items, onViewInCalendar, onViewInCommitments }: UpcomingPanelProps) {
  return (
    <section className="dashboard-panel" aria-labelledby="upcoming-heading">
      <div className="dashboard-panel-header">
        <div>
          <h3 id="upcoming-heading">Coming up</h3>
          <p>Your next commitments and calendar events.</p>
        </div>
        <span className="panel-count">{items.length}</span>
      </div>

      {items.length ? (
        <div className="dashboard-item-list">
          {items.map((item) => (
            <PlannerItemCard
              key={item.id}
              kind={item.kind}
              title={item.title}
              category={item.category}
              priority={item.priority}
              dateLabel={formatDateTime(item.date, item.time)}
              expandActionsOnClick
              actionsPlacement="bottom"
              actions={(
                <>
                  <PlannerItemAction
                    kind="calendar"
                    onClick={() => onViewInCalendar({
                      kind: item.kind,
                      id: item.sourceId,
                      date: item.date
                    })}
                  />
                  {item.kind === 'Commitment' && (
                    <PlannerItemAction
                      kind="commitments"
                      onClick={() => onViewInCommitments({
                        kind: 'Commitment',
                        id: item.sourceId,
                        date: item.date
                      })}
                    />
                  )}
                </>
              )}
            />
          ))}
        </div>
      ) : (
        <p className="dashboard-empty-state">Nothing upcoming right now.</p>
      )}
    </section>
  )
}

export default UpcomingPanel
