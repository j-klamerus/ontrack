import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

test('category removal preserves local commitments and suggestion records', async () => {
  const values = new Map()
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  }
  globalThis.window = { dispatchEvent() {} }
  globalThis.CustomEvent = class CustomEvent {}
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
  try {
    const categories = await server.ssrLoadModule('/src/constants/eventCategories.ts')
    const commitments = await server.ssrLoadModule('/src/services/commitments.ts')
    const reviews = await server.ssrLoadModule('/src/services/reviewedSuggestions.ts')
    const defaults = categories.getEventCategoryDefinitions()
    const project = categories.createCustomEventCategory(' Research Project ', '#123456', defaults)
    assert.equal(values.has('ontrack-event-categories'), false)
    assert.throws(() => categories.createCustomEventCategory('assignment', '#123456', defaults), /already exists/)
    categories.saveCustomEventCategories([project])

    const commitment = {
      id: 901, name: 'Research project work', course: 'Test', dueDate: '2026-12-01',
      dueTime: '09:00', category: 'Research Project', priority: 'High', completed: false, sourceEmail: ''
    }
    commitments.addCommitment(commitment)
    commitments.updateCommitment({ ...commitment, name: 'Updated project' })
    await reviews.confirmDashboardSuggestion({
      id: 902, kind: 'Calendar event', title: 'Reviewed project', course: 'Test',
      date: '2026-12-01', time: '10:00', category: 'Research Project', priority: 'High', description: ''
    }, '')
    categories.saveItemCategoryOverride('commitment', 901, 'Research Project')

    categories.moveCategoryOverridesToOther('Research Project')
    reviews.moveReviewedSuggestionCategoryToOther('Research Project')
    commitments.moveCommitmentCategoryToOther('Research Project')
    categories.saveCustomEventCategories([])

    const loaded = await commitments.getCommitments()
    assert.equal(loaded.find((item) => item.id === 901).category, 'Other')
    assert.equal(reviews.getConfirmedCalendarEvents()[0].category, 'Other')
    assert.equal(JSON.parse(values.get('ontrack-custom-commitments'))[0].category, 'Other')
    assert.equal(JSON.parse(values.get('ontrack-commitment-overrides'))[0].category, 'Other')
  } finally {
    await server.close()
    delete globalThis.localStorage
    delete globalThis.window
    delete globalThis.CustomEvent
  }
})
