/** Select local events for an explicit, add-only copy to a Google calendar. */
import { useState } from 'react'
import { syncOnTrackEvent } from '../../services/googleCalendar'
import type { CalendarEvent } from '../../types/calendarEvent'
import { formatFullDate, formatTime } from './formatters'

type Props = {
  calendarId: string
  calendarName: string
  events: CalendarEvent[]
  onClose: (refresh: boolean) => void
}

/** Show individual local events and report the results of a sync attempt. */
function SyncGoogleEventsModal({ calendarId, calendarName, events, onClose }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set())
  const [isSyncing, setIsSyncing] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sortedEvents = [...events].sort((a, b) =>
    `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
  )

  /** Send selected events sequentially; retain failed and unsent selections for retry. */
  const syncSelected = async () => {
    setIsSyncing(true)
    setAttempted(true)
    setError(null)
    setMessage(null)
    let added = 0
    let alreadySynced = 0
    for (const event of sortedEvents.filter((item) => selectedIds.has(item.id))) {
      try {
        const result = await syncOnTrackEvent(calendarId, event)
        if (result === 'added') added++
        else alreadySynced++
        setSelectedIds((current) => {
          const next = new Set(current)
          next.delete(event.id)
          return next
        })
      } catch (syncError) {
        const detail = syncError instanceof Error ? syncError.message : 'Unknown sync error.'
        setError(`Could not sync "${event.title}": ${detail} Remaining events were not sent; you can retry.`)
        break
      }
    }
    setMessage(`Added ${added}; already synced ${alreadySynced}.`)
    setIsSyncing(false)
  }

  return (
    <div className="event-modal-backdrop">
      <div className="event-modal" role="dialog" aria-modal="true" aria-labelledby="sync-google-title">
        <div className="event-modal-header">
          <h3 id="sync-google-title">Sync to Google Calendar</h3>
          <button type="button" className="close-button" aria-label="Close sync dialog" disabled={isSyncing} onClick={() => onClose(attempted)}>
            ×
          </button>
        </div>
        <p>Choose events to add to <strong>{calendarName}</strong>. This list may include demo events.</p>
        <p>Events are added once as one-hour copies. Later changes or deletions are not synced.</p>
        {sortedEvents.length ? (
          <div className="calendar-sync-list">
            {sortedEvents.map((event) => (
              <label className="calendar-sync-option" key={event.id}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(event.id)}
                  disabled={isSyncing}
                  onChange={(change) => {
                    const checked = change.target.checked
                    setSelectedIds((current) => {
                      const next = new Set(current)
                      if (checked) next.add(event.id)
                      else next.delete(event.id)
                      return next
                    })
                  }}
                />
                <span>
                  <strong>{event.title}</strong>
                  <span>{formatFullDate(event.date)} · {formatTime(event.time)} · {event.course}</span>
                </span>
              </label>
            ))}
          </div>
        ) : <p>No On Track calendar events are available to sync.</p>}
        {message && <p role="status">{message}</p>}
        {error && <p className="event-form-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="secondary-button" disabled={isSyncing} onClick={() => onClose(attempted)}>Close</button>
          <button type="button" className="primary-button" disabled={isSyncing || selectedIds.size === 0} onClick={() => void syncSelected()}>
            {isSyncing ? 'Syncing...' : `Add selected (${selectedIds.size})`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SyncGoogleEventsModal
