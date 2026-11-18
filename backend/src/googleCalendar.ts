import { randomBytes } from 'node:crypto'
import express from 'express'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { resolve } from 'node:path'
import { CalendarSelectionStore } from './calendarSelection.js'
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

function createCalendarOAuthClient() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim()
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim()

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google Calendar OAuth is not configured in backend/.env.')
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

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

router.get('/api/google/calendar/connect', async (request, response) => {
  const userId = await getAuthenticatedUserId(request, response)
  if (!userId) {
    return
  }

  for (const [state, record] of pendingOAuthStates) {
    if (Date.now() - record.createdAt > oauthStateLifetimeMs) {
      pendingOAuthStates.delete(state)
    }
  }

  const state = randomBytes(32).toString('hex')
  pendingOAuthStates.set(state, { userId, createdAt: Date.now() })

  const oauthClient = createCalendarOAuthClient()
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

  const oauthClient = createCalendarOAuthClient()
  const { tokens } = await oauthClient.getToken(code)
  if (!tokens.refresh_token) {
    response.redirect(`${frontendOrigin}/?calendar_connection=error`)
    return
  }

  oauthClient.setCredentials(tokens)
  connectedUsers.set(stateRecord.userId, oauthClient)
  response.redirect(`${frontendOrigin}/?calendar_connection=connected`)
})

router.get('/api/google/calendar/status', async (request, response) => {
  const userId = await getAuthenticatedUserId(request, response)
  if (!userId) {
    return
  }

  response.json({ connected: connectedUsers.has(userId) })
})

router.delete('/api/google/calendar', async (request, response) => {
  const userId = await getAuthenticatedUserId(request, response)
  if (!userId) {
    return
  }

  connectedUsers.delete(userId)
  response.status(204).end()
})

router.get('/api/google/calendar/selection', async (request, response) => {
  const userId = await getAuthenticatedUserId(request, response)
  if (!userId) return
  response.json(await calendarSelections.get(userId))
})

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
  const events: ReturnType<typeof normalizeGoogleCalendarEvent>[] = []
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
    events.push(...(data.items ?? []).map((event) => normalizeGoogleCalendarEvent(event, calendarId, timeZone)))
    pageToken = data.nextPageToken ?? undefined
  } while (pageToken)

  response.json({ events })
})

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

  response.json({ event: normalizeGoogleCalendarEvent(data, calendarId, event.timeZone) })
})

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
