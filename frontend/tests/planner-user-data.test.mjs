import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

test('planner loaders exclude fixtures and retain this user’s saved planner items', async () => {
  const values = new Map()
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  }
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
  try {
    const commitments = await server.ssrLoadModule('/src/services/commitments.ts')
    const calendarEvents = await server.ssrLoadModule('/src/services/calendarEvents.ts')
    const dashboardSuggestions = await server.ssrLoadModule('/src/services/dashboardSuggestions.ts')
    const reviews = await server.ssrLoadModule('/src/services/reviewedSuggestions.ts')

    values.set('ontrack-reviewed-suggestions', JSON.stringify([
      {
        suggestionId: 1,
        status: 'confirmed',
        kind: 'Commitment',
        commitment: {
          id: 1001,
          name: 'Unwanted demo commitment',
          course: 'General',
          dueDate: '2026-12-01',
          dueTime: '12:00',
          category: 'Other',
          priority: 'Medium',
          completed: false,
          sourceEmail: ''
        }
      },
      {
        suggestionId: 1000000001,
        status: 'confirmed',
        kind: 'Commitment',
        commitment: {
          id: 1002,
          name: 'My confirmed Gmail commitment',
          course: 'General',
          dueDate: '2026-12-02',
          dueTime: '13:00',
          category: 'Other',
          priority: 'High',
          completed: false,
          sourceEmail: 'me@example.edu'
        }
      }
    ]))

    assert.deepEqual(
      (await commitments.getCommitments()).map((item) => item.name),
      ['My confirmed Gmail commitment']
    )
    assert.deepEqual(await calendarEvents.getCalendarEvents(), [])
    assert.deepEqual(await dashboardSuggestions.getDashboardSuggestions(), [])
    assert.deepEqual(
      JSON.parse(values.get('ontrack-reviewed-suggestions')).map((record) => record.suggestionId),
      [1000000001]
    )

    commitments.addCommitment({
      id: 2001,
      name: 'My custom commitment',
      course: 'My course',
      dueDate: '2026-12-03',
      dueTime: '',
      category: 'Assignment',
      priority: 'Medium',
      completed: false,
      sourceEmail: ''
    })
    calendarEvents.addCalendarEvent({
      id: 2002,
      title: 'My custom event',
      course: 'My course',
      date: '2026-12-04',
      time: '10:00',
      category: 'Meeting',
      priority: 'Medium',
      description: 'A user-created event.'
    })

    assert.ok((await commitments.getCommitments()).some((item) => item.name === 'My custom commitment'))
    assert.deepEqual(
      (await calendarEvents.getCalendarEvents()).map((event) => event.title),
      ['My custom event']
    )
  } finally {
    await server.close()
    delete globalThis.localStorage
  }
})
