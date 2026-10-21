import type { EngineInterface, Hook, Register, RenderInput, ToolCallInput, PaneOpenArgs } from 'claude-code'
import { atom, read, update } from 'claude-code'
import type { UpgradeRun, UpgradeStep, Message } from '../types'
import type { ButtonProps } from './components/button'
import type { ExpanderProps, ExpanderSection } from './components/expander'
import type { Turn } from './types'

let sections: ExpanderSection[] = []

export const versionString = async ($: EngineInterface): Promise<string> => {
  try {
    const manifest = JSON.parse(await $.fs.read(`${$.plugin.root}/.claude-plugin/plugin.json`)) as { version?: unknown }
    return typeof manifest.version === 'string' ? `v${manifest.version}` : 'v?'
  } catch {
    return 'v?'
  }
}

export const doError = ($: any, e: any, next?: { error?: { kind?: string; message?: string } }) => {
  const f = next?.error
  const why = f ? ` (${f.kind}: ${f.message ?? ''})` : ''
  $.ui.log(`error${why}: ${JSON.stringify(e)}`)
}

const cleanData = (value: any, path: string, dropped: string[]): any => {
  if (Array.isArray(value)) return value.map((v, i) => cleanData(v, `${path}[${i}]`, dropped))
  if (value !== null && typeof value === 'object') {
    const out: any = {}
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) { dropped.push(`${path}.${k}`); continue }
      out[k] = cleanData(v, `${path}.${k}`, dropped)
    }
    return out
  }
  return value
}

const expanderProps = (dropped: string[] = []): ExpanderProps => ({
  sections: cleanData(sections, 'sections', dropped),
  titleColor: 'cyan',
  itemColor: 'yellow',
  hoverBg: '#14532d',
  unicode: true,
})

const expandAll = ($: any) => {
  sections = sections.map(s => ({ ...s, expanded: true }))
  $.ui.invalidate('ui.render')
}

const collapseAll = ($: any) => {
  sections = sections.map(s => ({ ...s, expanded: false }))
  $.ui.invalidate('ui.render')
}

const addSection = async ($: any, title?: string, message?: string, step?: Pick<ExpanderSection, 'status' | 'subject'>) => {
  if (message === undefined) { message = '' }
  const n = sections.length + 1
  const previous = sections.length - 1
  const id = `section-${n}`
  const section: ExpanderSection = { id, title: title ?? `section ${n}`, message, items: [], expanded: true }
  if (step?.status !== undefined) section.status = step.status
  if (step?.subject !== undefined) section.subject = step.subject
  sections = [
    ...sections.map((s, i) => (i === previous ? { ...s, expanded: false } : s)),
    section,
  ]
  //await $.clock.sleep(5000)
  $.ui.invalidate('ui.render')

  return id
}

const setSectionStatus = ($: any, id: string, status: ExpanderSection['status']) => {
  //$.ui.log(`setSectionStatus: ${id} ${status}`)
  sections = sections.map(s => (s.id === id ? { ...s, status } : s))
  $.ui.invalidate('ui.render')
}

const addItem = async ($: any, id: string, title?: string) => {
  sections = sections.map(s => {
    if (s.id !== id) return s
    const n = (s.items?.length ?? 0) + 1
    return { ...s, items: [...(s.items ?? []), title ?? `item ${n}`] }
  })
  //await $.clock.sleep(5000)
  $.ui.invalidate('ui.render')

}

const addItemToLatestSection = async ($: any, title?: string) => {
  //$.ui.log(`addItemToLatestSection: title-"${title}"`)
  const latest = sections[sections.length - 1]
  if (latest) await addItem($, latest.id, title)
}

const runTests = async ($: any) => {
  const wait = 50;
  for (let i = 0; i < 10; i++) {
    await addSection($, `new section ${i}`)
    await $.clock.sleep(wait)
    const count = 5 + Math.floor(Math.random() * 6)
    for (let j = 0; j < count; j++) {
      await addItemToLatestSection($, `new item ${j}`)
      await $.clock.sleep(wait)
    }
  }
}


const PANE = 'sencha'
const PANE2 = 'sencha2'
//const PANETEST = 'senchatest'
//let lastPlacement = ''
//const PREFIX = 'mcp__extjs-tools__'
const spaces = 0
const LOGO_SVG = 'assets/rapid.svg'
const LOGO_PNG = 'assets/rapid.png'

const tail = (p: string, max = 46) => (p.length > max ? '…' + p.slice(-(max - 1)) : p)
const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined)
const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined)
// Tool output that is not a JSON object yields {} instead of throwing
// const parseObj = (text: string): Record<string, unknown> => {
//   try {
//     const value: unknown = JSON.parse(text)
//     return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
//   } catch {
//     return {}
//   }
// }

