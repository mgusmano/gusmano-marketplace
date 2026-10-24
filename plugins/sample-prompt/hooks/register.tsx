import type { Register } from 'claude-code'

const SAMPLE = 'Summarize the open changes in this repo and list any risks.'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'sample-text',
      description: 'Puts sample text in the prompt box.',
    })

    return next(e)
  })

  on('command.run', { command: 'sample-text' }, async ($, e, next) => {
    await $.prompt.fill({ text: SAMPLE, mode: 'replace' })

    return { text: 'Sample text added to the prompt box.' }
  })
}
