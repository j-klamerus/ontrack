/** Settings UI for connecting Google Calendar and staging the On Track calendar choice. */
import { useEffect, useState } from 'react'
import {
  canWriteGoogleCalendar,
  disconnectGoogleCalendar,
  getGoogleCalendarStatus,
  getGoogleCalendars,
  resolveSelectedGoogleCalendar,
  startGoogleCalendarConnection,
  type GoogleCalendarInfo
} from '../../services/googleCalendar'

type GoogleCalendarConnectionCardProps = {
  selectedCalendarId: string | null
  selectionLoading: boolean
  selectionError: string | null
  onCalendarChange: (calendarId: string) => void
}

/** Load the connection and calendars; the parent persists a changed selection on save. */
function GoogleCalendarConnectionCard({ selectedCalendarId, selectionLoading, selectionError, onCalendarChange }: GoogleCalendarConnectionCardProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isBusy, setIsBusy] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [calendars, setCalendars] = useState<GoogleCalendarInfo[]>([])
  const [message, setMessage] = useState<string | null>(() => {
    const connectionResult = new URLSearchParams(window.location.search).get('calendar_connection')
    if (connectionResult === 'connected') {
      return 'Google Calendar connected.'
    }
    return connectionResult ? 'Google Calendar could not be connected. Please try again.' : null
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('calendar_connection')) {
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    let isMounted = true
    const loadConnection = async () => {
      try {
        const connected = await getGoogleCalendarStatus()
        if (!isMounted) {
          return
        }

        setIsConnected(connected)
        if (connected) {
          const loadedCalendars = await getGoogleCalendars()
          if (!isMounted) {
            return
          }

          setCalendars(loadedCalendars)
          if (loadedCalendars.length === 0) {
            setError('No Google calendars are available for this account.')
          }
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load Google Calendar status.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadConnection()
    return () => {
      isMounted = false
    }
  }, [])

  const handleConnect = async () => {
    setError(null)
    setMessage(null)
    setIsBusy(true)
    try {
      const authorizationUrl = await startGoogleCalendarConnection()
      window.location.assign(authorizationUrl)
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'Unable to start Google Calendar connection.')
      setIsBusy(false)
    }
  }

  /** Disconnect this backend process without revoking the Google account grant. */
  const handleDisconnect = async () => {
    setError(null)
    setMessage(null)
    setIsBusy(true)
    try {
      await disconnectGoogleCalendar()
      setIsConnected(false)
      setCalendars([])
      setMessage('Google Calendar disconnected from this running backend.')
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : 'Unable to disconnect Google Calendar.')
    } finally {
      setIsBusy(false)
    }
  }

  const handleCalendarChange = (calendarId: string) => {
    onCalendarChange(calendarId)
    setError(null)
    setMessage(null)
  }

  const resolvedCalendar = resolveSelectedGoogleCalendar(calendars, selectedCalendarId)

  return (
    <div className="settings-card">
      <div className="card-header-row">
        <h3>Google Calendar Connection</h3>
        <span className={`status-pill ${isConnected ? 'connected' : 'disconnected'}`}>
          {isLoading ? 'Checking...' : isConnected ? 'Connected' : 'Not connected'}
        </span>
      </div>
      <p className="field-note">
        Connect a Google account to authorize On Track to view and manage your calendar events.
      </p>
      <p className="field-note">
        Local prototype: the backend keeps tokens in memory, so reconnect after restarting it. Disconnecting here
        removes the local connection; revoke Google access separately in your Google Account if needed.
      </p>

      {isConnected && calendars.length > 0 && (
        <label className="select-field" htmlFor="google-calendar-selection">
          Primary calendar for On Track
          <select
            id="google-calendar-selection"
            value={resolvedCalendar?.id ?? ''}
            disabled={selectionLoading || !!selectionError}
            onChange={(event) => handleCalendarChange(event.target.value)}
          >
            {!resolvedCalendar && <option value="" disabled>Choose a calendar</option>}
            {calendars.map((calendar) => (
              <option key={calendar.id} value={calendar.id}>
                {calendar.summary}{calendar.primary ? ' (Google primary)' : ''}
                {!canWriteGoogleCalendar(calendar) ? ' (read only)' : ''}
              </option>
            ))}
          </select>
        </label>
      )}

      {isConnected && !selectionLoading && !selectionError && resolvedCalendar && (
        <p className="field-note">
          On Track displays this calendar and adds new events to it. Read-only calendars cannot receive new events.
          This choice does not change your primary calendar in Google.
        </p>
      )}

      {isConnected && !selectionLoading && !selectionError && selectedCalendarId && !resolvedCalendar && calendars.length > 0 && (
        <p className="category-error" role="alert">
          Your selected calendar is no longer available. Choose another calendar.
        </p>
      )}

      {message && <p className="save-banner" role="status">{message}</p>}
      {selectionLoading && <p className="field-note" role="status">Loading your calendar choice...</p>}
      {selectionError && <p className="category-error" role="alert">{selectionError}</p>}
      {error && <p className="category-error" role="alert">{error}</p>}

      {isConnected ? (
        <button
          type="button"
          className="secondary-button"
          onClick={handleDisconnect}
          disabled={isLoading || isBusy}
        >
          {isBusy ? 'Please wait...' : 'Disconnect Google Calendar'}
        </button>
      ) : (
        <button
          type="button"
          className="secondary-button"
          onClick={handleConnect}
          disabled={isLoading || isBusy}
        >
          {isBusy ? 'Please wait...' : 'Connect Google Calendar'}
        </button>
      )}
    </div>
  )
}

export default GoogleCalendarConnectionCard
