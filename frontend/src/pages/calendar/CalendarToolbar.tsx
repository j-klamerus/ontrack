import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getMonthName } from './formatters'
import type { CalendarViewMode } from './types'

type CalendarToolbarProps = {
  currentMonth: Date
  viewMode: CalendarViewMode
  onMonthChange: (change: number) => void
  onJumpToToday: () => void
  onViewModeChange: (mode: CalendarViewMode) => void
}

function CalendarToolbar({
  currentMonth,
  viewMode,
  onMonthChange,
  onJumpToToday,
  onViewModeChange
}: CalendarToolbarProps) {
  return (
    <div className="calendar-toolbar">
      <div className="month-controls">
        <button type="button" aria-label="Previous month" onClick={() => onMonthChange(-1)}>
          <ChevronLeft size={18} />
        </button>
        <h3>{getMonthName(currentMonth)}</h3>
        <button type="button" aria-label="Next month" onClick={() => onMonthChange(1)}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="toolbar-actions">
        <button type="button" className="today-button" onClick={onJumpToToday}>
          Today
        </button>
        <div className="view-toggle">
          <button
            type="button"
            className={viewMode === 'month' ? 'active' : ''}
            onClick={() => onViewModeChange('month')}
          >
            Month
          </button>
          <button
            type="button"
            className={viewMode === 'week' ? 'active' : ''}
            onClick={() => onViewModeChange('week')}
          >
            Week
          </button>
        </div>
      </div>
    </div>
  )
}

export default CalendarToolbar