const lines = atom({ plugin: 'sencha', key: 'lines' } as const, [] as { name: string }[])
const history = atom({ plugin: 'sencha', key: 'history' } as const, [] as Message[])
// history is append-only, so only entries past the count already shown are added
//const historySeen = new Map<string, number>()
let linesSeen = 0
const run = atom({ plugin: 'sencha', key: 'run' } as const, {})
const steps = atom({ plugin: 'sencha', key: 'steps' } as const, [])
const messages = atom({ plugin: 'sencha', key: 'messages' } as const, [] as Message[])

// the clear buttons: every atom the pane reads, its line cursor, and the sections
const clearAll = async ($: any) => {
  await update($, run, () => ({}))
  await update($, steps, () => [])
  await update($, messages, () => [])
  await update($, history, () => [])
  await update($, lines, () => [])
  linesSeen = 0
  sections = []
  $.ui.invalidate('ui.render')
}

const runsOf = <T,>(items: T[], same: (a: T, b: T) => boolean): { first: T; last: T; count: number }[] => {
  const runs: { first: T; last: T; count: number }[] = []
  for (const item of items) {
    const run = runs[runs.length - 1]
    if (run && same(run.last, item)) {
      run.last = item
      run.count++
    } else {
      runs.push({ first: item, last: item, count: 1 })
    }
  }
  return runs
}

// append only the lines entries not shown yet, oldest first
const appendLines = async ($: EngineInterface, items: { name?: string }[]): Promise<number> => {
  const fresh = items.slice(linesSeen).flatMap(item => item.name === undefined ? [] : [{ name: item.name }])
  linesSeen = items.length
  if (fresh.length > 0) {
    for (const item of fresh) {
      await addItemToLatestSection($, item.name)
    }
    //await update($, lines, list => [...list, ...fresh])
    await $.ui.scroll({ in: PANE, to: 'end' })
    //await $.ui.scroll({ in: PANE2, to: 'end' })
  }
  return fresh.length
}

// The extjs-tools results are a prose line followed by one or more JSON
// objects, so take the last object that parses rather than the first brace.
export function lastJson(text: string | undefined): Record<string, unknown> | undefined {
  if (!text) return undefined
  const end = text.lastIndexOf('}')
  if (end < 0) return undefined
  let found: Record<string, unknown> | undefined
  let tries = 0
  for (let i = text.indexOf('{'); i >= 0 && i <= end && tries < 60; i = text.indexOf('{', i + 1)) {
    tries++
    try {
      const value: unknown = JSON.parse(text.slice(i, end + 1))
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        found = value as Record<string, unknown>
        break
      }
    } catch {
      // not an object boundary; try the next brace
    }
  }
  return found
}

