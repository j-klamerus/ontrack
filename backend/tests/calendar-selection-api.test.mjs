import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readdir, rmdir, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import express from 'express'
import { google } from 'googleapis'

test('calendar API authenticates, stores selections, and normalizes Google events', async () => {
  const originalDirectory = process.cwd()
  const directory = await mkdtemp(join(tmpdir(), 'ontrack-api-test-'))
  const originalFetch = globalThis.fetch
  process.chdir(directory)
  process.env.SUPABASE_URL = 'https://auth.invalid'
  process.env.SUPABASE_ANON_KEY = 'test-key'
  process.env.GOOGLE_CALENDAR_CLIENT_ID = 'test-client'
  process.env.GOOGLE_CALENDAR_CLIENT_SECRET = 'test-secret'
  process.env.GOOGLE_CALENDAR_REDIRECT_URI = 'http://localhost/callback'
  const originalOAuth = google.auth.OAuth2
  const originalCalendar = google.calendar
  google.auth.OAuth2 = class {
    generateAuthUrl(options) { return `https://accounts.google.com/?state=${options.state}` }
    async getToken() { return { tokens: { refresh_token: 'test-refresh' } } }
    setCredentials() {}
  }
  const event = {
    id: 'event-1', summary: 'Test event',
    start: { dateTime: '2025-03-09T06:30:00Z' },
    end: { dateTime: '2025-03-09T07:30:00Z' }
  }
  const listRequests = []
  google.calendar = () => ({
    events: {
      list: async (options) => {
        listRequests.push(options)
        return options.pageToken
          ? { data: { items: [{ ...event, id: 'event-2' }] } }
          : { data: { items: [event], nextPageToken: 'next-page' } }
      },
      insert: async () => ({ data: event }),
      patch: async () => ({ data: event })
    }
  })
  globalThis.fetch = async (input, init) => {
    if (String(input).startsWith('https://auth.invalid/')) {
      const token = new Headers(init?.headers).get('authorization')
      if (token !== 'Bearer user-one' && token !== 'Bearer user-two') {
        return new Response(JSON.stringify({ message: 'Invalid token' }), { status: 401 })
      }
      return Response.json({ id: token.slice(7), aud: 'authenticated', user_metadata: {}, app_metadata: {} })
    }
    return originalFetch(input, init)
  }

  const app = express()
  app.use(express.json())
  const { default: router } = await import('../src/googleCalendar.ts')
  app.use(router)
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener))
  })
  const url = `http://127.0.0.1:${server.address().port}/api/google/calendar/selection`
  const request = (token, body) => originalFetch(url, {
    method: body === undefined ? 'GET' : 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  })
  try {
    assert.equal((await request('invalid')).status, 401)
    assert.equal((await request('user-one', { calendarId: '' })).status, 400)
    assert.deepEqual(await (await request('user-one')).json(), { initialized: false, calendarId: null })
    assert.equal((await request('user-one', { calendarId: 'work' })).status, 200)
    assert.deepEqual(await (await request('user-two')).json(), { initialized: false, calendarId: null })
    assert.deepEqual(
      await (await request('user-one', { calendarId: 'old', onlyIfUnset: true })).json(),
      { initialized: true, calendarId: 'work' }
    )
    await request('user-one', { calendarId: null })
    assert.deepEqual(await (await request('user-one')).json(), { initialized: true, calendarId: null })

    const base = `http://127.0.0.1:${server.address().port}`
    const headers = { Authorization: 'Bearer user-one', 'Content-Type': 'application/json' }
    const connect = await (await originalFetch(`${base}/api/google/calendar/connect`, { headers })).json()
    const state = new URL(connect.url).searchParams.get('state')
    assert.equal((await originalFetch(`${base}/auth/google/calendar/callback?state=${state}&code=test`, { redirect: 'manual' })).status, 302)
    const list = await originalFetch(`${base}/api/google/calendar/events?calendarId=work&timeZone=America%2FNew_York&timeMin=2025-03-01T00%3A00%3A00Z&timeMax=2025-04-01T00%3A00%3A00Z`, { headers })
    const listedEvents = (await list.json()).events
    assert.deepEqual(listedEvents.map((item) => item.googleEventId), ['event-1', 'event-2'])
    assert.equal(listRequests.length, 2)
    assert.equal(listRequests[1].pageToken, 'next-page')
    assert.equal(listRequests[1].calendarId, 'work')
    assert.equal(listRequests[1].timeMin, '2025-03-01T00:00:00Z')
    assert.equal(listRequests[1].timeMax, '2025-04-01T00:00:00Z')
    assert.equal(listRequests[1].singleEvents, true)
    const listedEvent = listedEvents[0]
    assert.equal(listedEvent.googleCalendarId, 'work')
    assert.equal(listedEvent.date, '2025-03-09')
    assert.equal(listedEvent.time, '01:30')
    assert.equal((await originalFetch(`${base}/api/google/calendar/events?timeZone=Bad%2FZone`, { headers })).status, 400)
    const payload = {
      calendarId: 'work', summary: 'Test event', startDateTime: '2025-03-09T06:30:00Z',
      endDateTime: '2025-03-09T07:30:00Z', timeZone: 'America/New_York'
    }
    for (const [method, suffix] of [['POST', ''], ['PATCH', '/event-1']]) {
      const saved = await originalFetch(`${base}/api/google/calendar/events${suffix}`, {
        method, headers, body: JSON.stringify(payload)
      })
      assert.equal(saved.status, method === 'POST' ? 201 : 200)
      assert.equal((await saved.json()).event.time, '01:30')
    }
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    globalThis.fetch = originalFetch
    google.auth.OAuth2 = originalOAuth
    google.calendar = originalCalendar
    process.chdir(originalDirectory)
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_ANON_KEY
    delete process.env.GOOGLE_CALENDAR_CLIENT_ID
    delete process.env.GOOGLE_CALENDAR_CLIENT_SECRET
    delete process.env.GOOGLE_CALENDAR_REDIRECT_URI
    const selections = join(directory, '.ontrack-data', 'calendar-selections')
    for (const name of await readdir(selections)) await unlink(join(selections, name))
    await rmdir(selections)
    await rmdir(join(directory, '.ontrack-data'))
    await rmdir(directory)
  }
})
