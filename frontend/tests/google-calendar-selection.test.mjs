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
  globalThis.fetch = async (_url, init) => {
    if (fail) return new Response(JSON.stringify({ error: 'Storage unavailable' }), { status: 503 })
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

    const calendars = [
      { id: 'primary', primary: true, accessRole: 'owner' },
      { id: 'shared', primary: false, accessRole: 'reader' },
      { id: 'work', primary: false, accessRole: 'writer' }
    ]
    assert.equal(service.resolveSelectedGoogleCalendar(calendars, 'shared').id, 'shared')
    assert.equal(service.resolveSelectedGoogleCalendar(calendars, null).id, 'primary')
    assert.equal(service.resolveSelectedGoogleCalendar(calendars.slice(0, 1), 'shared'), null)
    assert.equal(service.resolveSelectedGoogleCalendar([], null), null)
  } finally {
    await server.close()
    globalThis.fetch = originalFetch
    delete globalThis.localStorage
    delete process.env.VITE_SUPABASE_URL
    delete process.env.VITE_SUPABASE_ANON_KEY
  }
})
