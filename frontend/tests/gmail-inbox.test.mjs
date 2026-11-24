import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

test('live Gmail analyses map into stable, displayable Inbox messages', async () => {
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
  try {
    const { toStudentEmails } = await server.ssrLoadModule('/src/services/gmailAnalysis.ts')
    const analyses = [
      {
        id: 'gmail-message-one',
        threadId: 'thread-one',
        sender: '"Campus Office" <office@example.edu>',
        subject: 'Exam schedule',
        receivedAt: 'Mon, 23 Nov 2026 10:00:00 -0500',
        read: true,
        body: '  Your exam is scheduled for Friday.\nBring your student ID.  ',
        summary: 'The exam is on Friday.',
        priority: 'High',
        important: true,
        spamLikelihood: 0.02,
        signals: ['Exam', 'General'],
        commitments: [{ title: 'Attend the exam', dueAt: '2026-11-27T09:00:00-05:00', confidence: 0.9 }]
      },
      {
        id: 'gmail-message-two',
        threadId: null,
        sender: 'teacher@example.edu',
        subject: 'Class reminder',
        receivedAt: null,
        read: false,
        body: '',
        summary: 'A reminder for class.',
        priority: 'Low',
        important: false,
        spamLikelihood: 0.1,
        signals: ['General'],
        commitments: []
      }
    ]

    const emails = toStudentEmails(analyses)

    assert.equal(emails.length, 2)
    assert.notEqual(emails[0].id, emails[1].id)
    assert.equal(emails[0].id, toStudentEmails(analyses)[0].id)
    assert.equal(emails[0].sender, 'Campus Office')
    assert.equal(emails[0].email, 'office@example.edu')
    assert.equal(emails[0].preview, 'Your exam is scheduled for Friday. Bring your student ID.')
    assert.equal(emails[0].read, true)
    assert.equal(emails[0].priority, 'High')
    assert.deepEqual(emails[0].signals, ['Exam', 'Other'])
    assert.deepEqual(emails[0].gmailAnalysis, {
      spamLikelihood: 0.02,
      commitments: analyses[0].commitments
    })
    assert.equal(emails[1].email, 'teacher@example.edu')
    assert.equal(emails[1].date, '')
  } finally {
    await server.close()
  }
})
