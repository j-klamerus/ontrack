import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

test('settings shows the current account instead of an old saved demo profile', async () => {
  const savedSettings = JSON.stringify({
    studentName: 'Old Demo Name',
    studentEmail: 'old@example.com',
    spamWarnings: false
  })
  globalThis.localStorage = {
    getItem: (key) => key === 'ontrack-demo-settings' ? savedSettings : null
  }
  globalThis.window = { location: { search: '' } }

  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { default: Settings } = await server.ssrLoadModule('/src/pages/Settings.tsx')
    for (const user of [
      { name: 'Alex Student', email: 'alex@example.com' },
      { name: 'Taylor Student', email: 'taylor@example.com' }
    ]) {
      const html = renderToStaticMarkup(createElement(Settings, { user, onLogOut() {} }))
      assert.match(html, new RegExp(`id="student-name"[^>]*readOnly=""[^>]*value="${user.name}"`))
      assert.match(html, new RegExp(`id="student-email"[^>]*readOnly=""[^>]*value="${user.email}"`))
      assert.doesNotMatch(html, /Old Demo Name|old@example\.com/)
      assert.match(html, /Spam warnings<\/span>[\s\S]*?<input type="checkbox"\/>/)
    }
  } finally {
    await server.close()
    delete globalThis.localStorage
    delete globalThis.window
  }
})
