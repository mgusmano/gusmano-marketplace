import type { EngineInterface, Frozen, Next, On, Register, SessionStartInput, Timer } from 'claude-code'

const PANE = 'mjg-test'

let checksTimer: Timer | null = null

export const register: Register = (on: On) => {

  on('session.start', async ($: EngineInterface, e: Frozen<SessionStartInput>, next: Next<'session.start'>) => {
    //$.ui.log(`session.start: At ${new Date().toLocaleString()}`)
    await $.command.register({ name: 'sayhi', description: 'say hi' })
    await $.command.register({ name: 'testit', description: 'Test calling a model' })
    $.clock.after(100, () => {
      void $.ui.open({ id: PANE, title: 'MJG Test' })
    })

    return next(e)
  })
  on('command.run', { command: 'sayhi' }, async ($, e, next) => {
    return { text: 'hi' }
  })

  on('command.run', { command: 'testit' }, async ($, e, next) => {
    const config = {
      model: 'haiku',
      system: 'Reply with one word: bug, feature, or question.',
      prompt: e.args.trim() || 'classify this',
      maxTokens: 20,
      timeoutMs: 15000,
    }
    $.ui.log(`config: ${JSON.stringify(config, null, 2)}`)
    const r = await $.model.complete(config)
    $.ui.log(`r: ${JSON.stringify(r, null, 2)}`)
    const label = r.isAnswered ? r.text.trim() : 'unknown'
    return { text: 'Label: ' + label }
  })

  on('skill.prompt', async ($, e, next) => {
    $.ui.log(`skill.*: At ${new Date().toLocaleString()}`)
    return next(e)
  })

  const onPress = (log: any) => {
    log(`onPress`)
  }

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const timerLabel = checksTimer ? 'stop timer' : 'start timer'
    return (
      <Box flexDirection="row" marginTop={0}>
        <Text>hi2b</Text>
        <Box borderStyle='single' marginLeft={1} paddingX={1} paddingY={0}>
          <Button plain={true} key="http" label="http" onPress={async () => {
            //const LATEST_URL = 'https://raw.githubusercontent.com/hellosverre/claude-skins/main/.claude-plugin/plugin.json'
            const LATEST_URL = 'https://raw.githubusercontent.com/mgusmano/reextnext/main/package.json'
            const response = await $.http.fetch(LATEST_URL)
            if (!response.ok) {
              throw new Error(`update check: ${LATEST_URL} answered ${response.status}`)
            }
            const parsed: any = JSON.parse(response.text)
            const version: string = parsed.version
            $.ui.log(`press: At ${new Date().toLocaleString()} version: ${version}`)
          }}></Button>
        </Box>

        <Box borderStyle='single' marginLeft={1} paddingX={1} paddingY={0}>
          <Button plain={true} key="timer" label={timerLabel} onPress={async () => {
            if (checksTimer) {
              checksTimer.cancel()
              checksTimer = null
              $.ui.log('checks: stopped')
              $.ui.invalidate('ui.render')
              return
            }
            checksTimer = $.clock.every(5_000, async () => {
              const status = await $.process.run(['gh', 'pr', 'checks', '--json', 'state'])
              $.ui.log('checks: ' + JSON.stringify(status))
            })
            $.ui.log('checks: started')
            $.ui.invalidate('ui.render')
          }}></Button>
        </Box>

        <Box borderStyle='single' marginLeft={1} paddingX={1} paddingY={0}>
          <Button plain={true} key="a" label="a" onPress={() => onPress((msg: string) => $.ui.log(msg))}></Button>
        </Box>

      </Box>
    )
  })

}