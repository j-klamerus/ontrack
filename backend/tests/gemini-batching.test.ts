import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeEmails } from '../src/services/gemini.js'

test('retries temporary unavailability and analyzes 50 messages in bounded batches', async () => {
  const originalFetch = globalThis.fetch
  const originalApiKey = process.env.GEMINI_API_KEY
  const originalModel = process.env.GEMINI_MODEL
  const batchSizes: number[] = []
  let failOnce = true
  process.env.GEMINI_API_KEY = 'test-key'
  process.env.GEMINI_MODEL = 'test-model'
  globalThis.fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body)) as {
      contents: Array<{ parts: Array<{ text: string }> }>
    }
    const prompt = request.contents[0].parts[0].text
    const marker = 'Email data (JSON):\n'
    const emails = JSON.parse(prompt.slice(prompt.lastIndexOf(marker) + marker.length)) as Array<{ id: string }>
    batchSizes.push(emails.length)
    if (failOnce) {
      failOnce = false
      return new Response(JSON.stringify({ error: { status: 'UNAVAILABLE' } }), { status: 503 })
    }
    const analyses = emails.map(({ id }) => ({
      id,
      summary: 'Test summary',
      priority: 'Low',
      important: false,
      spamLikelihood: 0,
      signals: ['General'],
      commitments: []
    }))

    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(analyses) }] } }]
    }), { headers: { 'Content-Type': 'application/json' } })
  }

  try {
    const emails = Array.from({ length: 50 }, (_, index) => ({
      id: `message-${index}`,
      threadId: null,
      sender: 'sender@example.com',
      subject: `Message ${index}`,
      receivedAt: null,
      read: false,
      body: 'Test body'
    }))

    const analyses = await analyzeEmails(emails)

    assert.deepEqual(batchSizes, [20, 20, 20, 10])
    assert.equal(analyses.length, 50)
  } finally {
    globalThis.fetch = originalFetch
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY
    else process.env.GEMINI_API_KEY = originalApiKey
    if (originalModel === undefined) delete process.env.GEMINI_MODEL
    else process.env.GEMINI_MODEL = originalModel
  }
})
