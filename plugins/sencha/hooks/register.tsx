import type { EngineInterface, Hook, Register, RenderInput, ToolCallInput, PaneOpenArgs } from 'claude-code'
import { atom, read, update } from 'claude-code'
import type { UpgradeRun, UpgradeStep, Message } from '../types'
import type { ButtonProps } from './button'


export type Turn = { seconds: number; tools: number }

const versionString = async ($: EngineInterface): Promise<string> => {
  try {
    const manifest = JSON.parse(await $.fs.read(`${$.plugin.root}/.claude-plugin/plugin.json`)) as { version?: unknown }
    return typeof manifest.version === 'string' ? `v${manifest.version}` : 'v?'
  } catch {
    return 'v?'
  }
}

const PANE = 'sencha'
const PANE2 = 'sencha2'
const PANETEST = 'senchatest'
//let lastPlacement = ''
const PREFIX = 'mcp__extjs-tools__'
const spaces = 0
const LOGO_SVG = 'assets/rapid.svg'
const LOGO_PNG = 'assets/rapid.png'

const tail = (p: string, max = 46) => (p.length > max ? '…' + p.slice(-(max - 1)) : p)
const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined)
const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined)
// Tool output that is not a JSON object yields {} instead of throwing
const parseObj = (text: string): Record<string, unknown> => {
  try {
    const value: unknown = JSON.parse(text)
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

const lines = atom({ plugin: 'sencha', key: 'lines' } as const, [] as { name: string }[])
const history = atom({ plugin: 'sencha', key: 'history' } as const, [] as Message[])
// history is append-only, so only entries past the count already shown are added
const historySeen = new Map<string, number>()
let linesSeen = 0
const run = atom({ plugin: 'sencha', key: 'run' } as const, {})
const steps = atom({ plugin: 'sencha', key: 'steps' } as const, [])
const messages = atom({ plugin: 'sencha', key: 'messages' } as const, [] as Message[])
//const last = atom({ plugin: 'turn-band', key: 'last' } as const, null)
//const isHidden = atom({ plugin: 'turn-band', key: 'isHidden' } as const, false)

// task-start puts the task JSON in block 0; task-get prepends a transcript
// string and leaves the JSON in a later block, so scan for the one that is a task
const taskOf = (res: any): Record<string, unknown> => {
  const blocks = Array.isArray(res?.result) ? res.result : res?.result?.content
  if (!Array.isArray(blocks)) return {}
  for (const block of blocks) {
    if (typeof block?.text !== 'string') continue
    const parsed = parseObj(block.text)
    if (typeof parsed.taskId === 'string' || Array.isArray(parsed.history)) return parsed
  }
  return {}
}

// append only the history entries not shown yet, oldest first
const appendHistory = async ($: EngineInterface, task: Record<string, unknown>): Promise<number> => {
  const id = str(task.taskId)
  if (id === undefined) return 0
  const entries = (Array.isArray(task.history) ? task.history : []) as { status?: unknown; message?: unknown }[]
  const name = str(task.taskName)
  const seen = historySeen.get(id) ?? 0
  const fresh = entries.slice(seen).map(entry => ({ name, title: str(entry.status) ?? 'task', message: str(entry.message) ?? '' }))
  historySeen.set(id, entries.length)
  if (fresh.length > 0) await update($, history, list => [...list, ...fresh])
  return fresh.length
}

// collapse consecutive equal items into one run: first and last item, and how many
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
    await update($, lines, list => [...list, ...fresh])
    await $.ui.scroll({ in: PANE2, to: 'end' })
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
              <Text color="cyan" weight="bold" italic>{label}:</Text>
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
        {img} <Text color="cyan" weight="bold" italic={true}>{label}: </Text>
      </Box>
      {!showNext && <Box marginTop={1}><Text color="rgb(145,186,76)" weight="regular">{text}</Text></Box>}
      {showNext && beneath}
    </Box>
  )
}

const doError = ($: any, e: any) => {
  $.ui.log(`error: ${JSON.stringify(e)}`)
}

