import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

test('user-scoped cache keeps the same data key isolated between accounts', async () => {
  const values = new Map()
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    get length() {
      return values.size
    },
    key: (index) => [...values.keys()][index] ?? null
  }
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
  try {
    const { createUserScopedStorage } = await server.ssrLoadModule('/src/services/userData.ts')
    const firstAccount = createUserScopedStorage('account-one', storage)
    const secondAccount = createUserScopedStorage('account-two', storage)

    firstAccount.setItem('ontrack-custom-commitments', '[{"id":1}]')
    firstAccount.setPending('ontrack-custom-commitments', '[{"id":1}]', 1)

    assert.equal(firstAccount.getItem('ontrack-custom-commitments'), '[{"id":1}]')
    assert.equal(secondAccount.getItem('ontrack-custom-commitments'), null)
    assert.deepEqual(firstAccount.keys(), ['ontrack-custom-commitments'])
    assert.deepEqual(secondAccount.keys(), [])
    assert.deepEqual(firstAccount.pendingKeys(), ['ontrack-custom-commitments'])
    assert.equal(secondAccount.getPending('ontrack-custom-commitments'), null)
  } finally {
    await server.close()
  }
})
