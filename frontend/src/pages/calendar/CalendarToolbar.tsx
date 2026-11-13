import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getMonthName } from './formatters'
import type { CalendarViewMode } from './types'

type CalendarToolbarProps = {
  currentMonth: Date
  viewMode: CalendarViewMode
  onMonthChange: (change: number) => void
  onMonthSelect: (year: number, month: number) => void
  onJumpToToday: () => void
  onViewModeChange: (mode: CalendarViewMode) => void
}

function CalendarToolbar({
  currentMonth,
  viewMode,
  onMonthChange,
  onMonthSelect,
  onJumpToToday,
  onViewModeChange
}: CalendarToolbarProps) {
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false)
  const [selectedYear, setSelectedYear] = useState(currentMonth.getFullYear())
  const monthPickerRef = useRef<HTMLDivElement>(null)
  const monthPickerTriggerRef = useRef<HTMLButtonElement>(null)
  const yearRangeStart = Math.min(new Date().getFullYear() - 100, currentMonth.getFullYear())
  const yearRangeEnd = Math.max(new Date().getFullYear() + 50, currentMonth.getFullYear())
  const months = Array.from({ length: 12 }, (_, month) =>
    new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(2024, month, 1))
  )

  useEffect(() => {
    if (!isMonthPickerOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !monthPickerRef.current?.contains(event.target)) {
        setIsMonthPickerOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMonthPickerOpen(false)
        monthPickerTriggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMonthPickerOpen])

  const openMonthPicker = () => {
    setSelectedYear(currentMonth.getFullYear())
    setIsMonthPickerOpen((isOpen) => !isOpen)
  }

  return (
    <div className="calendar-toolbar">
      <div className="month-controls">
        <button type="button" aria-label="Previous month" onClick={() => onMonthChange(-1)}>
          <ChevronLeft size={18} />
        </button>
        <div className="month-picker" ref={monthPickerRef}>
          <h3 className="month-picker-heading">
            <button
              ref={monthPickerTriggerRef}
              type="button"
              className="month-picker-trigger"
              aria-label={`Choose month and year, currently ${getMonthName(currentMonth)}`}
              aria-expanded={isMonthPickerOpen}
              aria-controls="calendar-month-picker"
              onClick={openMonthPicker}
            >
              {getMonthName(currentMonth)}
            </button>
          </h3>
          {isMonthPickerOpen && (
            <div className="month-picker-menu" id="calendar-month-picker" role="group" aria-label="Choose month and year">
              <label className="month-picker-year">
                <span>Year</span>
                <select
                  value={selectedYear}
                  onChange={(event) => setSelectedYear(Number(event.target.value))}
                  aria-label="Year"
                >
                  {Array.from(
                    { length: yearRangeEnd - yearRangeStart + 1 },
                    (_, index) => yearRangeStart + index
                  ).map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </label>
              <div className="month-picker-months" role="group" aria-label="Month">
                {months.map((monthName, month) => (
                  <button
                    key={monthName}
                    type="button"
                    className={
                      currentMonth.getFullYear() === selectedYear && currentMonth.getMonth() === month
                        ? 'active'
                        : ''
                    }
                    aria-pressed={currentMonth.getFullYear() === selectedYear && currentMonth.getMonth() === month}
                    onClick={() => {
                      onMonthSelect(selectedYear, month)
                      setIsMonthPickerOpen(false)
                    }}
                  >
                    {monthName}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
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