export function absorb(tool: string, text: string | undefined, prev: UpgradeRun): UpgradeRun {
  if (tool === 'sencha-stop') return { ...prev, serverUrl: undefined }
  if (tool === 'sencha-web-start' || tool === 'sencha-app-watch') {
    const url = (text ?? '').match(/https?:\/\/[^\s"']+/)
    return { ...prev, serverUrl: url ? url[0] : prev.serverUrl }
  }
  const d = lastJson(text)
  if (!d) return prev
  const lint = (d.content && typeof d.content === 'object' ? d.content : d) as Record<string, unknown>
  return {
    ...prev,
    projectType: str(d.projectType) ?? prev.projectType,
    toolkit: str(d.toolkit) ?? prev.toolkit,
    theme: str(d.theme) ?? prev.theme,
    sourceVersion: str(d.sourceVersion) ?? prev.sourceVersion,
    sourceRoot: str(d.sourceRoot) ?? str(d.sourceFolderPath) ?? prev.sourceRoot,
    targetRoot: str(d.targetRoot) ?? prev.targetRoot,
    lintFolders: num(lint.foldersProcessed) ?? prev.lintFolders,
    lintFilesFixed: num(lint.filesFixed) ?? prev.lintFilesFixed,
    lintFoldersFailed: num(lint.foldersFailed) ?? prev.lintFoldersFailed,
  }
}

// The one argument that says what a built-in call is about: the file, folder,
// command or query the tool acts on, for the pane's TOOL CALLS rows.
export function subjectOf(e: ToolCallInput): string | undefined {
  switch (e.tool) {
    case 'Bash':
      return e.command
    case 'Read':
    case 'Edit':
    case 'Write':
      return e.file_path
    case 'NotebookEdit':
      return e.notebook_path
    case 'ToolSearch':
    case 'WebSearch':
      return e.query
    case 'WebFetch':
      return e.url
    default:
      return undefined
  }
}

const dataFor = ($: Parameters<Hook<'ui.render'>>[0], e: { component: string; props: any }) => {
  //const dataFor = ($: Parameters<Hook<'ui.render'>>[0], e: { component: string; props: { text?: string; word?: string; hint?: string; } }) => {
  if (e.component === 'zzzCommandOutput') {
    $.ui.log(`renderMessage: ${JSON.stringify(e, null, 2)}`)
  }
  switch (e.component) {
    case 'ToolResult': return { label: 'Tool Result', text: `${e.props.tool}\n${e.props.output}`, showNext: false, marginTop: 0 }
    case 'AbovePrompt': return { label: 'Above', text: e.props.bodyColumns, showNext: true, marginTop: 0 }
    case 'PromptHint': return { label: 'Hint', text: e.props.hint, showNext: false, marginTop: 0 }
    case 'UserMessage': return { label: 'Prompt', text: e.props.text?.trimEnd(), showNext: false, marginTop: 0 }
    case 'ToolUse': return { label: 'Tool Use', text: e.props.output, showNext: false, marginTop: 0 }
    case 'ToolGroup': return { label: 'Tool Group', text: e.props.text, showNext: true, marginTop: 0 }
    case 'AssistantMessage': return { label: 'Message', text: e.props.text?.trimEnd(), showNext: true, marginTop: 0 }
    case 'CommandOutput': return { label: 'Output', text: e.props.text, showNext: false, marginTop: 0 }
    case 'Spinner': return { label: 'Spinner', text: e.props.word, showNext: true, marginTop: 0 }
    case 'SessionMode': return { label: 'Session Mode', text: '', showNext: true, marginTop: 0 }
    case 'InfoNotice': return { label: 'Notice', text: e.props.text, showNext: true, marginTop: 0 }
    case 'TurnDuration': return { label: 'Time', text: e.props.durationMs + 'ms', showNext: true, marginTop: 0 }
    default: return { label: e.component, text: e.props.text, showNext: true, marginTop: 0 }
  }
}

//const renderMessage = async ($: Parameters<Hook<'ui.render'>>[0], e: RenderInput<'UserMessage' | 'AssistantMessage'>) => {
//const renderMessage = async ($: Parameters<Hook<'ui.render'>>[0], e: RenderInput<any>, next: Parameters<Hook<'ui.render'>>[2]) => {
const renderMessage = async ($: Parameters<Hook<'ui.render'>>[0], e: RenderInput<any>, next: any) => {
  const { label, text, showNext, marginTop } = dataFor($, e)
  //$.ui.log(`renderMessage: ${e.component} ${label} ${text} ${showNext}`)
  const beneath = await next(e)
  //return beneath
  //<Text color="rgb(25,63,88)" backgroundColor="rgb(5,6,5)"  weight="bold" italic={true}>{labelFor(e.component)}:  </Text>

  if (e.surface !== 'terminal') {
    const { Box, Text, Svg } = $.ui.resolve(e)
    return (
      <Box flexDirection="row" alignItems="flex-start">
        <Box marginTop={0.5} flexShrink={0}>
          <Svg source={await $.fs.read(`${$.plugin.root}/${LOGO_SVG}`)} width={15} height={12} alt="Sencha" />
        </Box>
        <Box marginLeft={0.5} alignItems="flex-start">
          <Box flexDirection="row" alignItems="flex-start">
            <Box width={8} flexShrink={0} marginTop={0.04}>
              <Text color="cyan" bold italic>{label}:</Text>
            </Box>
            {!showNext && <Text color="rgb(145,186,76)" bold>{text}</Text>}
          </Box>
        </Box>
        {showNext && <Box marginLeft={0.0} marginTop={marginTop}>{beneath}</Box>}
      </Box>
    )
  }
  // terminal
  //$.ui.log(`$.plugin.root: ${$.plugin.root}/${LOGO_PNG}`)
  const { Box, Text } = $.ui.resolve(e)
  //const { base64 } = await $.fs.read(`${$.plugin.root}/${LOGO_PNG}`, { as: 'bytes' })
  //$.ui.log(`here`);

  let img
  if (e.surface === 'terminal') {
    const { Image } = $.ui.resolve(e)
    img = <Box><Image source={{ png: (await $.fs.read(`${$.plugin.root}/${LOGO_PNG}`, { as: 'bytes' })).base64 }} columns={2} rows={1} alt="S" /></Box>
  }


  return (
    <Box flexDirection="row" alignItems="flex-start" >
      <Box marginTop={1} width={12} flexShrink={0} >
        {img} <Text color="cyan" bold={true} italic={true}>{label}: </Text>
      </Box>
      {!showNext && <Box marginTop={1}><Text color="rgb(145,186,76)">{text}</Text></Box>}
      {showNext && beneath}
    </Box>
  )
}

// const doError = ($: any, e: any, next?: { error?: { kind?: string; message?: string } }) => {
//   const f = next?.error
//   const why = f ? ` (${f.kind}: ${f.message ?? ''})` : ''
//   $.ui.log(`error${why}: ${JSON.stringify(e)}`)
// }

export const register: Register = on => {
  let startedAt = 0
  let tools = 0
  let hasCommandMessage = false
  let isExtjsPrompt = false
  let isReExtPrompt = false

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

    const version = await versionString($)
    //await update($, messages, list => [...list, { title: 'session.start: ', message: `version: ${version}, time: ${new Date().toLocaleString()}` }]);
    await addSection($, 'session.start', `${await versionString($)} At ${new Date().toLocaleString()}`)
    return next(e)
  }).catch(($, e, next) => { doError($, e); return next(e) });

  // on('ui.open', async ($, e, next) => {
  //   $.ui.log(`ui.open: ${await versionString($)} At ${new Date().toLocaleString()}`)
  //   return next(e)
  // }).catch(($, e, next) => { doError($, e); return next(e) });

  // on('ui.log', ($, e, next) => {
  //  //     const { Box, Text } = $.ui.resolve(e)
  //   // documented rewrite: keep the line off screen (debug log only)

  //   // return (
  //   //   <Box>
  //   //     <Text>Hello there</Text>
  //   //   </Box>
  //   // )

  //   return next({ ...e, to: "debug" })
  // })

  on('ui.close', async ($, e, next) => {
    //await update($, messages, list => [...list, { title: 'ui.close', message: JSON.stringify(e, null, spaces) }]);
    const message = JSON.stringify(e, null, spaces)
    await addSection($, 'ui.close', message)

    if (e.id !== PANE) return next(e)
    //isPaneOpen = false
    return next(e)
  }).catch(($, e, next) => { doError($, e); return next(e) });

  on('ui.press', async ($, e, next) => {
    //await update($, messages, list => [...list, { title: 'ui.press', message: JSON.stringify(e, null, spaces) }]);
    if (e.plugin !== $.plugin.name || e.requestId !== PANE) return next(e)
    if (e.element === 'close') await $.ui.close({ id: PANE }).catch(() => undefined)
    return next(e)
  }).catch(($, e, next) => { doError($, e); return next(e) });

  on('session.end', async ($, e, next) => {
    await update($, messages, list => [...list, { title: 'session.end', message: JSON.stringify(e, null, spaces) }]);
    // /clear starts a new conversation in the same process: its cache is a new one
    if (e.reason === 'clear') {
      // samples = []
      // lastKey = ''
      // toastedFor = 0
      // observed = .log
      // ttl = baseTtl
      // ttlSource = envSource
      $.ui.invalidate('ui.render')
      return next(e)
    }
    //timer?.cancel()
    //timer = undefined
    return next(e)
  }).catch(($, e, next) => { doError($, e); return next(e) });

  on('command.run', { command: 'sencha' }, async $ => {
    //await update($, messages, list => [...list, { title: 'command.run', message: `command 'sencha' executed.` }]);
    const message = `command 'sencha' executed.`
    await addSection($, 'command.run', message)
    // No surface attached (bare -p run): ui.open may never settle, so check first
    if ((await $.session.surfaces()).length === 0) {
      return { text: 'Sencha pane could not open: no surface is attached' }
    }
    try {
      const opened = await $.ui.open({ id: PANE, title: 'Sencha', focus: true })
      if (!opened.isPlaced) return { text: `Sencha pane waiting: ${opened.reason}` }
    } catch {
      return { text: 'Sencha pane could not open: no surface is attached' }
    }
    return { text: 'Sencha pane opened' }
  }).catch(($, e, next) => { doError($, e); return next(e) });

  on('command.run', { command: 'callit' }, async ($, e, next) => {
    await update($, lines, () => [])
    await update($, steps, () => [])
    await update($, messages, () => [])

    //let stop = false;
    //let message = 'done';
    //let out: any;

    const extjsInitializeWithSenchaCmdTool = `mcp__plugin_sencha_extjs-tools__extjs-initialize-with-sencha-cmd`; const name3 = 'extjs-initialize-with-sencha-cmd';
    const args: any = { tool: extjsInitializeWithSenchaCmdTool, rootPath: '/Users/demo/upgrade/run/ext42runClaude' }
    $.tool.call(args).then(async extjsInitializeWithSenchaCmdResult => {
      //out = next(e).then(async extjsInitializeWithSenchaCmdResult => {
      //await update($, messages, list => [...list, { title: 'extjsInitializeWithSenchaCmdResult', message: JSON.stringify(extjsInitializeWithSenchaCmdResult, null, spaces) }]);
      if (extjsInitializeWithSenchaCmdResult.deny) {
        //message = JSON.stringify(extjsInitializeWithSenchaCmdResult)
        //stop = true;
      }
    })
    return { text: 'running' }
  }).catch(($, e, next) => { doError($, e); return next(e) });

  on('command.run', { command: 'ask' }, async ($, e, next) => {
    const tool = `mcp__plugin_sencha_extjs-tools__test-global-set`; const name = 'test-global-set';
    const value = 'hello'
    const { decision } = await $.tool.check({ tool, input: { name, value } })
    //$.ui.log(`decision ${decision}`)
    if (decision !== 'allow') {
      const answer = await $.ui.ask(`SET Allow ${name} with value '${value}'?`, ['Yes', 'No'])
      if (answer !== 'Yes') return { text: 'ask cancelled' }
    }
    const out = await next(e)
    return { ...out, text: JSON.stringify({ text: 'polling done' }) }
  }).catch(($, e, next) => { doError($, e); return next(e) });

  on('prompt.submit', async ($, e, next) => {
    //await update($, messages, list => [...list, { title: 'prompt.submit', message: JSON.stringify(e, null, spaces) }]);

    //await update($, messages, list => [...list, { title: 'prompt.submit: ', message: e.text }]);
    await addSection($, 'prompt.submit', e.text)
    //await addItemToLatestSection($, await versionString($))

    //$.ui.status(`status: Started At ${startedAt}`)
    //$.ui.toast(`toast: Started At ${startedAt}`)
    //$.ui.log(`log: Started At ${startedAt}`)
    return next(e)
  }).catch(($, e, next) => { doError($, e); return next(e) });

  on('turn.start', async ($, e, next) => {
    //await update($, messages, list => [...list, { title: 'turn.start', message: JSON.stringify(e, null, spaces) }]);
    const begin = e.text.indexOf('<command-message>')
    const end = e.text.indexOf('</command-message>')
    hasCommandMessage = begin >= 0 && end > begin
    const inner = hasCommandMessage ? e.text.slice(begin + 17, end).trim() : ''
    isExtjsPrompt = inner.startsWith('extjs')
    isReExtPrompt = inner.startsWith('reext')

    //await update($, messages, list => [...list, { title: 'turn.start: ', message: `hasCommandMessage: ${String(hasCommandMessage)} · isExtjsProject: ${String(isExtjsPrompt)} · isReExtPrompt: ${String(isReExtPrompt)} · commandMessage: ${JSON.stringify(inner.slice(0, 60))}` }]);
    const message = `hasCommandMessage: ${String(hasCommandMessage)} · isExtjsProject: ${String(isExtjsPrompt)} · isReExtPrompt: ${String(isReExtPrompt)} · commandMessage: ${inner.slice(0, 60)}`
    //await update($, messages, list => [...list, { title: 'turn.start: ', message: message }]);
    await addSection($, 'turn.start', message)
    //await addItemToLatestSection($, await versionString($))

    startedAt = await $.clock.now()
    tools = 0
    return next(e)
  }).catch(($, e, next) => { doError($, e); return next(e) });

  on('turn.step', async function* ($, e, next) {
    yield* next(e);
  }).catch(async function* ($, e, next) {
    doError($, e, next);
    yield* next(e);
  });

  on('turn.complete', async ($, e, next) => {
    //await update($, messages, list => [...list, { title: 'turn.complete', message: JSON.stringify(e, null, spaces) }]);
    const seconds = Math.round(((await $.clock.now()) - startedAt) / 1000)
    const dur = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
    const turn: Turn = { seconds, tools }
    //await update($, messages, list => [...list, { title: 'turn.complete', message: JSON.stringify({ usage: e.usage, seconds, tools }, null, spaces) }]);
    const message = `time: ${dur}`;
    //await update($, messages, list => [...list, { title: 'turn.complete: ', message: message }]);
    await addSection($, 'turn.complete', message)
    //await addItemToLatestSection($, await versionString($))


    const result = await next(e)
    return result;
    //return { ...result, text: `That turn took ${seconds}s` }
  }).catch(($, e, next) => { doError($, e); return next(e) });

  on('tool.call', async ($, e, next) => {
    // run tool mcp__plugin_sencha_extjs-tools__extjs-initialize-with-sencha-cmd rootPath='/Users/demo/upgrade/run/ext42run
    let stop = false;
    let message = 'done';
    let out: any;

    const message2 = ' '
    //await update($, messages, list => [...list, { title: 'tool.call', message: message2 }]);
    //await addItemToLatestSection($, await versionString($))

    //await update($, messages, list => [...list, { title: 'tool.call', message: JSON.stringify(e, null, spaces) }]);
    //await update($, messages, list => [...list, { title: 'tool.call', message: tool_use_id }]);
    //if (!e.tool.startsWith(PREFIX)) return next(e)
    const id = e.tool_use_id ?? `${e.tool}-${Math.random()}`
    const tool = e.tool.slice(e.tool.lastIndexOf('_') + 1)
    const subject = subjectOf(e)
    //const sectionId = await addSection($, tool, message2, { status: 'runs', subject })
    const sectionId = await addSection($, 'tool.call', e.tool + message2, { status: 'runs' })
    // the detail is a row of its own under the tool name, not an inline detail
    if (subject) await addItemToLatestSection($, subject)
    //await update($, steps, list => [...list, { id, tool, subject, status: 'runs' as const }].slice(-60))

    if (e.tool === 'mcp__plugin_sencha_extjs-tools__extjs-initialize-with-sencha-cmd') {
      // await $.ui.open({ id: PANE2, title: 'extjs-initialize-with-sencha-cmd', focus: true }).catch((error) => {
      //   $.ui.log(`extjs-initialize-with-sencha-cmd.ERROR: ${error.toString()}`)
      // })

      //await addSection($, 'Aextjs-initialize-with-sencha-cmd')

      out = next(e).then(async extjsInitializeWithSenchaCmdResult => {
        //await update($, messages, list => [...list, { title: 'extjsInitializeWithSenchaCmdResult', message: JSON.stringify(extjsInitializeWithSenchaCmdResult, null, spaces) }]);
        const message3 = JSON.stringify({ deny: extjsInitializeWithSenchaCmdResult.deny }, null, spaces)
        //await update($, messages, list => [...list, { title: 'extjsInitializeWithSenchaCmdResult', message: message3 }]);
        //await addSection($, 'extjsInitializeWithSenchaCmdResult', message3)
        //await addItemToLatestSection($, await versionString($))

        if (extjsInitializeWithSenchaCmdResult.deny) {
          message = JSON.stringify(extjsInitializeWithSenchaCmdResult)
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

      //$.ui.log(`extjs-initialize-with-sencha-cmd done`)
      // await $.ui.open({ id: PANE, title: 'Sencha', focus: true }).catch((error) => {
      //   $.ui.log(`extjs-initialize-with-sencha-cmd.ERROR: ${error.toString()}`)
      // })

    }
    else {
      out = await next(e)
    }
    // const testGlobalGetTool = `mcp__plugin_sencha_extjs-tools__test-global-get`; const testGlobalGetName = 'test-global-get';
    // while (!stop) {
    //   const testGlobalGetResult: any = await $.tool.call({ tool: testGlobalGetTool, name: testGlobalGetName })
    //   //$.ui.log(`testGlobalGetResult ${JSON.stringify(testGlobalGetResult)}`)
    //   let textJson = JSON.parse(testGlobalGetResult.result[0].text)
    //   let data = textJson.data;
    //   await appendLines($, data as { name: string }[])
    //   if (JSON.stringify(textJson).includes('polling done')) stop = true
    //   await $.clock.sleep(500)
    // }

    const failed = out != null && typeof out.then !== 'function' && (out.isError === true || out.deny !== undefined)
    await update($, steps, list => list.map(s => (s.id === id ? { ...s, status: failed ? 'fail' as const : 'done' as const } : s)))
    setSectionStatus($, sectionId, failed ? 'fail' : 'done')
    return out;
    //return { ...out, text: message }

    // //$.ui.log(`tool: ${tool}`)
    // // example: pin a note to this tool call's row (undefined clears it)
    // //$.ui.notice(id, `${tool} running`)

    // const subject = subjectOf(e)
    // await update($, steps, list => [...list, { id: e.tool, tool, subject, status: 'runs' as const }].slice(-60))

    // if (e.tool === 'mcp__plugin_sencha_extjs-tools__sencha-generate-app') {
    //   return { text: 'sencha-generate-app' }
    // }
    // else {
    //   const ran: any = await next(e)
    //   return ran
    // }
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
  //on('ui.render', { component: 'Spinner' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
  //on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
  on('ui.render', { component: 'AskUserQuestion' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
  on('ui.render', { component: 'CommandOutput' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
  //on('ui.render', { component: 'InfoNotice' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
  //on('ui.render', { component: 'Pane' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
  //on('ui.render', { component: 'SessionMode' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
  //on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
  on('ui.render', { component: 'ToolProgress' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
  //on('ui.render', { component: 'ToolResult' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
  //on('ui.render', { component: 'ToolUse' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => renderMessage($, e, next)).catch(($, e, next) => { doError($, e); return next(e) });
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
    if (e.element === 'toggle-all') {
      const data = e.data as { press?: boolean; over?: boolean }
      if (data?.over === true) {
        $.ui.status('Expand All / Collapse All: toggles every section')
      }
      if (data?.over === false) {
        $.ui.status(undefined)
      }
      if (data?.press === true) {
        const all = sections.length > 0 && sections.every(s => s.expanded)
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
        sections = sections.map(s => (s.id === section ? { ...s, expanded: open } : s))
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
    // // Log placement only when it changes, not on every render
    // const placement = (e.props as { placement?: string }).placement ?? 'unknown'
    // //if (placement !== lastPlacement) {
    //   lastPlacement = placement
    //   $.ui.log(`ui.render Pane placement: ${placement}, bodyColumns: ${(e.props as { bodyColumns?: number }).bodyColumns ?? 'n/a'}`)
    // //}
    const r: UpgradeRun = await read($, run)
    const list: UpgradeStep[] = await read($, steps)
    const feed: Message[] = await read($, messages)
    const linesEntries: { name: string }[] = await read($, lines)
    const historyEntries: Message[] = await read($, history)
    const facts: { k: string; v: string; color?: string }[] = []
    if (r.projectType) {
      facts.push({
        k: 'Project Type: ',
        v: [r.projectType, r.toolkit && `Toolkit:  ${r.toolkit}`, `Theme: ${r.theme}`].filter(Boolean).join(' · '),
      })
    }
    if (r.sourceVersion) facts.push({ k: 'Version', v: `${r.sourceVersion}  →  v8` })
    if (r.sourceRoot) facts.push({ k: 'Source', v: tail(r.sourceRoot) })
    if (r.targetRoot) facts.push({ k: 'Target', v: tail(r.targetRoot) })
    if (r.lintFolders !== undefined) {
      const bad = (r.lintFoldersFailed ?? 0) > 0
      facts.push({
        k: 'Lint',
        v: `${r.lintFolders} folders · ${r.lintFilesFixed ?? 0} fixed · ${r.lintFoldersFailed ?? 0} failed`,
        color: bad ? 'error' : 'success',
      })
    }
    facts.push({
      k: 'Server',
      v: r.serverUrl ?? 'stopped',
      color: r.serverUrl ? 'success' : undefined,
    })

    let version =
      <Text color="cyan" italic>{await versionString($)}</Text>

    const allExpanded = sections.length > 0 && sections.every(s => s.expanded)
    const buttons = (Client: any) => (
      <Box flexDirection="row" marginTop={1}>
        <Box marginRight={1}><Client key="clear-top" module="./components/button.tsx" props={{ id: 'clear-top', label: 'clear', dim: false } satisfies ButtonProps} /></Box>
        <Box marginRight={1}><Client key="close-top" module="./components/button.tsx" props={{ id: 'close-top', label: 'close', dim: false } satisfies ButtonProps} /></Box>
        <Box marginRight={1}><Client key="toggle-all" module="./components/button.tsx" props={{ id: 'toggle-all', label: allExpanded ? 'Collapse All' : 'Expand All', dim: false } satisfies ButtonProps} /></Box>
        <Box marginRight={1}><Client key="add-section" module="./components/button.tsx" props={{ id: 'add-section', label: 'Add Section', dim: false } satisfies ButtonProps} /></Box>
        <Box marginRight={1}><Client key="add-item-latest" module="./components/button.tsx" props={{ id: 'add-item-latest', label: 'Add Item to Latest Section', dim: false } satisfies ButtonProps} /></Box>
        <Box marginRight={1}><Client key="run-test" module="./components/button.tsx" props={{ id: 'run-test', label: 'Test', dim: false } satisfies ButtonProps} /></Box>

        {/* <Box borderStyle='single' marginLeft={2} paddingX={1} paddingY={0}>
          <Button plain={true} key="pane2" label="Initialize with Cmd" onPress={async () => {
            await $.ui.open({ id: PANE2, title: 'Initialize with Cmd', focus: true }).catch((error) => {
              $.ui.log(`pane2.ERROR: ${error.toString()}`)
            })
          }} />
        </Box> */}
      </Box>
    )

    const bottom = (Client: any) => (
      <Box flexDirection="row" marginTop={1}>
        <Box marginRight={1}>
          <Client key="clear-bottom" module="./components/button.tsx" props={{ id: 'clear-bottom', label: 'clear', dim: false } satisfies ButtonProps} />
        </Box>
        <Box marginRight={1}>
          <Client key="close-bottom" module="./components/button.tsx" props={{ id: 'close-bottom', label: 'close', dim: false } satisfies ButtonProps} />
        </Box>
      </Box>
    )

    // // one row per run of identical tool calls and steps
    // const listRuns = runsOf(list, (a, b) => a.tool === b.tool && a.subject === b.subject)
    // const feedRuns = runsOf(feed, (a, b) => a.title === b.title && a.message === b.message)

    let body =
      <Box flexDirection="column">
        <Box marginTop={2}><Text color="yellow" italic>FACTS</Text></Box>
        {
          facts.map(f => (
            <Text key={`k-${f.k}`} color={f.color}>
              {`${f.k.padEnd(8)}${f.v}`}
            </Text>
          ))
        }

        {/* <Box marginTop={2}><Text color="yellow" italic>LINES</Text></Box>
        {
          linesEntries.length === 0 ? (
            <Text dimColor>No lines yet.</Text>
          ) : (
            linesEntries.map((l, i) => (
              <Text key={`line${i}`}>
                <Text color="cyan">{l.name}</Text>
              </Text>
            ))
          )
        } */}

        {/* <Box marginTop={2}><Text color="yellow" italic>HISTORY</Text></Box>
        {
          historyEntries.length === 0 ? (
            <Text dimColor>No history yet.</Text>
          ) : (
            historyEntries.map((s, i) => (
              <Text key={`step${i}`}>
                <Text color="cyan">{s.title}</Text>
                <Text dimColor> {s.message} {JSON.stringify(s)}</Text>
              </Text>
            ))
          )
        } */}

        {/* <Box marginTop={2}><Text color="yellow" italic>TOOL CALLS</Text></Box>
        {
          listRuns.length === 0 ? (
            <Text dimColor>No tool calls yet.</Text>
          ) : (
            listRuns.map(run => {
              const s = run.last
              const statusColor = s.status === 'fail' ? 'error' : s.status === 'done' ? 'success' : 'warning'
              return (
                <Box key={run.first.id} flexDirection="row" alignItems="flex-start">
                  <Box width={2} flexShrink={0}>
                    <Text color={statusColor}>
                      {s.status === 'runs' ? '•' : s.status === 'done' ? '✓' : '✗'}
                    </Text>
                  </Box>
                  <Box width={10} flexShrink={0}>
                    <Text color="cyan" wrap="truncate">tool call</Text>
                  </Box>
                  <Box width={34} flexShrink={0}>
                    <Text color={statusColor} wrap="truncate">
                      {s.tool}
                      {run.count > 1 ? <Text dimColor>{` (${run.count})`}</Text> : null}
                    </Text>
                  </Box>
                  {s.subject ? <Text color={statusColor} dimColor wrap="truncate">{` · ${tail(s.subject, 1280)}`}</Text> : null}
                </Box>
              )
            })
          )
        } */}

        {/* <Box marginTop={2}><Text color="yellow" italic>STEPS</Text></Box>
        {
          feed.length === 0 ? (
            <Text dimColor>No steps yet.</Text>
          ) : (
            feedRuns.map((run, i) => (
              <Text key={`step${i}`}>
                <Text color="cyan">{run.last.title}</Text>
                {run.count > 1 ? <Text dimColor>{` (${run.count})`}</Text> : null}
                <Text dimColor> {run.last.message}</Text>
              </Text>
            ))
          )
        } */}

      </Box>;

    //if (e.surface !== 'terminal' && e.surface !== 'vscode' && e.surface !== 'mobile') {
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
            <Box marginLeft={2}><Client key="header-test" module="./components/button.tsx" props={{ id: 'header-test', label: 'Test', dim: false } satisfies ButtonProps} /></Box>
          </Box>
          {buttons(Client)}
          {body}

          {/* <Box marginTop={1} marginBottom={1}>
            <Box marginRight={1}><Client key="toggle-all" module="./components/button.tsx" props={{ id: 'toggle-all', label: allExpanded ? 'Collapse All' : 'Expand All', dim: false } satisfies ButtonProps} /></Box>
            <Box marginRight={1}><Client key="add-section" module="./components/button.tsx" props={{ id: 'add-section', label: 'Add Section', dim: false } satisfies ButtonProps} /></Box>
            <Box marginRight={1}><Client key="add-item-latest" module="./components/button.tsx" props={{ id: 'add-item-latest', label: 'Add Item to Latest Section', dim: false } satisfies ButtonProps} /></Box>
            <Box marginRight={1}><Client key="run-test" module="./components/button.tsx" props={{ id: 'run-test', label: 'Test', dim: false } satisfies ButtonProps} /></Box>
          </Box> */}

          <Box marginTop={2}><Text color="yellow" italic>STEPS</Text></Box>
          {dropped.length > 0 ? <Box marginTop={1}><Text color="error">{`expander props: dropped ${dropped.join(', ')}`}</Text></Box> : null}
          <Client key="expander" module="./components/expander.tsx" props={expander satisfies ExpanderProps} />

          {bottom(Client)}
        </Box>
      )
    }

    // terminal surface
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
            <Box marginLeft={2}><Client key="header-test" module="./components/button.tsx" props={{ id: 'header-test', label: 'Test', dim: false } satisfies ButtonProps} /></Box>
          </Box>
          {buttons(Client)}
          {body}
          {dropped.length > 0 ? <Box marginTop={1}><Text color="error">{`expander props: dropped ${dropped.join(', ')}`}</Text></Box> : null}
          <Client key="expander" module="./components/expander.tsx" props={expander satisfies ExpanderProps} />
          {bottom(Client)}
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