export const register: Register = on => {
  let tool_use_id = ''
  let startedAt = 0
  let tools = 0
  let hasCommandMessage = false
  let isExtjsPrompt = false
  let isReExtPrompt = false
  let taskId: string | undefined
  // tasks the pane polls itself, and a guard so those polls skip the bookkeeping below
  const polling = new Set<string>()
  let internalToolCall = false

  //.catch(($, e, next) => next(e))

  // on('tool.call', async ($, e, next) => {
  //   const out = await next(e)
  //   return out;
  // }).catch(($, e, next) => next(e))

  // on('command.run', { command: 'test' }, async ($, e, next) => {
  //   const paneOpenArgs: PaneOpenArgs = {
  //     id: PANETEST,
  //     title: 'Test',
  //     //rows: 600,
  //     columns: 100,
  //     focus: true
  //   }
  //   await $.ui.open(paneOpenArgs).catch((error) => {
  //     $.ui.log(`PANETEST.ERROR: ${error.toString()}`)
  //   })
  //   const out = await next(e)
  //   return { ...out, text: JSON.stringify({ text: JSON.stringify(e) }) }
  // }).catch(($, e, next) => { doError($, e); return next(e) });

  // on('ui.render', { component: 'Pane', requestId: PANETEST }, async ($, e, next) => {
  //   if (e.surface !== 'terminal' && e.surface !== 'desktop') return next(e)
  //   const { Box, Text, Button, Client } = $.ui.resolve(e)
  //   const button = (b: ButtonProps) => <Client key={`button-${b.id}`} module="./button.tsx" props={{ id: b.id, label: b.label, dim: b.dim } satisfies ButtonProps} />
  //   let glyphSetting = 'auto'
  //   let noNerd = false
  //   const unicode = glyphSetting === 'plain' || (glyphSetting === 'auto' && (noNerd || e.surface === 'desktop'))
  //   const external = { id: 'external', label: unicode ? '↗' : '\u{f08e}', dim: true, hint: 'open in default app' }

  //   const name = "marc"
  //   const hint = (buttons: { id: string; hint: string }[], title: number) => {
  //     //const text = buttons.find(b => b.id === hovered)?.hint
  //     const text = 'the hint'
  //     if (!text) return null
  //     const room = e.props.bodyColumns - title - buttons.length * (e.surface === 'desktop' ? 3 : 2) - 2
  //     //eturn text.length <= room ? <Text color={theme.muted}>{`${text} `}</Text> : null
  //     return text.length <= room ? <Text color='cyan'>{`${text} `}</Text> : null
  //   }

  //   return (
  //     <Box flexDirection="row">
  //       <Text>test</Text>
  //       {hint([external], 8 + name.length)}
  //       {button(external)}
  //     </Box>
  //   )
  // }).catch(($, e, next) => { doError($, e); return next(e) });


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

  // on('ui.render', { component: 'ToolProgress' }, async ($, e, next) => {
  //   //if (e.requestId !== tool_use_id) return next(e)
  //   const { Box, Text } = $.ui.resolve(e)
  //   return Box({
  //     flexDirection: 'row',
  //     columnGap: 1,
  //     children: [
  //       Text({ color: 'cyan', children: ['⚡ Custom Progress:'] }),
  //       // Call next(e) to retain engine defaults, or return your own custom elements
  //       await next(e),
  //     ]
  //   });
  // })

  on('session.start', async ($, e, next) => {
    $.ui.log(`session.start: ${await versionString($)} At ${new Date().toLocaleString()}`, { to: "transcript" })
    $.ui.log(`session.start: ${await versionString($)} At ${new Date().toLocaleString()}`, { to: "debug" })
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
    await update($, messages, list => [...list, { title: 'session.start: ', message: `version: ${version}, time: ${new Date().toLocaleString()}` }]);
    return next(e)
  }).catch(($, e, next) => { doError($, e); return next(e) });

  // on('ui.open', async ($, e, next) => {
  //   $.ui.log(`ui.open: ${await versionString($)} At ${new Date().toLocaleString()}`)
  //   return next(e)
  // }).catch(($, e, next) => { doError($, e); return next(e) });

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

  on('command.run', { command: 'sencha' }, async $ => {
    await update($, messages, list => [...list, { title: 'command.run', message: `command 'sencha' executed.` }]);
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

  on('ui.close', async ($, e, next) => {
    await update($, messages, list => [...list, { title: 'ui.close', message: JSON.stringify(e, null, spaces) }]);
    if (e.id !== PANE) return next(e)
    //isPaneOpen = false
    return next(e)
  }).catch(($, e, next) => { doError($, e); return next(e) });

  on('ui.press', async ($, e, next) => {
    await update($, messages, list => [...list, { title: 'ui.press', message: JSON.stringify(e, null, spaces) }]);
    if (e.plugin !== $.plugin.name || e.requestId !== PANE) return next(e)
    if (e.element === 'close') await $.ui.close({ id: PANE }).catch(() => undefined)
    return next(e)
  }).catch(($, e, next) => { doError($, e); return next(e) });

  // on('skill.prompt', async ($, e, next) => {
  //   await update($, messages, l => [...l, { title: 'skill.prompt', message: e.skill }])
  //   return next(e)
  // }).catch(($, e, next) => { doError($, e); return next(e) });

  on('prompt.submit', async ($, e, next) => {
    //await update($, messages, list => [...list, { title: 'prompt.submit', message: JSON.stringify(e, null, spaces) }]);
    await update($, messages, list => [...list, { title: 'prompt.submit: ', message: e.text }]);
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
    await update($, messages, list => [...list, { title: 'turn.start: ', message: `hasCommandMessage: ${String(hasCommandMessage)} · isExtjsProject: ${String(isExtjsPrompt)} · isReExtPrompt: ${String(isReExtPrompt)} · commandMessage: ${inner.slice(0, 60)}` }]);
    startedAt = await $.clock.now()
    tools = 0
    return next(e)
  }).catch(($, e, next) => { doError($, e); return next(e) });

  on('turn.step', async function* ($, e, next) {
    yield* next(e);
  }).catch(async function* ($, e, next) {
    doError($, e);
    yield* next(e);
  });

  on('turn.complete', async ($, e, next) => {
    //await update($, messages, list => [...list, { title: 'turn.complete', message: JSON.stringify(e, null, spaces) }]);
    const seconds = Math.round(((await $.clock.now()) - startedAt) / 1000)
    const dur = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
    const turn: Turn = { seconds, tools }
    //await update($, messages, list => [...list, { title: 'turn.complete', message: JSON.stringify({ usage: e.usage, seconds, tools }, null, spaces) }]);
    await update($, messages, list => [...list, { title: 'turn.complete: ', message: `time: ${dur}` }]);
    const result = await next(e)
    return result;
    //return { ...result, text: `That turn took ${seconds}s` }
  }).catch(($, e, next) => { doError($, e); return next(e) });

  on('command.run', { command: 'callit' }, async ($, e, next) => {
    await update($, lines, () => [])
    await update($, steps, () => [])
    await update($, messages, () => [])

    let stop = false;
    let message = 'done';
    let out: any;

    // await $.ui.open({ id: PANE2, title: 'extjs-initialize-with-sencha-cmd', focus: true }).catch((error) => {
    //   $.ui.log(`extjs-initialize-with-sencha-cmd.ERROR: ${error.toString()}`)
    // })

    const extjsInitializeWithSenchaCmdTool = `mcp__plugin_sencha_extjs-tools__extjs-initialize-with-sencha-cmd`; const name3 = 'extjs-initialize-with-sencha-cmd';
    const args: any = { tool: extjsInitializeWithSenchaCmdTool, rootPath: '/Users/demo/upgrade/run/ext42runClaude' }
    out = $.tool.call(args).then(async extjsInitializeWithSenchaCmdResult => {
      //out = next(e).then(async extjsInitializeWithSenchaCmdResult => {
      await update($, messages, list => [...list, { title: 'extjsInitializeWithSenchaCmdResult', message: JSON.stringify(extjsInitializeWithSenchaCmdResult, null, spaces) }]);
      if (extjsInitializeWithSenchaCmdResult.deny) {
        message = JSON.stringify(extjsInitializeWithSenchaCmdResult)
        stop = true;
      }
    })

    return { text: 'running' }

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


    //     out = await next(e)
    // return { ...out, text: message }
    //await update($, steps, list => list.map(s => (s.id === id ? { ...s, status: 'done' as const } : s)))
    // return out;
    //return out;



    // const paneOpenArgs2: PaneOpenArgs = {
    //   id: PANE2,
    //   title: 'Initialize with Cmd',
    //   //rows: 600,
    //   columns: 300,
    //   focus: true
    // }
    // await $.ui.open(paneOpenArgs2).catch((error) => {
    //   $.ui.log(`session.start.ERROR: ${error.toString()}`)
    // })

    // let message = 'done';
    // let timer: { cancel: () => void } | undefined
    // await update($, messages, list => [...list, { title: 'command.run', message: JSON.stringify(e, null, spaces) }]);
    // //const senchaGenerateAppTool = `mcp__plugin_sencha_extjs-tools__sencha-generate-app`; const senchaGenerateAppName = 'sencha-generate-app';
    // //const args: any = { tool: senchaGenerateAppTool, cwd: '/Users/demo/upgrade/run', name: 'test01', toolkit: 'classic' }
    // const extjsInitializeWithSenchaCmdTool = `mcp__plugin_sencha_extjs-tools__extjs-initialize-with-sencha-cmd`; const name3 = 'extjs-initialize-with-sencha-cmd';
    // const args: any = { tool: extjsInitializeWithSenchaCmdTool, rootPath: '/Users/demo/upgrade/run/ext42run' }
    // $.tool.call(args).then(async extjsInitializeWithSenchaCmdResult => {
    //   await update($, messages, list => [...list, { title: 'extjsInitializeWithSenchaCmdResult', message: JSON.stringify(extjsInitializeWithSenchaCmdResult, null, spaces) }]);
    //   if (extjsInitializeWithSenchaCmdResult.deny) {
    //     message = JSON.stringify(extjsInitializeWithSenchaCmdResult)
    //     timer?.cancel()
    //   }
    // }).catch(error => $.ui.log(`init.ERROR: ${String(error)}`))

    // await update($, messages, list => [...list, { title: 'extjsInitializeWithSenchaCmdResult after', message: 'after' }]);

    // // poll on a clock interval: each tick is its own dispatch, so the hook returns inside its budget
    // const testGlobalGetTool = `mcp__plugin_sencha_extjs-tools__test-global-get`; const testGlobalGetName = 'test-global-get';
    // let busy = false
    // timer = $.clock.every(500, async () => {
    //   await update($, messages, list => [...list, { title: 'in timer', message: `busy ${busy}` }]);
    //   if (busy) return
    //   busy = true
    //   void (async () => {
    //     try {
    //       const testGlobalGetResult: any = await $.tool.call({ tool: testGlobalGetTool, name: testGlobalGetName })
    //       let textJson = JSON.parse(testGlobalGetResult.result[0].text)
    //       let data = textJson.data;
    //       await appendLines($, data as { name: string }[])
    //       if (JSON.stringify(textJson).includes('polling done')) timer?.cancel()
    //     } catch (error) {
    //       $.ui.log(`poll.ERROR: ${String(error)}`)
    //       timer?.cancel()
    //     } finally {
    //       busy = false
    //     }
    //   })()
    // })
    // const out = await next(e)
    // return { ...out, text: message }
  }).catch(($, e, next) => { doError($, e); return next(e) });

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

  on('tool.call', async ($, e, next) => {
    // run tool mcp__plugin_sencha_extjs-tools__extjs-initialize-with-sencha-cmd rootPath='/Users/demo/upgrade/run/ext42run
    let stop = false;
    let message = 'done';
    let out: any;
    await update($, messages, list => [...list, { title: 'tool.call', message: e.tool }]);
    //await update($, messages, list => [...list, { title: 'tool.call', message: JSON.stringify(e, null, spaces) }]);
    //await update($, messages, list => [...list, { title: 'tool.call', message: tool_use_id }]);
    //if (!e.tool.startsWith(PREFIX)) return next(e)
    const id = e.tool_use_id ?? `${e.tool}-${Math.random()}`
    const tool = e.tool.slice(e.tool.lastIndexOf('_') + 1)
    const subject = subjectOf(e)
    await update($, steps, list => [...list, { id, tool, subject, status: 'runs' as const }].slice(-60))

    if (e.tool === 'mcp__plugin_sencha_extjs-tools__extjs-initialize-with-sencha-cmd') {
      await $.ui.open({ id: PANE2, title: 'extjs-initialize-with-sencha-cmd', focus: true }).catch((error) => {
        $.ui.log(`extjs-initialize-with-sencha-cmd.ERROR: ${error.toString()}`)
      })
      out = next(e).then(async extjsInitializeWithSenchaCmdResult => {
        //await update($, messages, list => [...list, { title: 'extjsInitializeWithSenchaCmdResult', message: JSON.stringify(extjsInitializeWithSenchaCmdResult, null, spaces) }]);
        await update($, messages, list => [...list, { title: 'extjsInitializeWithSenchaCmdResult', message: JSON.stringify({ deny: extjsInitializeWithSenchaCmdResult.deny }, null, spaces) }]);
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
      await $.ui.open({ id: PANE, title: 'Sencha', focus: true }).catch((error) => {
        $.ui.log(`extjs-initialize-with-sencha-cmd.ERROR: ${error.toString()}`)
      })

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

    await update($, steps, list => list.map(s => (s.id === id ? { ...s, status: 'done' as const } : s)))
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





  // //$.ui.notice(id, undefined)
  // await update($, messages, list => [...list, { title: 'tool.call:ran', message: JSON.stringify(ran, null, spaces) }]);
  // if (tool === 'task-start' || tool === 'task-get') {
  //   const task = taskOf(ran)
  //   taskId = str(task.taskId) ?? taskId
  //   $.ui.log(`taskId: ${taskId}`)

  //   //if (taskId !== undefined && !polling.has(taskId)) {
  //   if (taskId !== undefined) {
  //     $.ui.log(`append: ${taskId}`)
  //     const added = await appendHistory($, task)
  //     if (added === 0) await update($, messages, list => [...list, { title: `history:${tool}`, message: `taskId: ${taskId} · entries: ${(task.history as unknown[] | undefined)?.length ?? 0}` }])
  //   }
  //   else {
  //     $.ui.log(`NO append: ${taskId}`)
  //   }
  //   // the model may not poll, so the pane polls the task itself until it ends
  //   if (tool === 'task-start' && taskId !== undefined && !polling.has(taskId)) {
  //     const name = e.tool.replace(/task-start$/, 'task-get')
  //     const pollId = taskId
  //     polling.add(pollId)
  //     const step = async (tries: number): Promise<void> => {
  //       if (tries <= 0 || !polling.has(pollId)) {
  //         polling.delete(pollId)
  //         return
  //       }
  //       internalToolCall = true
  //       let res: any
  //       try {
  //         res = await $.tool.call({ tool: name, taskId: pollId } as any)
  //       } finally {
  //         internalToolCall = false
  //       }
  //       const t = taskOf(res)
  //       const state = str(t.status)
  //       await appendHistory($, t)
  //       if (state === 'completed' || state === 'failed' || state === 'cancelled') {
  //         polling.delete(pollId)
  //         return
  //       }
  //       $.clock.after(2000, () => { void step(tries - 1) })
  //     }
  //     $.clock.after(2000, () => { void step(300) })
  //   }
  // }

  // //await update($, messages, list => [...list, { title: 'tool', message: `tool: ${tool}` }]);

  // // if (tool === 'job-status') {
  // //   const result = ran.result as Array<{ text?: string }> | undefined
  // //   const statusJson = parseObj(result?.[0]?.text ?? '') as { state?: string; percent?: number; message?: string }
  // //   //await update($, messages, list => [...list, { title: 'status', message: JSON.stringify(result?.[0]?.text, null, spaces) }]);
  // //   await update($, messages, list => [...list, { title: 'status', message: `${statusJson.state}: ${statusJson.percent}% - ${statusJson.message}` }]);
  // // }

  // // const blocks = ran.result as Array<{ text?: string }> | undefined
  // // const text = blocks?.[0]?.text ?? ''
  // // if (tool === 'task-start') {
  // //   // a start result that is not JSON keeps the previous task id
  // //   const started = parseObj(text)
  // //   taskId = str(started.taskId) ?? taskId
  // //   let statusMessage = str(started.statusMessage) ?? ''
  // //   await update($, status, list => [...list, { title: 'task-start', message: statusMessage }])
  // //   await update($, messages, list => [...list, { title: 'task-start', message: text }])
  // // }
  // // if (tool === 'task-get' && taskId !== undefined && (e as { taskId?: string }).taskId === taskId) {
  // //   let statusMessage = str(parseObj(text).statusMessage) ?? ''
  // //   await update($, status, list => [...list, { title: 'task-get', message: statusMessage }])
  // //   await update($, messages, list => [...list, { title: 'task-get', message: statusMessage }])
  // // }

  // const failed = ran.isError === true || ran.deny !== undefined
  // await update($, steps, list =>
  //   list.map(one => (one.id === id ? { ...one, status: failed ? ('fail' as const) : ('done' as const) } : one)),
  // )
  // if (!failed) await update($, run, prev => absorb(tool, ran.text, prev))
  // return ran
  // // Bookkeeping only: never let a pane failure change what the tool does.
  // }).catch(($, e, next) => next(e))

  // on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
  //   const ran = await next({ ...e, command: e.command.trim() })
  //   const hasFailed = ran.deny === undefined && ran.isError === true
  //   $.ui.status(hasFailed ? `failed: ${e.command.slice(0, 40)}` : undefined)
  //   return ran
  // })

  // // The matcher limits the hook to Bash calls, so e.command is the shell command
  // on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
  //   //if (/git push .*--force/.test(e.command)) {
  //   if (/ls/.test(e.command)) {
  //     // Returning without calling next answers the event, so the command never runs
  //     // return { deny: 'Force pushes are not allowed in this repository. Push to a new branch instead.' }
  //     return { deny: 'ls is not allowed.' }
  //   }
  //   // Every other command goes on to the permission check and then to Bash
  //   return next(e)
  // })

  // on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
  //   const RISKY = /\brm\s+-rf?\b|\bgit\s+reset\s+--hard\b|\bgit\s+push\b.*--force/

  //   // Let every other command through without a question
  //   if (!RISKY.test(e.command)) return next(e)
  //   // Start from the safe answer, so a question nobody answers refuses the command
  //   let answer = 'Refuse'
  //   try {
  //     // The tool call waits here until the user picks one of the two labels
  //     answer = await $.ui.ask('Run this command? ' + e.command, ['Run it', 'Refuse'])
  //   } catch {
  //     // The user dismissed the question, or this is a claude -p run with nobody to ask
  //   }
  //   if (answer !== 'Run it') {
  //     // Answer without calling next, so the command doesn't run
  //     return { deny: 'The user declined this command. Ask before trying a different approach.' }
  //   }
  //   return next(e)
  // })


  //     <Box flexDirection="column">
  //     <Box flexDirection="row">
  //       <Svg source={await $.fs.read(`${$.plugin.root}/${LOGO_SVG}`)} width={25} height={25} alt="Sencha" />
  //       <Box marginLeft={2}><Text color="yellow" italic>Sencha</Text></Box>
  //       <Box marginLeft={2}>{version}</Box>
  //       <Box marginLeft={2}><Text color="yellow" italic>{new Date().toLocaleString()}</Text></Box>
  //     </Box>
  //     {buttons}
  //     {body}
  //     {bottom}
  //   </Box>
  // )


  on('ui.render', { component: 'Pane', requestId: PANE2 }, async ($, e) => {
    const linesEntries: { name: string }[] = await read($, lines)
    const { Box, Text, Button } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">

        <Box marginTop={2}><Text color="yellow" italic>LINES</Text></Box>
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
        }
      </Box>
    )
  }).catch(($, e, next) => { doError($, e); return next(e) });

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
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

    let buttons =
      <Box flexDirection="row" marginTop={1}>
        <Box borderStyle='single' marginLeft={0} paddingX={1} paddingY={0}>
          <Button plain={true} key="clear" label="clear" onPress={async () => {
            //$.ui.log(`clear: At ${new Date().toLocaleString()}`)
            await update($, run, () => ({}))
            await update($, steps, () => [])
            await update($, messages, () => [])
            await update($, history, () => [])
            await update($, lines, () => [])
            linesSeen = 0
          }}></Button>
        </Box>
        <Box borderStyle='single' marginLeft={2} paddingX={1} paddingY={0}>
          <Button plain={true} key="close" label="close" onPress={() => { }} />
        </Box>
        <Box borderStyle='single' marginLeft={2} paddingX={1} paddingY={0}>
          <Button plain={true} key="pane2" label="Initialize with Cmd" onPress={async () => {
            await $.ui.open({ id: PANE2, title: 'Initialize with Cmd', focus: true }).catch((error) => {
              $.ui.log(`pane2.ERROR: ${error.toString()}`)
            })
          }} />
        </Box>
      </Box>;

    // one row per run of identical tool calls and steps
    const listRuns = runsOf(list, (a, b) => a.tool === b.tool && a.subject === b.subject)
    const feedRuns = runsOf(feed, (a, b) => a.title === b.title && a.message === b.message)

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

        <Box marginTop={2}><Text color="yellow" italic>TOOL CALLS</Text></Box>
        {
          listRuns.length === 0 ? (
            <Text dimColor>No tool calls yet.</Text>
          ) : (
            listRuns.map(run => {
              const s = run.last
              return (
                <Box key={run.first.id} flexDirection="row" alignItems="flex-start">
                  <Box width={2} flexShrink={0}>
                    <Text color={s.status === 'fail' ? 'error' : s.status === 'done' ? 'success' : 'warning'}>
                      {s.status === 'runs' ? '•' : s.status === 'done' ? '✓' : '✗'}
                    </Text>
                  </Box>
                  <Text color={s.status === 'fail' ? 'error' : s.status === 'done' ? 'success' : 'warning'}>
                    {s.tool}
                    {run.count > 1 ? <Text dimColor>{` (${run.count})`}</Text> : null}
                    {s.subject ? <Text dimColor>{` · ${tail(s.subject, 1280)}`}</Text> : null}
                  </Text>
                </Box>
              )
            })
          )
        }
        <Box marginTop={2}><Text color="yellow" italic>STEPS</Text></Box>
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
        }
      </Box>;

    let bottom =
      <Box flexDirection="row" marginTop={1}>
        <Box borderStyle='single' marginLeft={0} paddingX={1} paddingY={0}>
          <Button plain={true} key="clear" label="clear" onPress={async () => {
            //$.ui.log(`clear: At ${new Date().toLocaleString()}`)
            await update($, run, () => ({}))
            await update($, steps, () => [])
            await update($, messages, () => [])
            await update($, history, () => [])
            await update($, lines, () => [])
            linesSeen = 0
          }}></Button>
        </Box>
        <Box borderStyle='single' marginLeft={2} paddingX={1} paddingY={0}>
          <Button plain={true} key="close" label="close" onPress={() => { }} />
        </Box>
      </Box>;

    if (e.surface !== 'terminal') {
      const { Box, Text, Svg } = $.ui.resolve(e)
      return (
        <Box flexDirection="column">
          <Box flexDirection="row">
            <Svg source={await $.fs.read(`${$.plugin.root}/${LOGO_SVG}`)} width={25} height={25} alt="Sencha" />
            <Box marginLeft={2}><Text color="yellow" italic>Sencha</Text></Box>
            <Box marginLeft={2}>{version}</Box>
            <Box marginLeft={2}><Text color="yellow" italic>{new Date().toLocaleString()}</Text></Box>
          </Box>
          {buttons}
          {body}
          {bottom}
        </Box>
      )
    }

    // terminal surface
    const { Image } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        <Box flexDirection="row">
          <Box><Image source={{ png: (await $.fs.read(`${$.plugin.root}/${LOGO_PNG}`, { as: 'bytes' })).base64 }} columns={2} rows={1} alt="Sencha" /></Box>
          <Box marginLeft={2}>{version}</Box>
          <Box marginLeft={2}><Text color="yellow" italic>{new Date().toLocaleString()}</Text></Box>
        </Box>
        {buttons}
        {body}
        {bottom}
      </Box>
    )
  }).catch(($, e, next) => { doError($, e); return next(e) });
}
