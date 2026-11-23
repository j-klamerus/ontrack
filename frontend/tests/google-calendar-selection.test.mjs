/** Frontend calendar selection, sync request, and date-matching tests using a mocked backend. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

test('calendar selection migrates once without overwriting a backend choice or reset', async () => {
  process.env.VITE_SUPABASE_URL = 'https://test.invalid'
  process.env.VITE_SUPABASE_ANON_KEY = 'test-key'
  const values = new Map([['ontrack-google-calendar-id:first', 'old-choice']])
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key)
  }
  const originalFetch = globalThis.fetch
  let selection = { initialized: false, calendarId: null }
  let fail = false
  const syncRequests = []
  globalThis.fetch = async (url, init) => {
    if (fail) return new Response(JSON.stringify({ error: 'Storage unavailable' }), { status: 503 })
    if (String(url).endsWith('/sync-event')) {
      syncRequests.push(JSON.parse(init.body))
      return Response.json({ result: syncRequests.length === 1 ? 'added' : 'already-synced' })
    }
    if (init?.method === 'PUT') {
      const body = JSON.parse(init.body)
      if (!body.onlyIfUnset || !selection.initialized) {
        selection = { initialized: true, calendarId: body.calendarId }
      }
    }
    return new Response(JSON.stringify(selection), { status: 200 })
  }
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
  try {
    const { getSupabaseClient } = await server.ssrLoadModule('/src/services/supabase.ts')
    getSupabaseClient().auth.getSession = async () => ({ data: { session: { access_token: 'test' } }, error: null })
    const service = await server.ssrLoadModule('/src/services/googleCalendar.ts')
    assert.equal(await service.getSelectedGoogleCalendarId('first'), 'old-choice')
    assert.equal(values.has('ontrack-google-calendar-id:first'), false)

    await service.resetSelectedGoogleCalendarId()
    values.set('ontrack-google-calendar-id:first', 'stale-choice')
    assert.equal(await service.getSelectedGoogleCalendarId('first'), null)
    assert.equal(values.has('ontrack-google-calendar-id:first'), false)

    await service.saveSelectedGoogleCalendarId('new-choice')
    assert.equal(await service.getSelectedGoogleCalendarId('first'), 'new-choice')
    values.set('ontrack-google-calendar-id:first', 'keep-on-error')
    fail = true
    await assert.rejects(service.getSelectedGoogleCalendarId('first'), /Storage unavailable/)
    assert.equal(values.get('ontrack-google-calendar-id:first'), 'keep-on-error')
    fail = false

    const localEvent = {
      id: 123, title: 'Study', course: 'BIO', date: '2025-03-10', time: '09:30',
      category: 'Other', priority: 'Medium', description: 'Notes'
    }
    assert.equal(await service.syncOnTrackEvent('shared', localEvent), 'added')
    assert.equal(await service.syncOnTrackEvent('shared', localEvent), 'already-synced')
    assert.equal(syncRequests[0].calendarId, 'shared')
    assert.equal(syncRequests[0].localEventId, 123)
    assert.equal(syncRequests[0].summary, 'Study')
    assert.equal(new Date(syncRequests[0].endDateTime) - new Date(syncRequests[0].startDateTime), 60 * 60000)
    await assert.rejects(service.syncOnTrackEvent('shared', { ...localEvent, googleEventId: 'google-id' }), /cannot be synced/)
    fail = true
    await assert.rejects(service.syncOnTrackEvent('shared', localEvent), /Storage unavailable/)
    fail = false

    const calendars = [
      { id: 'primary', primary: true, accessRole: 'owner' },
      { id: 'shared', primary: false, accessRole: 'reader' },
      { id: 'work', primary: false, accessRole: 'writer' }
    ]
    assert.equal(service.resolveSelectedGoogleCalendar(calendars, 'shared').id, 'shared')
    assert.equal(service.resolveSelectedGoogleCalendar(calendars, null).id, 'primary')
    assert.equal(service.resolveSelectedGoogleCalendar(calendars.slice(0, 1), 'shared'), null)
    assert.equal(service.resolveSelectedGoogleCalendar([], null), null)

    const { isEventOnDate } = await server.ssrLoadModule('/src/pages/calendar/formatters.ts')
    const multiDay = { date: '2025-03-09', googleLastDate: '2025-03-11' }
    assert.equal(isEventOnDate(multiDay, '2025-03-08'), false)
    assert.equal(isEventOnDate(multiDay, '2025-03-09'), true)
    assert.equal(isEventOnDate(multiDay, '2025-03-11'), true)
    assert.equal(isEventOnDate(multiDay, '2025-03-12'), false)
    assert.equal(isEventOnDate({ date: '2025-03-09' }, '2025-03-10'), false)
  } finally {
    await server.close()
    globalThis.fetch = originalFetch
    delete globalThis.localStorage
    delete process.env.VITE_SUPABASE_URL
    delete process.env.VITE_SUPABASE_ANON_KEY
  }
})
