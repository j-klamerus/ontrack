/**
 * Google Calendar OAuth and API routes. Supabase identifies the On Track user;
 * Google credentials stay in this backend process, while selections and sync records
 * are stored locally under .ontrack-data.
 */
import { randomBytes } from 'node:crypto'
import express from 'express'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { resolve } from 'node:path'
import { CalendarSelectionStore } from './calendarSelection.js'
import { CalendarSyncStore, type LocalEventId } from './calendarSync.js'
import { isValidTimeZone, normalizeGoogleCalendarEvent } from './calendarEvent.js'

const router = express.Router()
const frontendOrigin = process.env.FRONTEND_ORIGIN?.trim() || 'http://localhost:5173'
const supabaseUrl = process.env.SUPABASE_URL?.trim()
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim()
const supabaseAuth = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null

const oauthStateLifetimeMs = 10 * 60 * 1000
const pendingOAuthStates = new Map<string, { userId: string; createdAt: number }>()
const connectedUsers = new Map<string, ReturnType<typeof createCalendarOAuthClient>>()
const calendarSelections = new CalendarSelectionStore(resolve('.ontrack-data', 'calendar-selections'))
const calendarSync = new CalendarSyncStore(resolve('.ontrack-data', 'calendar-sync'))

type CalendarOAuthConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
}

const calendarOAuthSetupError =
  'Google Calendar setup is incomplete. Set GOOGLE_CALENDAR_REDIRECT_URI in backend/.env and register it as an authorized redirect URI in Google Cloud. The Gmail OAuth client ID and secret are reused unless Calendar-specific credentials are set.'

/** Reuse the Gmail OAuth client by default; Calendar needs its own callback URI. */
function getCalendarOAuthConfig(): CalendarOAuthConfig | null {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim() || process.env.GOOGLE_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim() || process.env.GOOGLE_CLIENT_SECRET?.trim()
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim()

  if (!clientId || !clientSecret || !redirectUri) {
    return null
  }

  return { clientId, clientSecret, redirectUri }
}

/** Build a Google OAuth client from backend-only configuration. */
function createCalendarOAuthClient(config: CalendarOAuthConfig) {
  return new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri)
}

/** Validate the bearer token with Supabase; write an HTTP error when authentication fails. */
async function getAuthenticatedUserId(
  request: express.Request,
  response: express.Response
): Promise<string | null> {
  if (!supabaseAuth) {
    response.status(503).json({
      error: 'Backend Supabase auth is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in backend/.env.'
    })
    return null
  }

  const authorization = request.header('authorization')
  const match = authorization?.match(/^Bearer\s+(.+)$/i)
  if (!match?.[1]) {
    response.status(401).json({ error: 'Sign in to On Track before connecting Google Calendar.' })
    return null
  }

  const { data, error } = await supabaseAuth.auth.getUser(match[1])
  if (error || !data.user) {
    response.status(401).json({ error: 'Your On Track session is invalid or expired. Please sign in again.' })
    return null
  }

  return data.user.id
}

