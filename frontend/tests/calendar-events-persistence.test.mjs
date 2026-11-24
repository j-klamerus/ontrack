import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

test('local calendar events are saved, edited, and deleted through account storage', async () => {
  const values = new Map()
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  }
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
  try {
    const calendarEvents = await server.ssrLoadModule('/src/services/calendarEvents.ts')
    const event = {
      id: 98321,
      title: 'Study group',
      course: 'Biology',
      date: '2026-12-10',
      time: '15:00',
      category: 'Other',
      priority: 'Medium',
      description: 'Meet in the library'
    }

    calendarEvents.addCalendarEvent(event)
    assert.equal((await calendarEvents.getCalendarEvents()).find((item) => item.id === event.id).title, 'Study group')

    calendarEvents.updateCalendarEvent({ ...event, title: 'Updated study group' })
    assert.equal(
      (await calendarEvents.getCalendarEvents()).find((item) => item.id === event.id).title,
      'Updated study group'
    )

    calendarEvents.deleteCalendarEvent(event.id)
    assert.equal((await calendarEvents.getCalendarEvents()).some((item) => item.id === event.id), false)
  } finally {
    await server.close()
    delete globalThis.localStorage
  }
})
