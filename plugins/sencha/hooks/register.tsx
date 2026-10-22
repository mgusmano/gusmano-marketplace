import type { Register, RenderSurface, PaneOpenArgs } from 'claude-code'
import { versionString, doError, renderMessage, subjectOf, clearAll, appendLines, PANE, LOGO_SVG, LOGO_PNG } from './helpers'
import { commandSencha, commandCallit, commandAsk } from './helpers/commands'
import type { ButtonProps } from './components/button'
import type { ExpanderProps } from './components/expander'
import {
  sections, expanderProps, expandAll, collapseAll, toggleSection, addItem, addSection,
  addItemToLatestSection, setSectionStatus, runTests,
} from './helpers/sections'

const spaces = 0

export const register: Register = on => {
  let startedAt = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'sencha', description: 'Open the Sencha side pane' })
    await $.command.register({ name: 'callit', description: 'Call a tool' })
    await $.command.register({ name: 'ask', description: 'Ask Example' })

    const MAX_OPEN_TRIES = 10
    const openWhenSurface = async (tries = 1): Promise<void> => {
      if ((await $.session.surfaces()).length === 0) {
        if (tries >= MAX_OPEN_TRIES) {
          $.ui.log(`session.start: no surface after ${MAX_OPEN_TRIES} tries, pane not opened`)
          return
        }
        $.clock.after(500, () => { void openWhenSurface(tries + 1) })
        return
      }
      const paneOpenArgs: PaneOpenArgs = {
        id: PANE,
        title: 'Sencha',
        //rows: 600,
        columns: 100
      }
      await $.ui.open(paneOpenArgs).catch((error) => {
        $.ui.log(`session.start.ERROR: ${error.toString()}`)
      })
    }
    $.clock.after(500, () => { void openWhenSurface() })

    await addSection($, 'session.start', `${await versionString($)} At ${new Date().toLocaleString()}`)
    return next(e)
  }).catch(($, e, next) => { doError($, e); return next(e) });

  on('ui.close', async ($, e, next) => {
    const message = JSON.stringify(e, null, spaces)
    await addSection($, 'ui.close', message)

    if (e.id !== PANE) return next(e)
    //isPaneOpen = false
    return next(e)
  }).catch(($, e, next) => { doError($, e); return next(e) });

  on('ui.press', async ($, e, next) => {
    if (e.plugin !== $.plugin.name || e.requestId !== PANE) return next(e)
    if (e.element === 'close') await $.ui.close({ id: PANE }).catch(() => undefined)
    return next(e)
  }).catch(($, e, next) => { doError($, e); return next(e) });

  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      $.ui.invalidate('ui.render')
      return next(e)
    }
    return next(e)
  }).catch(($, e, next) => { doError($, e); return next(e) });

  on('command.run', { command: 'sencha' }, async $ => commandSencha($)).catch(($, e, next) => { doError($, e); return next(e) });
  on('command.run', { command: 'callit' }, async $ => commandCallit($)).catch(($, e, next) => { doError($, e); return next(e) });
  on('command.run', { command: 'ask' }, async ($, e, next) => commandAsk($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });

  on('prompt.submit', async ($, e, next) => {
    await addSection($, 'prompt.submit', e.text)
    return next(e)
  }).catch(($, e, next) => { doError($, e); return next(e) });

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
  }).catch(($, e, next) => { doError($, e); return next(e) });

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
  }).catch(($, e, next) => { doError($, e); return next(e) });

  on('tool.call', async ($, e, next) => {
    let stop = false;
    let out: any;
    const message2 = ' '
    const subject = subjectOf(e)
    const sectionId = await addSection($, 'tool.call', e.tool + message2, { status: 'runs' })
    if (subject) await addItemToLatestSection($, subject)
    if (e.tool === 'mcp__plugin_sencha_extjs-tools__extjs-initialize-with-sencha-cmd') {
      out = next(e).then(async extjsInitializeWithSenchaCmdResult => {
        if (extjsInitializeWithSenchaCmdResult.deny) {
          stop = true;
        }
      })
      const testGlobalGetTool = `mcp__plugin_sencha_extjs-tools__test-global-get`; const testGlobalGetName = 'test-global-get';
      while (!stop) {
        const testGlobalGetResult: any = await $.tool.call({ tool: testGlobalGetTool, name: testGlobalGetName })
        //$.ui.log(`testGlobalGetResult ${JSON.stringify(testGlobalGetResult)}`)
        let textJson = JSON.parse(testGlobalGetResult.result[0].text)
        let data = textJson.data;
        await appendLines($, data as { name: string }[])
        if (JSON.stringify(textJson).includes('polling done')) stop = true
        await $.clock.sleep(500)
      }
    }
    else {
      out = await next(e)
    }
    const failed = out != null && typeof out.then !== 'function' && (out.isError === true || out.deny !== undefined)
    setSectionStatus($, sectionId, failed ? 'fail' : 'done')
    return out;
  }).catch((_, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const { Box, Text } = $.ui.resolve(e)
    let img
    if (e.surface === 'terminal') {
      const { Image } = $.ui.resolve(e)
      img = <Box><Image source={{ png: (await $.fs.read(`${$.plugin.root}/${LOGO_PNG}`, { as: 'bytes' })).base64 }} columns={2} rows={1} alt="Sencha" /></Box>
    }
    const beneath = await next(e)
    return (
      <Box flexDirection="column" marginTop={1}>
        <Box flexDirection="row">
          {img}
          <Text color="cyan" italic>Sencha</Text>
          <Text dimColor> · </Text>
          <Text color="yellow" italic>Classic toolkit · Classic theme</Text>
        </Box>
        {beneath}
      </Box>
    )
  }).catch(($, e, next) => { doError($, e); return next(e) });
  on('ui.render', { component: 'AskUserQuestion' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
  on('ui.render', { component: 'CommandOutput' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
  on('ui.render', { component: 'InfoNotice' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
  //on('ui.render', { component: 'Pane' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
  // on('ui.render', { component: 'ToolGroup'}, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
  on('ui.render', { component: 'ToolProgress' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
  //on('ui.render', { component: 'ToolResult' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
  //on('ui.render', { component: 'ToolUse' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });

  on('ui.message', async ($, e, next) => {
    if (e.element === 'header-test') {
      const data = e.data as { press?: boolean; over?: boolean }
      if (data?.over === true) {
        $.ui.status('Test: runs ten rounds of add section / add item')
      }
      if (data?.over === false) {
        $.ui.status(undefined)
      }
      if (data?.press === true) {
        void runTests($).catch(err => doError($, err))
      }
      return {}
    }
    if (e.element === 'clear-top' || e.element === 'clear-bottom') {
      const data = e.data as { press?: boolean; over?: boolean }
      if (data?.over === true) {
        $.ui.status('Clear: empties the pane data and the expander')
      }
      if (data?.over === false) {
        $.ui.status(undefined)
      }
      if (data?.press === true) {
        void clearAll($).catch(err => doError($, err))
      }
      return {}
    }
    if (e.element === 'close-top' || e.element === 'close-bottom') {
      const data = e.data as { press?: boolean; over?: boolean }
      if (data?.over === true) {
        $.ui.status('Close: closes the pane')
      }
      if (data?.over === false) {
        $.ui.status(undefined)
      }
      if (data?.press === true) {
        await $.ui.close({ id: PANE }).catch(() => undefined)
      }
      return {}
    }
    if (e.element === 'bottom-top') {
      const data = e.data as { press?: boolean; over?: boolean }
      if (data?.over === true) {
        $.ui.status('Bottom: scrolls the pane down to the bottom')
      }
      if (data?.over === false) {
        $.ui.status(undefined)
      }
      if (data?.press === true) {
        await $.ui.scroll({ in: PANE, to: 'end' })
      }
      return {}
    }
    if (e.element === 'top-bottom') {
      const data = e.data as { press?: boolean; over?: boolean }
      if (data?.over === true) {
        $.ui.status('Top: scrolls the pane back to the top')
      }
      if (data?.over === false) {
        $.ui.status(undefined)
      }
      if (data?.press === true) {
        await $.ui.scroll({ in: PANE, to: 'start' })
      }
      return {}
    }
    if (e.element === 'toggle-all') {
      const data = e.data as { press?: boolean; over?: boolean }
      if (data?.over === true) {
        $.ui.status('Expand All / Collapse All: toggles every section')
      }
      if (data?.over === false) {
        $.ui.status(undefined)
      }
      if (data?.press === true) {
        const all = sections().length > 0 && sections().every(s => s.expanded)
        if (all) collapseAll($)
        else expandAll($)
      }
      return {}
    }
    if (e.element === 'add-section') {
      const data = e.data as { press?: boolean; over?: boolean }
      if (data?.over === true) {
        $.ui.status('Add Section: appends a new section and focuses it')
      }
      if (data?.over === false) {
        $.ui.status(undefined)
      }
      if (data?.press === true) {
        await addSection($)
      }
      return {}
    }
    if (e.element === 'add-item-latest') {
      const data = e.data as { press?: boolean; over?: boolean }
      if (data?.over === true) {
        $.ui.status('Add Item to Latest Section: appends an item to the last section')
      }
      if (data?.over === false) {
        $.ui.status(undefined)
      }
      if (data?.press === true) {
        await addItemToLatestSection($)
      }
      return {}
    }
    if (e.element === 'run-test') {
      const data = e.data as { press?: boolean; over?: boolean }
      if (data?.over === true) {
        $.ui.status('Test: runs ten rounds of add section / add item')
      }
      if (data?.over === false) {
        $.ui.status(undefined)
      }
      if (data?.press === true) {
        void runTests($).catch(err => doError($, err))
      }
      return {}
    }
    if (e.element === 'expander') {
      const data = e.data as {
        toggle?: { section: string; open: boolean }
        addRow?: { section: string }
        addSection?: boolean
        press?: { section: string; index: number }
      }
      if (data?.toggle) {
        const { section, open } = data.toggle
        toggleSection(section, open)
        return { props: expanderProps() }
      }
      if (data?.addRow) {
        addItem($, data.addRow.section)
        return { props: expanderProps() }
      }
      if (data?.addSection) {
        await addSection($)
        return { props: expanderProps() }
      }
    }
    return next(e)
  }).catch(($, e, next) => { doError($, e); return next(e) });

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e, next) => {
    const { Box, Text } = $.ui.resolve(e)
    let version =
      <Text color="cyan" italic>{await versionString($)}</Text>
    const allExpanded = sections().length > 0 && sections().every(s => s.expanded)

    const top = (Client: any, surface: RenderSurface) => (
      <Box flexDirection="row" marginTop={1}>
        <Box marginRight={1}><Client key="clear-top" module="./components/button.tsx" props={{ id: 'clear-top', label: 'clear', dim: false, surface } satisfies ButtonProps} /></Box>
        <Box marginRight={1}><Client key="close-top" module="./components/button.tsx" props={{ id: 'close-top', label: 'close', dim: false, surface } satisfies ButtonProps} /></Box>
        <Box marginRight={1}> <Client key="bottom-top" module="./components/button.tsx" props={{ id: 'bottom-top', label: 'bottom', dim: false, surface } satisfies ButtonProps} /> </Box>
        <Box marginRight={1}><Client key="toggle-all" module="./components/button.tsx" props={{ id: 'toggle-all', label: allExpanded ? 'Collapse All' : 'Expand All', dim: false, surface } satisfies ButtonProps} /></Box>
        <Box marginRight={1}><Client key="add-section" module="./components/button.tsx" props={{ id: 'add-section', label: 'Add Section', dim: false, surface } satisfies ButtonProps} /></Box>
        <Box marginRight={1}><Client key="add-item-latest" module="./components/button.tsx" props={{ id: 'add-item-latest', label: 'Add Item to Latest Section', dim: false, surface } satisfies ButtonProps} /></Box>
        <Box marginRight={1}><Client key="run-test" module="./components/button.tsx" props={{ id: 'run-test', label: 'Test', dim: false, surface } satisfies ButtonProps} /></Box>
      </Box>
    )

    const bottom = (Client: any, surface: RenderSurface) => (
      <Box flexDirection="row" marginTop={1}>
        <Box marginRight={1}> <Client key="clear-bottom" module="./components/button.tsx" props={{ id: 'clear-bottom', label: 'clear', dim: false, surface } satisfies ButtonProps} /> </Box>
        <Box marginRight={1}> <Client key="close-bottom" module="./components/button.tsx" props={{ id: 'close-bottom', label: 'close', dim: false, surface } satisfies ButtonProps} /> </Box>
        <Box marginRight={1}> <Client key="top-bottom" module="./components/button.tsx" props={{ id: 'top-bottom', label: 'top', dim: false, surface } satisfies ButtonProps} /> </Box>
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
            <Svg source={await $.fs.read(`${$.plugin.root}/${LOGO_SVG}`)} width={25} height={25} alt="Sencha" />
            <Box marginLeft={2}><Text color="yellow" italic>Sencha</Text></Box>
            <Box marginLeft={2}>{version}</Box>
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

    if (e.surface === 'terminal') {
      const { Image, Text, Client } = $.ui.resolve(e)
      const dropped: string[] = []
      const expander = expanderProps(dropped)
      if (dropped.length > 0) $.ui.log(`expander props: dropped ${dropped.join(', ')}`)
      return (
        <Box flexDirection="column">
          <Box flexDirection="row">
            <Box><Image source={{ png: (await $.fs.read(`${$.plugin.root}/${LOGO_PNG}`, { as: 'bytes' })).base64 }} columns={2} rows={1} alt="Sencha" /></Box>
            <Box marginLeft={2}>{version}</Box>
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
  }).catch(($, e, next) => { doError($, e); return next(e) });

}
