/** Backend calendar storage and Google event normalization tests; no live Google account required. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readdir, rmdir, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CalendarSelectionStore } from '../src/calendarSelection.ts'
import { CalendarSyncStore, syncEventId } from '../src/calendarSync.ts'
import { isValidTimeZone, normalizeGoogleCalendarEvent } from '../src/calendarEvent.ts'

test('calendar selections persist per user, reset safely, and do not overwrite existing migrations', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ontrack-calendar-test-'))
  try {
    const store = new CalendarSelectionStore(directory)
    assert.deepEqual(await store.get('first'), { initialized: false, calendarId: null })
    await Promise.all([store.set('first', 'work'), store.set('second', 'shared')])
    assert.deepEqual(await store.set('first', 'legacy', true), { initialized: true, calendarId: 'work' })
    const restarted = new CalendarSelectionStore(directory)
    assert.equal((await restarted.get('first')).calendarId, 'work')
    assert.equal((await restarted.get('second')).calendarId, 'shared')
    await restarted.set('first', null)
    assert.deepEqual(await restarted.set('first', 'legacy', true), { initialized: true, calendarId: null })
    assert.equal((await restarted.get('second')).calendarId, 'shared')
    const file = `${createHash('sha256').update('first').digest('hex')}.json`
    await writeFile(join(directory, file), 'not json')
    await assert.rejects(restarted.get('first'))
    assert.equal((await restarted.get('second')).calendarId, 'shared')
  } finally {
    for (const name of await readdir(directory)) await unlink(join(directory, name))
    await rmdir(directory)
  }
})

test('normalizes timed events in the user time zone and preserves all-day dates', () => {
  const event = {
    id: 'event-1', summary: 'Test',
    start: { dateTime: '2025-03-09T06:30:00Z' },
    end: { dateTime: '2025-03-09T07:30:00Z' },
    extendedProperties: { private: { ontrackCourse: 'BIO', ontrackCategory: 'Exam', ontrackPriority: 'High' } }
  }
  const result = normalizeGoogleCalendarEvent(event, 'calendar-1', 'America/New_York')
  assert.deepEqual(
    { date: result.date, time: result.time, duration: result.googleDurationMinutes, course: result.course },
    { date: '2025-03-09', time: '01:30', duration: 60, course: 'BIO' }
  )
  const allDay = normalizeGoogleCalendarEvent({ id: 'day', start: { date: '2025-03-09' }, end: { date: '2025-03-12' } }, 'calendar-1', 'Pacific/Honolulu')
  assert.equal(allDay.date, '2025-03-09')
  assert.equal(allDay.time, '00:00')
  assert.equal(allDay.googleAllDay, true)
  assert.equal(allDay.googleLastDate, '2025-03-11')
  const overnight = normalizeGoogleCalendarEvent({
    id: 'overnight', start: { dateTime: '2025-03-09T23:00:00Z' },
    end: { dateTime: '2025-03-11T00:00:00Z' }
  }, 'calendar-1', 'UTC')
  assert.equal(overnight.googleAllDay, false)
  assert.equal(overnight.googleLastDate, '2025-03-10')
  const previousDay = normalizeGoogleCalendarEvent(event, 'calendar-1', 'America/Los_Angeles')
  assert.equal(previousDay.date, '2025-03-08')
  assert.equal(previousDay.time, '22:30')
  assert.equal(isValidTimeZone('Not/AZone'), false)
  assert.throws(() => normalizeGoogleCalendarEvent({ id: 'bad' }, 'calendar-1', 'UTC'), /invalid ID or start time/)
})

test('sync records serialize retries and persist separately per account and calendar', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ontrack-sync-test-'))
  try {
    const store = new CalendarSyncStore(directory)
    let calls = 0
    const create = async () => { calls++; return 'added' }
    const results = await Promise.all([
      store.sync('user', 'calendar', 42, create),
      store.sync('user', 'calendar', 42, create)
    ])
    assert.deepEqual(results, ['added', 'already-synced'])
    assert.equal(calls, 1)
    const restarted = new CalendarSyncStore(directory)
    assert.equal(await restarted.sync('user', 'calendar', 42, create), 'already-synced')
    assert.equal((await restarted.list('user', 'calendar'))[syncEventId('user', 'calendar', 42)], 42)
    assert.equal(await restarted.sync('other-user', 'calendar', 42, create), 'added')
    assert.equal(await restarted.sync('user', 'other-calendar', 42, create), 'added')
    await assert.rejects(restarted.sync('user', 'calendar', 43, async () => { throw new Error('failed') }), /failed/)
    assert.equal(await restarted.sync('user', 'calendar', 43, create), 'added')
  } finally {
    for (const name of await readdir(directory)) await unlink(join(directory, name))
    await rmdir(directory)
  }
})
