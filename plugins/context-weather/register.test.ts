import { expect, test } from 'claude-code/testing'

test('reads the window fill when the session starts', async ($, on) => {
  let reads = 0
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.usage', () => {
    reads += 1
    return { value: { startedAt: 0, context: { window: 200000, percent: 42 }, rateLimits: [] } }
  })

  await $.session.start({ cwd: '/tmp', surface: null, isInteractive: false })

  expect(reads).toBe(1)
})
