import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

test('Gmail OAuth return clears the temporary sign-in snapshot and rejects stale sessions', async () => {
  const values = new Map([[
    'ontrack-gmail-oauth-session',
    JSON.stringify({
      accessToken: 'temporary-access-token',
      refreshToken: 'temporary-refresh-token',
      createdAt: Date.now() - 11 * 60 * 1000
    })
  ]])
  let replacedUrl = null
  globalThis.sessionStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  }
  globalThis.window = {
    location: { href: 'http://localhost:5173/?gmail=connected' },
    history: { replaceState: (_state, _title, url) => { replacedUrl = url } }
  }
  globalThis.document = { title: 'On Track' }
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
  try {
    const { restoreSessionAfterGmailOAuthRedirect } =
      await server.ssrLoadModule('/src/services/supabase.ts')

    await assert.rejects(
      restoreSessionAfterGmailOAuthRedirect(),
      /sign-in expired during Gmail authorization/
    )
    assert.equal(values.has('ontrack-gmail-oauth-session'), false)
    assert.equal(replacedUrl, '/')
  } finally {
    await server.close()
    delete globalThis.sessionStorage
    delete globalThis.window
    delete globalThis.document
  }
})
