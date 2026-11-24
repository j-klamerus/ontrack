import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

test('settings shows the current account profile with Gmail and keeps premium controls out of settings', async () => {
  const savedSettings = JSON.stringify({
    studentName: 'Old Demo Name',
    studentEmail: 'old@example.com',
    spamWarnings: false
  })
  const savedSpamSettings = JSON.stringify({
    rules: [{
      id: 'custom-spam-rule',
      enabled: true,
      field: 'subject',
      operator: 'contains',
      pattern: 'fake invoice'
    }],
    blockedSenders: ['phisher@example.com']
  })
  const savedEmailRules = JSON.stringify([{
    id: 'custom-email-rule',
    enabled: true,
    field: 'subject',
    operator: 'contains',
    pattern: 'biology project',
    label: 'Custom Academic'
  }])
  const savedPriorityRules = JSON.stringify([{
    id: 'custom-priority-rule',
    enabled: true,
    field: 'subject',
    operator: 'contains',
    pattern: 'action required',
    priority: 'High'
  }])
  globalThis.localStorage = {
    getItem: (key) => {
      if (key === 'ontrack-demo-settings') return savedSettings
      if (key === 'ontrack-email-spam-settings') return savedSpamSettings
      if (key === 'ontrack-email-rules') return savedEmailRules
      if (key === 'ontrack-email-priority-rules') return savedPriorityRules
      return null
    }
  }
  globalThis.window = { location: { search: '' } }

  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
  try {
    const { default: Settings } = await server.ssrLoadModule('/src/pages/Settings.tsx')
    const { default: PremiumFeatures } = await server.ssrLoadModule('/src/pages/PremiumFeatures.tsx')
    for (const user of [
      { name: 'Alex Student', email: 'alex@example.com' },
      { name: 'Taylor Student', email: 'taylor@example.com' }
    ]) {
      const html = renderToStaticMarkup(createElement(Settings, { user, userId: 'test-user', onDirtyChange() {}, onLogOut() {} }))
      assert.match(html, /class="settings-card gmail-connection-card"[\s\S]*?id="student-profile-heading">Student profile/)
      assert.match(html, new RegExp(`<dt>Student name<\\/dt><dd>${user.name}<\\/dd>`))
      assert.match(html, new RegExp(`<dt>Email address<\\/dt><dd>${user.email}<\\/dd>`))
      assert.doesNotMatch(html, /Old Demo Name|old@example\.com/)
      assert.doesNotMatch(html, /Email Rules|Email Priority Rules|Custom Academic|action required|Spam warnings|Spam &amp; Phishing Detection|AI Preferences|Privacy Settings|Simulated AI email summaries|Notification Preferences|Deadline reminders|Important email notifications/)
    }

    const premiumHtml = renderToStaticMarkup(createElement(PremiumFeatures))
    assert.match(premiumHtml, /Spam &amp; phishing protection/)
    assert.match(premiumHtml, /Spam &amp; Phishing Detection/)
    assert.match(premiumHtml, /fake invoice/)
    assert.match(premiumHtml, /phisher@example\.com/)
    assert.match(premiumHtml, /Custom email rules/)
    assert.match(premiumHtml, /Email Rules/)
    assert.match(premiumHtml, /Email Priority Rules/)
    assert.match(premiumHtml, /Custom Academic/)
    assert.match(premiumHtml, /biology project/)
    assert.match(premiumHtml, /action required/)
  } finally {
    await server.close()
    delete globalThis.localStorage
    delete globalThis.window
  }
})
