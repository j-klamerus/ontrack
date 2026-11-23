import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getUserProfile } from '../src/services/user.ts'

test('uses the signed-in account name and email', () => {
  assert.deepEqual(
    getUserProfile({ user_metadata: { full_name: '  Alex Student  ', name: 'Alex' }, email: 'alex@example.com' }),
    { name: 'Alex Student', email: 'alex@example.com' }
  )
  assert.deepEqual(
    getUserProfile({ user_metadata: { name: 'Taylor' }, email: 'taylor@example.com' }),
    { name: 'Taylor', email: 'taylor@example.com' }
  )
})

test('handles missing or invalid account names without using demo data', () => {
  assert.deepEqual(
    getUserProfile({ user_metadata: { full_name: ' ', name: 42 }, email: 'student@example.com' }),
    { name: '', email: 'student@example.com' }
  )
  assert.deepEqual(getUserProfile({ user_metadata: {} }), { name: '', email: '' })
})