/** Retrieve the user's in-memory Google connection or report that reconnection is needed. */
function getConnectedUserClient(userId: string, response: express.Response) {
  const client = connectedUsers.get(userId)
  if (!client) {
    response.status(409).json({ error: 'Connect Google Calendar before using calendar data.' })
    return null
  }

  return client
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/** Validate the common event payload used by create, update, and add-only sync routes. */
function parseEventInput(value: unknown) {
  if (!isRecord(value)) {
    return null
  }

  const summary = readNonEmptyString(value.summary)
  const startDateTime = readNonEmptyString(value.startDateTime)
  const endDateTime = readNonEmptyString(value.endDateTime)
  const timeZone = readNonEmptyString(value.timeZone)
  const description = typeof value.description === 'string' ? value.description : ''
  const course = typeof value.course === 'string' ? value.course : ''
  const category = typeof value.category === 'string' ? value.category : 'Other'
  const priority = value.priority === 'High' || value.priority === 'Medium' || value.priority === 'Low'
    ? value.priority
    : 'Medium'

  if (
    !summary ||
    !startDateTime ||
    !endDateTime ||
    !timeZone || !isValidTimeZone(timeZone) ||
    Number.isNaN(Date.parse(startDateTime)) ||
    Number.isNaN(Date.parse(endDateTime)) ||
    Date.parse(endDateTime) <= Date.parse(startDateTime)
  ) {
    return null
  }

  return { summary, description, course, category, priority, startDateTime, endDateTime, timeZone }
}

/** Map On Track fields to Google event fields and private extended properties. */
function toGoogleEventBody(event: NonNullable<ReturnType<typeof parseEventInput>>) {
  return {
    summary: event.summary,
    description: event.description,
    start: { dateTime: event.startDateTime, timeZone: event.timeZone },
    end: { dateTime: event.endDateTime, timeZone: event.timeZone },
    extendedProperties: {
      private: {
        ontrackCourse: event.course,
        ontrackCategory: event.category,
        ontrackPriority: event.priority
      }
    }
  }
}

/** Start a separate Google Calendar OAuth flow tied to the authenticated On Track user. */
router.get('/api/google/calendar/connect', async (request, response) => {
  const userId = await getAuthenticatedUserId(request, response)
  if (!userId) {
    return
  }

  const oauthConfig = getCalendarOAuthConfig()
  if (!oauthConfig) {
    response.status(503).json({ error: calendarOAuthSetupError })
    return
  }

  for (const [state, record] of pendingOAuthStates) {
    if (Date.now() - record.createdAt > oauthStateLifetimeMs) {
      pendingOAuthStates.delete(state)
    }
  }

  const state = randomBytes(32).toString('hex')
  pendingOAuthStates.set(state, { userId, createdAt: Date.now() })

  const oauthClient = createCalendarOAuthClient(oauthConfig)
  const url = oauthClient.generateAuthUrl({
    access_type: 'offline',
    include_granted_scopes: true,
    prompt: 'select_account consent',
    scope: [
      'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
      'https://www.googleapis.com/auth/calendar.events'
    ],
    state
  })

  response.json({ url })
})

/** Consume a short-lived, single-use state and keep the resulting Google client in memory. */
router.get('/auth/google/calendar/callback', async (request, response) => {
  const state = readNonEmptyString(request.query.state)
  const stateRecord = state ? pendingOAuthStates.get(state) : undefined
  if (!state || !stateRecord || Date.now() - stateRecord.createdAt > oauthStateLifetimeMs) {
    if (state) {
      pendingOAuthStates.delete(state)
    }
    response.redirect(`${frontendOrigin}/?calendar_connection=error`)
    return
  }
  pendingOAuthStates.delete(state)

  if (readNonEmptyString(request.query.error)) {
    response.redirect(`${frontendOrigin}/?calendar_connection=error`)
    return
  }

  const code = readNonEmptyString(request.query.code)
  if (!code) {
    response.redirect(`${frontendOrigin}/?calendar_connection=error`)
    return
  }

  const oauthConfig = getCalendarOAuthConfig()
  if (!oauthConfig) {
    response.redirect(`${frontendOrigin}/?calendar_connection=error`)
    return
  }

  const oauthClient = createCalendarOAuthClient(oauthConfig)
  const { tokens } = await oauthClient.getToken(code)
  if (!tokens.refresh_token) {
    response.redirect(`${frontendOrigin}/?calendar_connection=error`)
    return
  }

  oauthClient.setCredentials(tokens)
  connectedUsers.set(stateRecord.userId, oauthClient)
  response.redirect(`${frontendOrigin}/?calendar_connection=connected`)
})

/** Report whether this backend process has a Google client for the authenticated user. */
router.get('/api/google/calendar/status', async (request, response) => {
  const userId = await getAuthenticatedUserId(request, response)
  if (!userId) {
    return
  }

  response.json({ connected: connectedUsers.has(userId) })
})

/** Remove the in-memory connection without revoking access at Google. */
router.delete('/api/google/calendar', async (request, response) => {
  const userId = await getAuthenticatedUserId(request, response)
  if (!userId) {
    return
  }

  connectedUsers.delete(userId)
  response.status(204).end()
})

/** Read the stored selection, distinguishing an unset value from an explicit reset. */
router.get('/api/google/calendar/selection', async (request, response) => {
  const userId = await getAuthenticatedUserId(request, response)
  if (!userId) return
  response.json(await calendarSelections.get(userId))
})

/** Persist a selection or reset; onlyIfUnset supports safe legacy browser migration. */
router.put('/api/google/calendar/selection', async (request, response) => {
  const userId = await getAuthenticatedUserId(request, response)
  if (!userId) return
  const body: unknown = request.body
  if (
    !isRecord(body) ||
    (body.calendarId !== null &&
      (typeof body.calendarId !== 'string' || !body.calendarId.trim() || body.calendarId.length > 2048)) ||
    (body.onlyIfUnset !== undefined && typeof body.onlyIfUnset !== 'boolean')
  ) {
    response.status(400).json({ error: 'A valid calendar selection is required.' })
    return
  }
  response.json(await calendarSelections.set(userId, body.calendarId, body.onlyIfUnset === true))
})

/** List every accessible Google calendar, including read-only calendars and all pages. */
router.get('/api/google/calendar/calendars', async (request, response) => {
  const userId = await getAuthenticatedUserId(request, response)
  if (!userId) {
    return
  }

  const oauthClient = getConnectedUserClient(userId, response)
  if (!oauthClient) {
    return
  }

  const calendarList = google.calendar({ version: 'v3', auth: oauthClient }).calendarList
  const calendars: { id: string; summary: string; primary: boolean; accessRole: string; timeZone: string | null }[] = []
  let pageToken: string | undefined
  do {
    const { data } = await calendarList.list({
      maxResults: 250,
      ...(pageToken ? { pageToken } : {})
    })
    for (const calendar of data.items ?? []) {
      if (typeof calendar.id === 'string') {
        calendars.push({
          id: calendar.id,
          summary: calendar.summary || calendar.id,
          primary: calendar.primary ?? false,
          accessRole: calendar.accessRole ?? 'reader',
          timeZone: calendar.timeZone ?? null
        })
      }
    }
    pageToken = data.nextPageToken ?? undefined
  } while (pageToken)

  response.json({ calendars })
})

/** Fetch and normalize all pages of expanded event instances for the requested range. */
router.get('/api/google/calendar/events', async (request, response) => {
  const userId = await getAuthenticatedUserId(request, response)
  if (!userId) {
    return
  }

  const oauthClient = getConnectedUserClient(userId, response)
  if (!oauthClient) {
    return
  }

  const calendarId = readNonEmptyString(request.query.calendarId) || 'primary'
  const timeMin = readNonEmptyString(request.query.timeMin)
  const timeMax = readNonEmptyString(request.query.timeMax)
  const timeZone = readNonEmptyString(request.query.timeZone)

  if (
    !timeZone || !isValidTimeZone(timeZone) ||
    (timeMin && Number.isNaN(Date.parse(timeMin))) ||
    (timeMax && Number.isNaN(Date.parse(timeMax))) ||
    (timeMin && timeMax && Date.parse(timeMax) <= Date.parse(timeMin))
  ) {
    response.status(400).json({ error: 'The event date range or time zone is invalid.' })
    return
  }

  const googleEvents = google.calendar({ version: 'v3', auth: oauthClient }).events
  const syncEntries = await calendarSync.list(userId, calendarId)
  const events: (ReturnType<typeof normalizeGoogleCalendarEvent> & { googleSourceId?: LocalEventId })[] = []
  let pageToken: string | undefined
  do {
    const { data } = await googleEvents.list({
      calendarId,
      maxResults: 2500,
      orderBy: 'startTime',
      singleEvents: true,
      ...(timeMin ? { timeMin } : {}),
      ...(timeMax ? { timeMax } : {}),
      ...(pageToken ? { pageToken } : {})
    })
    const displayableEvents = (data.items ?? []).filter((event) => event.eventType !== 'workingLocation')
    events.push(...displayableEvents.map((event) => ({
      ...normalizeGoogleCalendarEvent(event, calendarId, timeZone),
      ...(event.id && Object.hasOwn(syncEntries, event.id) ? { googleSourceId: syncEntries[event.id] } : {})
    })))
    pageToken = data.nextPageToken ?? undefined
  } while (pageToken)

  response.json({ events })
})

/** Add one local event once per user/calendar without updating existing Google copies. */
router.post('/api/google/calendar/sync-event', async (request, response) => {
  const userId = await getAuthenticatedUserId(request, response)
  if (!userId) return
  const oauthClient = getConnectedUserClient(userId, response)
  if (!oauthClient) return

  const body: unknown = request.body
  const calendarId = isRecord(body) ? readNonEmptyString(body.calendarId) : null
  const localEventId = isRecord(body) ? body.localEventId : undefined
  const event = parseEventInput(body)
  if (
    !calendarId || calendarId === 'primary' || calendarId.length > 2048 || !event ||
    !((typeof localEventId === 'string' && localEventId.length > 0 && localEventId.length <= 256) ||
      (typeof localEventId === 'number' && Number.isSafeInteger(localEventId)))
  ) {
    response.status(400).json({ error: 'A valid calendar, On Track event ID, and event details are required.' })
    return
  }

  const googleEvents = google.calendar({ version: 'v3', auth: oauthClient }).events
  const result = await calendarSync.sync(userId, calendarId, localEventId, async (id) => {
    const eventBody = toGoogleEventBody(event)
    try {
      await googleEvents.insert({
        calendarId,
        requestBody: {
          ...eventBody,
          id,
          extendedProperties: {
            private: { ...eventBody.extendedProperties.private, ontrackSyncId: id }
          }
        }
      })
      return 'added'
    } catch (error) {
      if (!isRecord(error) || (error.code !== 409 && error.status !== 409)) throw error
      // An earlier insert may have succeeded despite a lost response or failed local write.
      const { data } = await googleEvents.get({ calendarId, eventId: id })
      if (data.id !== id || data.extendedProperties?.private?.ontrackSyncId !== id) {
        throw new Error('Google Calendar returned a conflicting event ID that cannot be verified.')
      }
      return 'already-synced'
    }
  })
  response.json({ result })
})

/** Create a new timed event directly on the requested Google calendar. */
router.post('/api/google/calendar/events', async (request, response) => {
  const userId = await getAuthenticatedUserId(request, response)
  if (!userId) {
    return
  }

  const oauthClient = getConnectedUserClient(userId, response)
  if (!oauthClient) {
    return
  }

  const calendarId = readNonEmptyString(request.body?.calendarId) || 'primary'
  const event = parseEventInput(request.body)
  if (!event) {
    response.status(400).json({ error: 'Enter an event title, valid start and end times, and a time zone.' })
    return
  }

  const { data } = await google.calendar({ version: 'v3', auth: oauthClient })
    .events.insert({
      calendarId,
      requestBody: toGoogleEventBody(event)
    })

  response.status(201).json({ event: normalizeGoogleCalendarEvent(data, calendarId, event.timeZone) })
})

/** Update a Google event and retain its local sync association in the response. */
router.patch('/api/google/calendar/events/:eventId', async (request, response) => {
  const userId = await getAuthenticatedUserId(request, response)
  if (!userId) {
    return
  }

  const oauthClient = getConnectedUserClient(userId, response)
  if (!oauthClient) {
    return
  }

  const eventId = readNonEmptyString(request.params.eventId)
  const calendarId = readNonEmptyString(request.body?.calendarId) || 'primary'
  const event = parseEventInput(request.body)
  if (!eventId || !event) {
    response.status(400).json({ error: 'Enter an event title, valid start and end times, and a time zone.' })
    return
  }

  const { data } = await google.calendar({ version: 'v3', auth: oauthClient })
    .events.patch({
      calendarId,
      eventId,
      requestBody: toGoogleEventBody(event)
    })

  const syncEntries = await calendarSync.list(userId, calendarId)
  response.json({
    event: {
      ...normalizeGoogleCalendarEvent(data, calendarId, event.timeZone),
      ...(data.id && Object.hasOwn(syncEntries, data.id) ? { googleSourceId: syncEntries[data.id] } : {})
    }
  })
})

/** Delete a Google event; add-only sync records are intentionally retained. */
router.delete('/api/google/calendar/events/:eventId', async (request, response) => {
  const userId = await getAuthenticatedUserId(request, response)
  if (!userId) {
    return
  }

  const oauthClient = getConnectedUserClient(userId, response)
  if (!oauthClient) {
    return
  }

  const eventId = readNonEmptyString(request.params.eventId)
  const calendarId = readNonEmptyString(request.query.calendarId) || 'primary'
  if (!eventId) {
    response.status(400).json({ error: 'An event ID is required.' })
    return
  }

  await google.calendar({ version: 'v3', auth: oauthClient })
    .events.delete({ calendarId, eventId })
  response.status(204).end()
})

export default router
