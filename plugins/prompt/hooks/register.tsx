import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderSurface } from 'claude-code'

const last = atom({ plugin: 'prompt', key: 'last' } as const, null as string | null)

const PANE = 'prompt'
const COMMAND = 'prompt'

// One copy path for the band and the pane: the surface the press came from
// takes the text; a copy that did not reach a clipboard says why.
const copyPrompt = async ($: EngineInterface, text: string, surface: RenderSurface) => {
  try {
    const result = await $.ui.copy({ text, surface })
    if (!result.isCopied) $.ui.toast(`copy failed: ${result.reason}`)
  } catch (err) {
    $.ui.log(`prompt: copy failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND,
      description: 'open the prompt pane: the last prompt, with a copy button',
    })
    return next(e)
  }).catch(($, e, next) => {
    $.ui.log(`prompt: could not register /${COMMAND} (${next.error.kind}${next.error.message ? `: ${next.error.message}` : ''})`)
    return next(e)
  })

  on('command.run', { command: COMMAND }, async $ => {
    // No surface attached (bare -p run): ui.open may never settle, so check first
    if ((await $.session.surfaces()).length === 0) {
      return { text: 'prompt pane could not open: no surface is attached' }
    }
    try {
      const opened = await $.ui.open({ id: PANE, title: 'Prompt', focus: true, closeOnEscape: true })
      if (!opened.isPlaced) return { text: `prompt pane waiting: ${opened.reason}` }
    } catch {
      return { text: 'prompt pane could not open: no surface is attached' }
    }
    return { text: 'prompt pane opened' }
  }).catch(($, e, next) => {
    $.ui.log(`prompt: /${COMMAND} failed (${next.error.kind}${next.error.message ? `: ${next.error.message}` : ''})`)
    return { text: 'prompt pane could not open: the command failed' }
  })

  on('prompt.submit', async ($, e, next) => {
    await update($, last, () => e.text)
    return next(e)
  }).catch(($, e, next) => {
    $.ui.log(`prompt: could not store the prompt (${next.error.kind}${next.error.message ? `: ${next.error.message}` : ''})`)
    return next(e)
  })

  // on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
  //   const text = await read($, last)
  //   const beneath = await next(e)
  //   if (text === null) {
  //     return beneath
  //   }
  //   const { Box, Text, Button } = $.ui.resolve(e)
  //   return (
  //     <>
  //       <Box flexDirection="column">
  //         <Box flexDirection="row" alignItems="flex-start">
  //           <Box flexGrow={1} flexShrink={1}>
  //             <Text color="green">{text}</Text>
  //           </Box>
  //           <Button
  //             key="prompt-copy"
  //             label="copy"
  //             onPress={press => { void copyPrompt($, text, press.surface) }}
  //           />
  //         </Box>
  //         <Box width="100%" height={1} overflow="hidden">
  //           <Text color="green" wrap="wrap">{'─'.repeat(1000)}</Text>
  //         </Box>
  //       </Box>
  //       {beneath}
  //     </>
  //   )
  // })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e, next) => {
    const text = await read($, last)
    const { Box, Text, Button } = $.ui.resolve(e)
    if (text === null) {
      return (
        <Box>
          <Text dimColor>No prompt submitted yet.</Text>
        </Box>
      )
    }
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" alignItems="flex-start">
          <Box flexGrow={1} flexShrink={1}>
            <Text color="green">{text}</Text>
          </Box>
          <Button
            key="prompt-pane-copy"
            label="copy"
            onPress={press => { void copyPrompt($, text, press.surface) }}
          />
        </Box>
        <Box width="100%" height={1} overflow="hidden">
          <Text color="green" wrap="wrap">{'─'.repeat(1000)}</Text>
        </Box>
      </Box>
    )
  })
}
