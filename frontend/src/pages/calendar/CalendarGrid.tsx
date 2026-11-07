import type { CalendarScheduleItem, CalendarViewMode } from './types'
import { formatFullDate, formatTime, getIsoDate } from './formatters'

type CalendarGridProps = {
  viewMode: CalendarViewMode
  monthDays: Date[]
  weekDates: Date[]
  currentMonth: Date
  selectedDateIso: string
  getItemsForDay: (day: Date) => CalendarScheduleItem[]
  onSelectDate: (day: Date) => void
}

function CalendarGrid({
  viewMode,
  monthDays,
  weekDates,
  currentMonth,
  selectedDateIso,
  getItemsForDay,
  onSelectDate
}: CalendarGridProps) {
  if (viewMode === 'month') {
    return (
      <div className="month-grid" role="grid" aria-label="Monthly calendar">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, index) => (
          <div key={dayName} className={`day-header ${index === 0 || index === 6 ? 'weekend' : ''}`}>
            {dayName}
          </div>
        ))}
        {monthDays.map((day) => {
          const isoDay = getIsoDate(day)
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
          const isSelected = isoDay === selectedDateIso
          const isToday = isoDay === getIsoDate(new Date())
          const isWeekend = day.getDay() === 0 || day.getDay() === 6
          const dayItems = getItemsForDay(day)
          const visibleItems = dayItems.slice(0, 3)
          const remainingItems = dayItems.length - visibleItems.length

          return (
            <button
              key={isoDay}
              type="button"
              className={`day-cell ${isCurrentMonth ? '' : 'muted'} ${isWeekend ? 'weekend' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
              aria-label={`${formatFullDate(isoDay)}: ${dayItems.map((item) => `${item.category} ${item.kind}, ${item.priority} priority: ${item.title}`).join(', ') || 'No events or commitments'}`}
              onClick={() => onSelectDate(day)}
            >
              <span className="day-number">{day.getDate()}</span>
              {visibleItems.length > 0 && (
                <span className="day-events">
                  {visibleItems.map((item) => (
                    <span
                      className={`day-event priority-${item.priority.toLowerCase()} ${item.kind === 'Commitment' ? 'day-commitment' : ''}`}
                      key={item.id}
                      title={`${item.kind === 'Calendar event' ? 'Calendar Event' : item.kind} (${item.category}): ${item.title}`}
                    >
                      <span
                        className={`type-marker ${item.kind === 'Commitment' ? 'type-marker-commitment' : 'type-marker-event'}`}
                        style={{ backgroundColor: item.color }}
                        aria-hidden="true"
                      />
                      <span className="day-event-title">{item.title}</span>
                    </span>
                  ))}
                  {remainingItems > 0 && <span className="day-events-more">+{remainingItems} more</span>}
                </span>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="week-view-scroll">
      <div className="week-view" role="grid" aria-label="Weekly calendar">
        {weekDates.map((day) => {
          const isoDay = getIsoDate(day)
          const isSelected = isoDay === selectedDateIso
          const isWeekend = day.getDay() === 0 || day.getDay() === 6
          const itemsForDay = getItemsForDay(day)

          return (
            <div key={isoDay} className={`week-column ${isWeekend ? 'weekend' : ''} ${isSelected ? 'selected-week' : ''}`}>
              <button type="button" className="week-day-header" onClick={() => onSelectDate(day)}>
                <span>{new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(day)}</span>
                <strong>{day.getDate()}</strong>
              </button>
              <div className="week-events">
                {itemsForDay.length > 0 ? itemsForDay.map((item) => (
                  <div key={item.id} className="mini-event">
                    <div className="mini-event-labels">
                      <span
                        className={`type-marker ${item.kind === 'Commitment' ? 'type-marker-commitment' : 'type-marker-event'}`}
                        style={{ backgroundColor: item.color }}
                        aria-hidden="true"
                      />
                      <span className="mini-category" style={{ color: item.color }}>{item.category}</span>
                      <span className={`priority-badge priority-${item.priority.toLowerCase()}`}>
                        {item.priority}
                      </span>
                    </div>
                    <span className="mini-title">{item.title}</span>
                    <span className="mini-meta">{formatTime(item.time)}</span>
                  </div>
                )) : <span className="no-events">No items</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CalendarGrid
