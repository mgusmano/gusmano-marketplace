import type { EngineInterface, Hook, RenderInput, ToolCallInput } from 'claude-code'
import { addItemToLatestSection, resetSections } from './sections'
export const LOGO_SVG = 'assets/rapid.svg'
export const LOGO_PNG = 'assets/rapid.png'

//$.ui.status(`status: Started At ${startedAt}`)
//$.ui.toast(`toast: Started At ${startedAt}`)
//$.ui.log(`log: Started At ${startedAt}`)

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

export async function versionString($: EngineInterface): Promise<string> {
  try {
    const manifest = JSON.parse(await $.fs.read(`${$.plugin.root}/.claude-plugin/plugin.json`)) as { version?: unknown }
    return typeof manifest.version === 'string' ? `v${manifest.version}` : 'v?'
  } catch {
    return 'v?'
  }
}

export function doError($: any, e: any, next?: { error?: { kind?: string; message?: string } }) {
  const f = next?.error
  const why = f ? ` (${f.kind}: ${f.message ?? ''})` : ''
  // JSON.stringify drops an Error's message, so show name and message for those
  const detail = e instanceof Error || typeof e?.message === 'string' ? `${e.name}: ${e.message}` : JSON.stringify(e)
  $.ui.log(`doError error${why}: ${detail}`)
}

function dataFor($: Parameters<Hook<'ui.render'>>[0], e: { component: string; props: any }) {
  if (e.component === 'zzzUserMessage') {
    $.ui.log(`renderMessage: ${JSON.stringify(e, null, 2)}`)
  }
  switch (e.component) {
    case 'ToolResult': return { label: 'Result', text: `${e.props.tool}\n${e.props.output}`, showNext: false, marginTop: 0 }
    case 'AbovePrompt': return { label: 'Above', text: e.props.bodyColumns, showNext: true, marginTop: 0 }
    case 'PromptHint': return { label: 'Hint', text: e.props.hint, showNext: false, marginTop: 0 }
    case 'UserMessage': return { label: 'Prompt', text: e.props.text?.trimEnd(), showNext: false, marginTop: 0 }
    case 'ToolUse': return { label: 'Tool Use', text: e.props.output, showNext: false, marginTop: 0 }
    case 'ToolGroup': return { label: 'Tool Group', text: e.props.text, showNext: true, marginTop: 0 }
    case 'AssistantMessage': return { label: 'Message', text: e.props.text?.trimEnd(), showNext: true, marginTop: 0 }
    case 'CommandOutput': return { label: 'Output', text: e.props.text, showNext: false, marginTop: 0 }
    case 'Spinner': return { label: 'Working', text: e.props.word, showNext: true, marginTop: 0 }
    case 'SessionMode': return { label: 'Session Mode', text: '', showNext: true, marginTop: 0 }
    case 'InfoNotice': return { label: 'Notice', text: e.props.text, showNext: true, marginTop: 0 }
    case 'TurnDuration': return { label: 'Time', text: e.props.durationMs + 'ms', showNext: true, marginTop: 0 }
    default: return { label: e.component, text: e.props.text, showNext: true, marginTop: 0 }
  }
}

export async function renderMessage($: Parameters<Hook<'ui.render'>>[0], e: RenderInput<any>, next: any) {
  const { label, text, showNext, marginTop } = dataFor($, e)
  const beneath = await next(e)
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
  const { Box, Text } = $.ui.resolve(e)
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

// A path shown relative to the session's working directory when it is inside it; otherwise as given.
export function relativeTo(cwd: string, path: string | undefined): string | undefined {
  if (!path || !cwd) return path
  const prefix = cwd.endsWith('/') ? cwd : `${cwd}/`
  return path.startsWith(prefix) ? path.slice(prefix.length) : path
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

export const PANE = 'sencha'

let linesSeen = 0

export async function clearAll($: any) {
  linesSeen = 0
  resetSections($)
}

// The server keeps one progress list for every tool. Only initialize and generate clear it, so a
// build or watch starts with the last run's lines and its "polling done" still in the list.
// listStart is where this tool's own lines begin in that list.
let listStart = 0

// Called before a progress tool starts, with the list length the server has right now.
export function startProgress(length: number) {
  linesSeen = length
  listStart = length
}

// True once this tool's lines are in the list and the last one says polling is done.
export function progressFinished(items: { name?: string }[]): boolean {
  const start = items.length < listStart ? 0 : listStart
  return items.length > start && items[items.length - 1]?.name === 'polling done'
}

export async function appendLines($: EngineInterface, items: { name?: string }[]): Promise<number> {
  //$.ui.log('appendLines')
  if (items.length < linesSeen) {
    // the server cleared its list for a new run, so this tool's lines start at the top
    linesSeen = 0
    listStart = 0
  }
  const fresh = items.slice(linesSeen).flatMap(item => item.name === undefined || ['', '.'].includes(item.name.trim()) ? [] : [{ name: item.name }])
  linesSeen = items.length
  if (fresh.length > 0) {
    for (const item of fresh) {
      // $.ui.log(`item.name ${item.name}`)
      await addItemToLatestSection($, item.name)
    }
    await $.ui.scroll({ in: PANE, to: 'end' })
  }
  return fresh.length
}
