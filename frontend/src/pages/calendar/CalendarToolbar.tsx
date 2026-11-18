/** Calendar navigation, view selection, refresh, and Google sync controls. */
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getMonthName } from './formatters'
import type { CalendarViewMode } from './types'

type CalendarToolbarProps = {
  currentMonth: Date
  viewMode: CalendarViewMode
  onMonthChange: (change: number) => void
  onJumpToToday: () => void
  onViewModeChange: (mode: CalendarViewMode) => void
  googleCalendarName: string | null
  isGoogleCalendarLoading: boolean
  onRefreshGoogleCalendar: () => void
  onSyncGoogleCalendar: () => void
}

/** Render controls while leaving navigation and connection state to the page. */
function CalendarToolbar({
  currentMonth,
  viewMode,
  onMonthChange,
  onJumpToToday,
  onViewModeChange,
  googleCalendarName,
  isGoogleCalendarLoading,
  onRefreshGoogleCalendar,
  onSyncGoogleCalendar
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
        <button
          type="button"
          className="today-button"
          onClick={onSyncGoogleCalendar}
          disabled={isGoogleCalendarLoading}
          title="Choose On Track events to add to Google Calendar"
        >
          Sync to Google
        </button>
        <button
          type="button"
          className="today-button"
          onClick={onRefreshGoogleCalendar}
          disabled={isGoogleCalendarLoading}
          title={googleCalendarName ? `Refresh ${googleCalendarName}` : 'Check Google Calendar connection'}
        >
          {isGoogleCalendarLoading ? 'Refreshing...' : 'Refresh Google Calendar'}
        </button>
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
