import { useEffect, useState } from 'react'
import {
  canWriteGoogleCalendar,
  disconnectGoogleCalendar,
  getGoogleCalendarStatus,
  getGoogleCalendars,
  getSelectedGoogleCalendarId,
  saveSelectedGoogleCalendarId,
  startGoogleCalendarConnection,
  type GoogleCalendarInfo
} from '../../services/googleCalendar'

function GoogleCalendarConnectionCard() {
  const [isLoading, setIsLoading] = useState(true)
  const [isBusy, setIsBusy] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [calendars, setCalendars] = useState<GoogleCalendarInfo[]>([])
  const [selectedCalendarId, setSelectedCalendarId] = useState('')
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
          const savedCalendarId = getSelectedGoogleCalendarId()
          const selectedCalendar = loadedCalendars.find(
            (calendar) => calendar.id === savedCalendarId && canWriteGoogleCalendar(calendar)
          )
          const defaultCalendar = loadedCalendars.find((calendar) => calendar.primary && canWriteGoogleCalendar(calendar))
            ?? loadedCalendars.find(canWriteGoogleCalendar)
            ?? loadedCalendars.find((calendar) => calendar.primary)
            ?? loadedCalendars[0]
          setSelectedCalendarId(selectedCalendar?.id ?? defaultCalendar?.id ?? '')
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

  const handleDisconnect = async () => {
    setError(null)
    setMessage(null)
    setIsBusy(true)
    try {
      await disconnectGoogleCalendar()
      setIsConnected(false)
      setCalendars([])
      setSelectedCalendarId('')
      setMessage('Google Calendar disconnected from this running backend.')
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : 'Unable to disconnect Google Calendar.')
    } finally {
      setIsBusy(false)
    }
  }

  const handleCalendarChange = (calendarId: string) => {
    setSelectedCalendarId(calendarId)
    try {
      saveSelectedGoogleCalendarId(calendarId)
      setError(null)
    } catch {
      setError('Unable to save the selected calendar in this browser.')
    }
  }

  return (
    <div className="settings-card">
      <div className="card-header-row">
        <h3>Google Calendar Connection</h3>
        <span className={`status-pill ${isConnected ? 'connected' : 'disconnected'}`}>
          {isLoading ? 'Checking...' : isConnected ? 'Connected' : 'Not connected'}
        </span>
      </div>
      <p className="field-note">
        Connect a Google account to authorize On Track to view and manage events on calendars you can edit.
      </p>
      <p className="field-note">
        Local prototype: the backend keeps tokens in memory, so reconnect after restarting it. Disconnecting here
        removes the local connection; revoke Google access separately in your Google Account if needed.
      </p>

      {isConnected && calendars.length > 0 && (
        <label className="select-field" htmlFor="google-calendar-selection">
          Calendar for new events
          <select
            id="google-calendar-selection"
            value={selectedCalendarId}
            onChange={(event) => handleCalendarChange(event.target.value)}
          >
            {calendars.map((calendar) => (
              <option key={calendar.id} value={calendar.id} disabled={!canWriteGoogleCalendar(calendar)}>
                {calendar.summary}{calendar.primary ? ' (primary)' : ''}
                {!canWriteGoogleCalendar(calendar) ? ' (read only)' : ''}
              </option>
            ))}
          </select>
        </label>
      )}

      {message && <p className="save-banner" role="status">{message}</p>}
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
