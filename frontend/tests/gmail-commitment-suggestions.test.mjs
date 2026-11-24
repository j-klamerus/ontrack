import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

test('Gmail commitments become deduplicated planner suggestions without storing message bodies', async () => {
  const values = new Map()
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  }
  globalThis.window = { dispatchEvent() {} }
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
  try {
    const {
      createGmailCommitmentSuggestions,
      getGmailCommitmentSuggestions,
      saveGmailCommitmentSuggestions
    } = await server.ssrLoadModule('/src/services/gmailCommitmentSuggestions.ts')
    const { getDashboardSuggestions } = await server.ssrLoadModule('/src/services/dashboardSuggestions.ts')
    const { confirmDashboardSuggestion } = await server.ssrLoadModule('/src/services/reviewedSuggestions.ts')
    const { getCommitments } = await server.ssrLoadModule('/src/services/commitments.ts')
    const analyses = [{
      id: 'gmail-source-1',
      threadId: 'thread-1',
      sender: 'Instructor <teacher@example.edu>',
      subject: 'Course schedule',
      receivedAt: '2026-11-23T09:00:00-05:00',
      read: false,
      body: 'Private email body should not be persisted.',
      summary: 'Private summary should not be persisted.',
      priority: 'High',
      important: true,
      spamLikelihood: 0.01,
      signals: ['Assignment'],
      commitments: [
        { title: 'Submit worksheet', dueAt: '2026-12-10', confidence: 0.9 },
        { title: 'Attend review', dueAt: '2026-12-11T13:30:00', confidence: 0.8 },
        { title: 'Read notes', dueAt: '', confidence: 0.5 }
      ]
    }]

    const suggestions = createGmailCommitmentSuggestions(analyses)

    assert.equal(suggestions.length, 2)
    assert.equal(suggestions[0].date, '2026-12-10')
    assert.equal(suggestions[0].time, '')
    assert.equal(suggestions[0].sourceEmail, 'teacher@example.edu')
    assert.equal(suggestions[1].date, '2026-12-11')
    assert.equal(suggestions[1].time, '13:30')
    assert.equal(suggestions[0].description.includes('Private'), false)

    assert.equal(saveGmailCommitmentSuggestions(analyses), 2)
    assert.equal(saveGmailCommitmentSuggestions(analyses), 0)
    assert.equal(getGmailCommitmentSuggestions().length, 2)
    const saved = values.get('ontrack-gmail-commitment-suggestions')
    assert.equal(saved.includes('Private email body'), false)
    assert.equal(saved.includes('Private summary'), false)

    const [highPrioritySuggestion] = await getDashboardSuggestions()
    assert.equal(highPrioritySuggestion.priority, 'High')
    await confirmDashboardSuggestion(highPrioritySuggestion, highPrioritySuggestion.sourceEmail ?? '')
    const persistedCommitments = await getCommitments()
    assert.equal(persistedCommitments.length, 1)
    assert.equal(persistedCommitments[0].name, 'Submit worksheet')
    assert.equal(persistedCommitments[0].priority, 'High')
  } finally {
    await server.close()
    delete globalThis.localStorage
    delete globalThis.window
  }
})
