import type { Register, EngineInterface, RenderSurface, PaneOpenArgs, Args, Frozen, Next } from 'claude-code'
import { versionString, doError, renderMessage, clearAll, appendLines, startProgress, progressFinished, PANE, LOGO_SVG, LOGO_PNG } from './helpers'
import { commandSencha } from './commands/commandSencha'
import { commandCallit } from './commands/commandCallit'
import { commandAsk } from './commands/commandAsk'
import type { ButtonProps } from './components/button'
import type { ExpanderProps } from './components/expander'
import { HoverHint } from './components/hoverhint'
import { Header } from './components/header'
import { HELP_PANE, HELP_MARKDOWN } from './helpers/help'
import {
  sections, expanderProps, expandAll, collapseAll, toggleSection, addItem, addSection,
  addItemToLatestSection, setSectionStatus, runTests,
} from './helpers/sections'

const spaces = 0

export const register: Register = on => {
  let startedAt = 0
  let hoverHints: Partial<Record<'above' | 'pane', string>> = {}

  on('session.start', async ($, e, next) => {
    //$.ui.log(`session.start: ${await $.session.id()} ${JSON.stringify(e)}`)
    await $.command.register({ name: 'sencha', description: 'open the Sencha side pane' })
    await $.command.register({ name: 'callit', description: 'call a tool' })
    await $.command.register({ name: 'ask', description: 'ask example' })

    // const MAX_OPEN_TRIES = 10
    // const openWhenSurface = async (tries = 1): Promise<void> => {
    //   if ((await $.session.surfaces()).length === 0) {
    //     if (tries >= MAX_OPEN_TRIES) {
    //       $.ui.log(`session.start: no surface after ${MAX_OPEN_TRIES} tries, pane not opened`)
    //       return
    //     }
    //     $.clock.after(500, () => { void openWhenSurface(tries + 1) })
    //     return
    //   }
    //   const paneOpenArgs: PaneOpenArgs = {
    //     id: PANE,
    //     title: 'Sencha',
    //     //rows: 600,
    //     columns: 100
    //   }
    //   await $.ui.open(paneOpenArgs).catch((error) => {
    //     $.ui.log(`session.start.ERROR: ${error.toString()}`)
    //   })
    // }
    //$.clock.after(500, () => { void openWhenSurface() })

    await addSection($, 'session.start', `${await $.session.id()} at ${new Date().toLocaleString()}`)
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  on('ui.close', async ($, e, next) => {
    const message = JSON.stringify(e, null, spaces)
    await addSection($, 'ui.close', message)

    if (e.id !== PANE) return next(e)
    //isPaneOpen = false
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  on('ui.press', async ($, e, next) => {
    if (e.plugin !== $.plugin.name || e.requestId !== PANE) return next(e)
    if (e.element === 'close') await $.ui.close({ id: PANE }).catch(() => undefined)
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      $.ui.invalidate('ui.render')
      return next(e)
    }
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  on('command.run', { command: 'sencha' }, async $ => commandSencha($)).catch(($, e, next) => { doError($, e, next); return next(e) });
  on('command.run', { command: 'callit' }, async $ => commandCallit($)).catch(($, e, next) => { doError($, e, next); return next(e) });
  on('command.run', { command: 'ask' }, async ($, e, next) => commandAsk($, e, next)).catch(($, e, next) => { doError($, e, next); return next(e) });

  on('prompt.submit', async ($, e, next) => {
    await addSection($, 'prompt.submit', e.text)
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  on('turn.start', async ($, e, next) => {
    let hasCommandMessage = false
    let isExtjsPrompt = false
    let isReExtPrompt = false
    const begin = e.text.indexOf('<command-message>')
    const end = e.text.indexOf('</command-message>')
    hasCommandMessage = begin >= 0 && end > begin
    const inner = hasCommandMessage ? e.text.slice(begin + 17, end).trim() : ''
    isExtjsPrompt = inner.startsWith('extjs')
    isReExtPrompt = inner.startsWith('reext')
    const message = `hasCommandMessage: ${String(hasCommandMessage)} · isExtjsProject: ${String(isExtjsPrompt)} · isReExtPrompt: ${String(isReExtPrompt)} · commandMessage: ${inner.slice(0, 60)}`
    await addSection($, 'turn.start', message)
    startedAt = await $.clock.now()
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  on('turn.step', async function* (_, e, next) {
    yield* next(e);
  }).catch(async function* ($, e, next) { doError($, e, next); yield* next(e); });

  on('turn.complete', async ($, e, next) => {
    const seconds = Math.round(((await $.clock.now()) - startedAt) / 1000)
    const dur = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
    const message = `time: ${dur}`;
    await addSection($, 'turn.complete', message)
    const result = await next(e)
    return result;
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  on('tool.call', async ($, e, next) => {
    const isProgress = 'progress' in e ? e.progress : undefined;
    let stop = false;
    let out: any;
    const message2 = ' '
    // beside the name, in purple: a Bash call's description, or a Read, Edit or Write call's file path
    let detail: string | undefined
    if (e.tool === 'Bash') detail = (e as { description?: string }).description
    if (e.tool === 'Read') {
      $.ui.log(`e ${JSON.stringify(e)}`)
      detail = e.file_path
            $.ui.log(`detail ${detail}`)

      //detail = (e as { file_path?: string }).file_path
    }
    if (e.tool === 'Edit') detail = (e as { file_path?: string }).file_path
    if (e.tool === 'Write') detail = (e as { file_path?: string }).file_path
    const sectionId = await addSection($, 'tool.call', e.tool, detail, { status: 'runs' })
    for (const [key, value] of Object.entries(e)) {
      if (key === 'tool' || key === 'tool_use_id' || value === undefined) continue
      const text = typeof value === 'string' ? value : JSON.stringify(value)
      await addItemToLatestSection($, ` ${key}: ${text}`, '#c4b5fd', true)
    }
    let theResult;
    //$.ui.log(`${e.tool} isProgress ${isProgress}`)
    if (isProgress) {
      // The tool's own result can arrive before its last progress lines. Keep polling until the
      // progress says it is done, so every line lands in this section before the next tool starts.
      const testGlobalGetTool = `mcp__plugin_sencha_extjs-tools__test-global-get`;
      const testGlobalGetName = 'test-global-get';
      const readProgress = async () => {
        const testGlobalGetResult: any = await $.tool.call({ tool: testGlobalGetTool, name: testGlobalGetName })
        return JSON.parse(testGlobalGetResult.result[0].text).data as { name?: string }[]
      }
      // Count the server's list before this tool starts, so its leftover lines and "polling done" are skipped
      startProgress((await readProgress()).length)
      out = next(e).then(toolResult => { theResult = toolResult })
      let polledDone = false
      let pollsAfterResult = 0
      while (!polledDone) {
        //$.ui.log(`in polling while loop for ${e.tool}`)
        const data = await readProgress()
        await appendLines($, data)
        if (progressFinished(data)) polledDone = true
        // safety: if the progress never says done, stop a few polls after the tool's own result
        if (theResult !== undefined && ++pollsAfterResult >= 3) stop = true
        if (stop) break
        await $.clock.sleep(500)
      }
      await out
    }
    else {
      out = await next(e)
      theResult = out;
    }
    const failed = theResult != null && (theResult.isError === true || theResult.deny !== undefined)
    if (failed === true) {
      await addItemToLatestSection($, theResult.result)
    }
    setSectionStatus($, sectionId, failed ? 'fail' : 'done')
    return theResult;
  }).catch((_, e, next) => next(e))

  on('ui.render', { component: 'AskUserQuestion' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e, next); return next(e) });
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e, next); return next(e) });
  on('ui.render', { component: 'CommandOutput' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e, next); return next(e) });
  on('ui.render', { component: 'InfoNotice' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e, next); return next(e) });
  //on('ui.render', { component: 'Pane' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e, next); return next(e) });
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e, next); return next(e) });
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e, next); return next(e) });
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e, next); return next(e) });
  // on('ui.render', { component: 'ToolGroup'}, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e, next); return next(e) });
  on('ui.render', { component: 'ToolProgress' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e, next); return next(e) });
  //on('ui.render', { component: 'ToolResult' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e, next); return next(e) });
  //on('ui.render', { component: 'ToolUse' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e, next); return next(e) });
  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e, next); return next(e) });
  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e, next); return next(e) });

  // Any button that reports hover: its hint shows in the status bar and in the spot for its place.
  on('ui.message', async ($, e, next) => {
    const data = e.data as { over?: boolean; hint?: string; place?: 'above' | 'pane' } | undefined
    if (data?.over === undefined || data.place === undefined) return next(e)
    const hint = data.over ? data.hint : undefined
    hoverHints = { ...hoverHints, [data.place]: hint }
    $.ui.invalidate('ui.render')
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  // the expander posts its own row clicks; answer with the new props so the list redraws
  on('ui.message', { element: 'expander' }, async ($: EngineInterface, e: Frozen<Args<'ui.message'>>, next: Next<'ui.message'>) => {
    const data = e.data as {
      toggle?: { section: string; open: boolean }
      //addRow?: { section: string }
      //addSection?: boolean
    }
    if (data?.toggle) {
      toggleSection(data.toggle.section, data.toggle.open)
      return { props: expanderProps() }
    }
    // if (data?.addRow) {
    //   await addItem($, data.addRow.section)
    //   return { props: expanderProps() }
    // }
    // if (data?.addSection) {
    //   await addSection($)
    //   return { props: expanderProps() }
    // }
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  // test messages
  on('ui.message', { element: 'toggle' }, async ($: EngineInterface, e: Frozen<Args<'ui.message'>>, next: Next<'ui.message'>) => {
    if ((e.data as { press?: boolean }).press === true) {
      const all = sections().length > 0 && sections().every(s => s.expanded)
      if (all) collapseAll($)
      else expandAll($)
    }
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  on('ui.message', { element: 'add-section' }, async ($: EngineInterface, e: Frozen<Args<'ui.message'>>, next: Next<'ui.message'>) => {
    if ((e.data as { press?: boolean }).press === true) {
      await addSection($)
    }
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  on('ui.message', { element: 'add-item-latest' }, async ($: EngineInterface, e: Frozen<Args<'ui.message'>>, next: Next<'ui.message'>) => {
    if ((e.data as { press?: boolean }).press === true) {
      await addItemToLatestSection($)
    }
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  on('ui.message', { element: 'test' }, async ($: EngineInterface, e: Frozen<Args<'ui.message'>>, next: Next<'ui.message'>) => {
    if ((e.data as { press?: boolean }).press === true) {
      void runTests($).catch(err => doError($, err))
    }
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  // AbovePrompt messages
  on('ui.message', { element: 'extjs-upgrade' }, async ($: EngineInterface, e: Frozen<Args<'ui.message'>>, next: Next<'ui.message'>) => {
    if ((e.data as { press?: boolean }).press === true) {
      await commandSencha($).catch(err => doError($, err))
      await $.command.run({ command: 'extjs-upgrade', args: '' }).catch(err => doError($, err))
    }
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  on('ui.message', { element: 'sencha' }, async ($: EngineInterface, e: Frozen<Args<'ui.message'>>, next: Next<'ui.message'>) => {
    if ((e.data as { press?: boolean }).press === true) {
      await commandSencha($).catch(err => doError($, err))
    }
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });


  on('ui.message', { element: 'help' }, async ($: EngineInterface, e: Frozen<Args<'ui.message'>>, next: Next<'ui.message'>) => {
    if ((e.data as { press?: boolean }).press === true) {
      await $.ui.open({ id: HELP_PANE, title: 'About Sencha', focus: true, closeOnEscape: true }).catch(err => doError($, err))
    }
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  on('ui.message', { element: 'delete-v8' }, async ($: EngineInterface, e: Frozen<Args<'ui.message'>>, next: Next<'ui.message'>) => {
    if ((e.data as { press?: boolean }).press === true) {
      await $.prompt.submit({ text: 'If there is a V8 folder, then delete it.' }).catch(err => doError($, err))
    }
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  on('ui.render', { component: 'Pane', requestId: HELP_PANE }, async ($, e, next) => {
    const { Box, Markdown } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        <Markdown text={HELP_MARKDOWN} />
      </Box>
    )
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {

    if (e.surface === 'desktop') {
      const { Box, Text, Client, Svg } = $.ui.resolve(e)
      const beneath = await next(e)
      let marginBottom = 0;
      if (beneath.type !== 'engine') {
        marginBottom = 1
      }

      return (
        <Box flexDirection="column" marginTop={0} >
          <Box flexDirection="column" marginTop={0} marginBottom={marginBottom} borderStyle="round" >
            <Box flexDirection="row">
              <Header Box={Box} Text={Text} Svg={Svg} logo={await $.fs.read(`${$.plugin.root}/${LOGO_SVG}`)} version={await versionString($)} />
              <Box marginLeft={2}><HoverHint Box={Box} Text={Text} hint={hoverHints.above} /></Box>
            </Box>
            <Box flexDirection="column" marginTop={0} marginBottom={0} >
              <Box marginLeft={2} marginTop={1}>
                <Client key="extjs-upgrade" module="./components/button.tsx" props={{ id: 'extjs-upgrade', label: 'run extjs-upgrade', dim: false, surface: e.surface, place: 'above', hint: `run the 'extjs-upgrade' Skill` } satisfies ButtonProps} />
                <Client key="sencha" module="./components/button.tsx" props={{ id: 'sencha', label: 'show side pane', dim: false, surface: e.surface, place: 'above', hint: 'open the Sencha side pane' } satisfies ButtonProps} />
                <Client key="help" module="./components/button.tsx" props={{ id: 'help', label: 'help', dim: false, surface: e.surface, place: 'above', hint: 'describe the Sencha Claude Code Mod' } satisfies ButtonProps} />
                <Client key="delete-v8" module="./components/button.tsx" props={{ id: 'delete-v8', label: 'delete v8 folder', dim: false, surface: e.surface, place: 'above', hint: 'run a prompt that deletes the V8 folder' } satisfies ButtonProps} />
              </Box>
            </Box>
          </Box>
          {beneath}
        </Box>
      )
    }

    if (e.surface === 'terminal') {
      const { Box, Text, Image, Client } = $.ui.resolve(e)
      const img = <Box><Image source={{ png: (await $.fs.read(`${$.plugin.root}/${LOGO_PNG}`, { as: 'bytes' })).base64 }} columns={2} rows={1} alt="Sencha" /></Box>
      const beneath = await next(e)
      return (
        <Box flexDirection="column" marginTop={1}>
          <Box flexDirection="row">
            {img}
            <Text color="cyan" italic>Sencha</Text>
            <Text dimColor> · </Text>
            <Text color="yellow" italic>Claude Code Mod</Text>
            <Box marginLeft={2}><Client key="sencha" module="./components/button.tsx" props={{ id: 'sencha', label: 'Sencha', dim: false, surface: e.surface, place: 'above', hint: 'Open the Sencha side pane' } satisfies ButtonProps} /></Box>
            <Box marginLeft={2}><Client key="extjs-upgrade" module="./components/button.tsx" props={{ id: 'extjs-upgrade', label: 'extjs-upgrade', dim: false, surface: e.surface, place: 'above', hint: 'Put /extjs-upgrade in the prompt' } satisfies ButtonProps} /></Box>
            <Box marginLeft={2}><Client key="help" module="./components/button.tsx" props={{ id: 'help', label: 'help', dim: false, surface: e.surface, place: 'above', hint: 'Describe the Sencha mod' } satisfies ButtonProps} /></Box>
            <Box marginLeft={2}><Client key="delete-v8" module="./components/button.tsx" props={{ id: 'delete-v8', label: 'Delete V8 folder', dim: false, surface: e.surface, place: 'above', hint: 'Run a prompt that deletes the V8 folder' } satisfies ButtonProps} /></Box>
          </Box>
          <HoverHint Box={Box} Text={Text} hint={hoverHints.above} />
          {beneath}
        </Box>
      )
    }

    if (e.surface === 'vscode') {
      const { Text } = $.ui.resolve(e)
      return (<Text>vscode</Text>)
    }

    if (e.surface === 'mobile') {
      const { Text } = $.ui.resolve(e)
      return (<Text>mobile</Text>)
    }

    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  // Pane messages
  on('ui.message', { element: 'clear' }, async ($: EngineInterface, e: Frozen<Args<'ui.message'>>, next: Next<'ui.message'>) => {
    if ((e.data as { press?: boolean }).press === true) {
      void clearAll($).catch(err => doError($, err))
    }
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  on('ui.message', { element: 'close' }, async ($: EngineInterface, e: Frozen<Args<'ui.message'>>, next: Next<'ui.message'>) => {
    if ((e.data as { press?: boolean }).press === true) {
      await $.ui.close({ id: PANE }).catch(() => undefined)
    }
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  on('ui.message', { element: 'bottom' }, async ($: EngineInterface, e: Frozen<Args<'ui.message'>>, next: Next<'ui.message'>) => {
    if ((e.data as { press?: boolean }).press === true) {
      await $.ui.scroll({ in: PANE, to: 'end' })
    }
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  on('ui.message', { element: 'top' }, async ($: EngineInterface, e: Frozen<Args<'ui.message'>>, next: Next<'ui.message'>) => {
    if ((e.data as { press?: boolean }).press === true) {
      await $.ui.scroll({ in: PANE, to: 'start' })
    }
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e, next) => {
    const { Box, Text } = $.ui.resolve(e)
    try {
      const allExpanded = sections().length > 0 && sections().every(s => s.expanded)
      const top = (Client: any, surface: RenderSurface) => (
        <Box flexDirection="row" marginTop={1}>
          <Client key="bottom" module="./components/button.tsx" props={{ id: 'bottom', label: 'go to bottom', dim: false, surface, place: 'pane', hint: 'go to the bottom of the panel' } satisfies ButtonProps} />

          <Client key="clear" module="./components/button.tsx" props={{ id: 'clear', label: 'clear', dim: false, surface, place: 'pane', hint: 'Clear All Steps' } satisfies ButtonProps} />
          <Client key="close" module="./components/button.tsx" props={{ id: 'close', label: 'close', dim: false, surface, place: 'pane', hint: 'Close' } satisfies ButtonProps} />
        </Box>
      )

      const test = (Client: any, surface: RenderSurface) => (
        <Box flexDirection="row" marginTop={1}>
          <Client key="test" module="./components/button.tsx" props={{ id: 'test', label: 'Test', dim: false, surface, place: 'pane', hint: 'Add 10 test sections' } satisfies ButtonProps} />
          <Client key="add-section" module="./components/button.tsx" props={{ id: 'add-section', label: 'Add Section', dim: false, surface, place: 'pane', hint: 'Add Section' } satisfies ButtonProps} />
          <Client key="add-item-latest" module="./components/button.tsx" props={{ id: 'add-item-latest', label: 'Add Item to Latest Section', dim: false, surface, place: 'pane', hint: 'Add Item' } satisfies ButtonProps} />
          <Client key="toggle" module="./components/button.tsx" props={{ id: 'toggle', label: allExpanded ? 'Collapse All' : 'Expand All', dim: false, surface, place: 'pane', hint: 'Toggle' } satisfies ButtonProps} />
        </Box>
      )

      const bottom = (Client: any, surface: RenderSurface) => (
        <Box flexDirection="row" marginTop={1}>
          <Client key="top" module="./components/button.tsx" props={{ id: 'top', label: 'go to top', dim: false, surface, place: 'pane', hint: 'go to the top of the panel' } satisfies ButtonProps} />
        </Box>
      )

      if (e.surface === 'desktop') {
        const { Box, Text, Svg, Client } = $.ui.resolve(e)
        const dropped: string[] = []
        const expander = expanderProps(dropped)
        if (dropped.length > 0) $.ui.log(`expander props: dropped ${dropped.join(', ')}`)
        return (
          <Box flexDirection="column">

            <Box flexDirection="row">
              <Header Box={Box} Text={Text} Svg={Svg} logo={await $.fs.read(`${$.plugin.root}/${LOGO_SVG}`)} version={await versionString($)} />
              <Box marginLeft={2}><HoverHint Box={Box} Text={Text} hint={hoverHints.pane} /></Box>
            </Box>

            {top(Client, e.surface)}
            {test(Client, e.surface)}
            <Box marginTop={1}><Text color="yellow" italic>STEPS</Text></Box>
            {dropped.length > 0 ? <Box marginTop={1}><Text color="error">{`expander props: dropped ${dropped.join(', ')}`}</Text></Box> : null}
            <Client key="expander" module="./components/expander.tsx" props={expander satisfies ExpanderProps} />
            {bottom(Client, e.surface)}
          </Box>
        )
      }

      if (e.surface === 'terminal') {
        const { Image, Text, Client } = $.ui.resolve(e)
        const dropped: string[] = []
        const expander = expanderProps(dropped)
        if (dropped.length > 0) $.ui.log(`expander props: dropped ${dropped.join(', ')}`)
        return (
          <Box flexDirection="column">
            <Box flexDirection="row">
              <Box><Image source={{ png: (await $.fs.read(`${$.plugin.root}/${LOGO_PNG}`, { as: 'bytes' })).base64 }} columns={2} rows={1} alt="Sencha" /></Box>
              {/* <Box marginLeft={2}>{version}</Box> */}
              <Box marginLeft={2}><Text color="yellow" italic>{new Date().toLocaleString()}</Text></Box>
            </Box>
            {top(Client, e.surface)}
            <Box marginTop={1}><Text color="yellow" italic>STEPS</Text></Box>
            {dropped.length > 0 ? <Box marginTop={1}><Text color="error">{`expander props: dropped ${dropped.join(', ')}`}</Text></Box> : null}
            <Client key="expander" module="./components/expander.tsx" props={expander satisfies ExpanderProps} />
            {bottom(Client, e.surface)}
          </Box>
        )
      }

      if (e.surface === 'vscode') {
        return (<Text>vscode</Text>)
      }

      if (e.surface === 'mobile') {
        return (<Text>mobile</Text>)
      }

      return next(e)
    }
    catch (error) {
      return (<Text>register Error</Text>)
    }
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

}
