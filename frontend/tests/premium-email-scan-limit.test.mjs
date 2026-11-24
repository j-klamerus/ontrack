import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

test('email scan limit defaults to 20 and persists only whole numbers from 10 to 50', async () => {
  const values = new Map()
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  }
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
  try {
    const { getEmailScanLimit, saveEmailScanLimit, EMAIL_SCAN_LIMIT_KEY } =
      await server.ssrLoadModule('/src/services/emailScanLimit.ts')
    const { analyzeGmail } = await server.ssrLoadModule('/src/services/gmailAnalysis.ts')

    assert.equal(getEmailScanLimit(), 20)
    saveEmailScanLimit(10)
    assert.equal(getEmailScanLimit(), 10)
    saveEmailScanLimit(50)
    assert.equal(getEmailScanLimit(), 50)

    assert.throws(() => saveEmailScanLimit(9), /whole number from 10 to 50/)
    assert.throws(() => saveEmailScanLimit(51), /whole number from 10 to 50/)
    assert.throws(() => saveEmailScanLimit(20.5), /whole number from 10 to 50/)
    values.set(EMAIL_SCAN_LIMIT_KEY, '9')
    assert.throws(() => getEmailScanLimit(), /whole number from 10 to 50/)
    await assert.rejects(analyzeGmail(9), /whole number from 10 to 50/)
    await assert.rejects(analyzeGmail(51), /whole number from 10 to 50/)
  } finally {
    await server.close()
    delete globalThis.localStorage
  }
})
