import { WINDOW, type ExpanderItem, type ExpanderProps, type ExpanderSection, type ExpanderView } from '../components/expander'

// Every step's details are kept in one JSON file per session, keyed by step id:
//   { "section-1": { "title": "...", "message": "...", "detail": "...", "subject": "...", "status": "...", "items": [...] } }
// Memory holds only the step headers, plus the lines of a step while it is expanded (read from the file when it opens).
// The host's file API reads and rewrites whole files, so writes are batched: changes wait in `dirty` and `waiting`,
// and one write carries everything that arrived while the previous write ran. File work runs one step at a time.
type Line = string | ExpanderItem
type Stored = { title: string; message?: string; detail?: string; subject?: string; status?: string; items: Line[] }

let storeFile: string | undefined
let queue: Promise<unknown> = Promise.resolve()
let writeQueued = false
const dirty = new Set<string>()             // step ids whose header or lines changed since the last write
const waiting: Record<string, Line[]> = {}  // lines not yet written, per step id
const counts: Record<string, number> = {}   // lines per step, for the header's total
const loading = new Set<string>()           // steps whose lines are being read from the file
// set only while an export runs: every step's lines, read from the file beforehand
let exportLines: Map<string, Line[]> | undefined

// the session's file, in the system temp directory (never the project)
async function storePath($: any): Promise<string> {
  if (!storeFile) {
    const base = ((await $.env.get('TMPDIR')) || '/tmp').replace(/\/+$/, '')
    storeFile = `${base}/sencha-expander/${await $.session.id()}.json`
  }
  return storeFile
}

async function readStore($: any, path: string): Promise<Record<string, Stored>> {
  if (!(await $.fs.exists(path))) return {}
  return JSON.parse(await $.fs.read(path))
}

// file work is queued: one operation at a time
function enqueue(op: () => Promise<void>): Promise<void> {
  const run = queue.then(op)
  queue = run.catch(() => undefined)
  return run
}

// writes the changed headers and the waiting lines to the file (runs inside the queue)
async function writeDirty($: any): Promise<void> {
  if (dirty.size === 0) return
  const ids = [...dirty]
  const lines: Record<string, Line[]> = {}
  for (const id of ids) {
    lines[id] = waiting[id] ?? []
    delete waiting[id]
  }
  dirty.clear()
  const path = await storePath($)
  try {
    const store = await readStore($, path)
    for (const id of ids) {
      const s = list.find(x => x.id === id)
      if (!s) continue
      store[id] = {
        title: s.title,
        message: s.message,
        detail: s.detail,
        subject: s.subject,
        status: s.status,
        items: [...(store[id]?.items ?? []), ...(lines[id] ?? [])],
      }
    }
    await $.fs.write(path, JSON.stringify(store))
  }
  catch (error) {
    // nothing is lost: these changes wait again, ahead of anything that arrived since
    for (const id of ids) {
      dirty.add(id)
      waiting[id] = [...(lines[id] ?? []), ...(waiting[id] ?? [])]
    }
    throw error
  }
}

// one write is queued at a time; changes that arrive before it starts are written with it
function scheduleWrite($: any): void {
  if (writeQueued) return
  writeQueued = true
  enqueue(async () => {
    writeQueued = false
    await writeDirty($)
  }).catch(error => $.ui.log(`expander: write failed: ${error?.message ?? String(error)}`))
}

function markDirty($: any, id: string): void {
  dirty.add(id)
  scheduleWrite($)
}

// reads a step's lines from the file once every waiting change is in it, then shows them if the step is still open
function loadLines($: any, id: string): Promise<void> {
  loading.add(id)
  return enqueue(async () => {
    await writeDirty($)
    const store = await readStore($, await storePath($))
    const fromFile = store[id]?.items ?? []
    // lines that arrived during the read are still waiting; they come after the file's lines
    const later = waiting[id] ?? []
    loading.delete(id)
    list = list.map(s => (s.id === id && s.expanded ? { ...s, items: [...fromFile, ...later] } : s))
    // the lines were not in the last drawing: ask for a redraw so they show
    $.ui.invalidate('ui.render')
  }).catch(error => {
    loading.delete(id)
    $.ui.log(`expander: could not read ${id}: ${error?.message ?? String(error)}`)
  })
}

// every line of a step: from the export's snapshot, else the lines shown while it is open
const allItems = (s: ExpanderSection): Line[] => exportLines?.get(s.id) ?? (s.items ?? [])
const countOf = (s: ExpanderSection): number => counts[s.id] ?? (s.items?.length ?? 0)

// every section starts with an id row: its session, tool and agent ids, in blue. It is built from the section's
// fields each time it is drawn, not stored with the lines, so an id that arrives later (a subagent's id, set when
// its Agent call finishes) still shows. Its rows count in the window and the scroll like any other line.
const ID_COLOR = '#3b82f6'
// one line each: session, tool, agent, parent (the Agent call that started this section's subagent)
const idsLines = (s: ExpanderSection): string[] => [
  `session: ${s.session || '-'}`,
  `tool: ${s.toolId || '-'}`,
  `agent: ${s.agent || '-'}`,
  `parent: ${s.parentTool || '-'}`,
]
const idRows = (s: ExpanderSection): ExpanderItem[] => idsLines(s).map(text => ({ text, color: ID_COLOR }))
const rowsOf = (s: ExpanderSection): number => countOf(s) + idsLines(s).length

// opens or closes steps. Opening reads the lines from the file; closing drops them from memory (they stay in the file).
// resolves once every opened step has its lines, so the drawing that follows shows them
async function setExpandedState($: any, changes: { id: string; open: boolean }[]): Promise<void> {
  const wanted = new Map(changes.map(c => [c.id, c.open]))
  const reads: Promise<void>[] = []
  list = list.map(s => {
    const open = wanted.get(s.id)
    if (open === undefined || open === !!s.expanded) return s
    if (open) {
      reads.push(loadLines($, s.id))
      return { ...s, expanded: true, items: [] }
    }
    return { ...s, expanded: false, items: [] }
  })
  await Promise.all(reads)
}

// the session id put in front of every printed line; set at session.start (empty until then)
let sessionTag = ''
export function setSessionTag(id: string) {
  sessionTag = id
}

let list: ExpanderSection[] = []
// scroll offset per section id; the client only ever sees the window at this offset
let scrolls: Record<string, number> = {}
// a section follows the end of its list as items arrive, until it is scrolled off the end
let follow: Record<string, boolean> = {}

// latest set of sections, for the UI and anything else that reads section data
export function sections(): ExpanderSection[] {
  return list
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

// only an expanded section is drawn, so only its window of items is sent
const view = (s: ExpanderSection): ExpanderView => {
  const { items: all = [], ...rest } = s
  const total = rowsOf(s)
  const offset = s.expanded ? Math.min(scrolls[s.id] ?? 0, Math.max(0, total - WINDOW)) : 0
  return { ...rest, items: s.expanded ? [...idRows(s), ...all].slice(offset, offset + WINDOW) : [], total, offset }
}

const maxOffset = (s?: ExpanderSection) => (s ? Math.max(0, rowsOf(s) - WINDOW) : 0)

export function scrollSection(id: string, offset: number) {
  const max = maxOffset(list.find(x => x.id === id))
  const next = Math.max(0, Math.min(max, Math.round(offset)))
  scrolls = { ...scrolls, [id]: next }
  follow = { ...follow, [id]: next >= max }
}

// Every section is sent: the expander draws every header and trims rows to fit the tree limit, so no step is lost.
function fittingSections(): ExpanderView[] {
  return list.map(view)
}

export function expanderProps(dropped: string[] = []): ExpanderProps {
  return {
    sections: cleanData(fittingSections(), 'sections', dropped),
    titleColor: 'cyan',
    itemColor: 'yellow',
    itemMonospace: false, // off: the Code element made the page refuse the tree; these rows use Text
    hoverBg: '#14532d',
    unicode: true,
  }
}

export async function expandAll($: any) {
  try {
    await setExpandedState($, list.map(s => ({ id: s.id, open: true })))
    $.ui.invalidate('ui.render')
  }
  catch (error) {
    $.ui.log(`error here...`)
  }
}


export async function collapseAll($: any) {
  await setExpandedState($, list.map(s => ({ id: s.id, open: false })))
  $.ui.invalidate('ui.render')
}


// title: the first column. name: the white column after it. value: the italic purple column after that.
// subagent loop id -> the tool_use_id of the Agent call that started it (filled by linkSpawn, from agent.spawn)
const spawnedBy: Record<string, string> = {}

// called when a subagent starts: links the Agent call (its tool_use_id) to the loop id the subagent got. The
// Agent call's own section shows that loop id, and every section the subagent runs shows the call it came from.
export function linkSpawn($: any, toolUseId: string, agentId: string) {
  if (!toolUseId || !agentId) return
  spawnedBy[agentId] = toolUseId
  // the Agent call shows the loop id; sections of that loop already drawn (a turn.start can arrive first) get the parent
  list = list.map(s => {
    if (s.toolId === toolUseId) return { ...s, agent: agentId }
    if (s.agent === agentId && !s.parentTool) return { ...s, parentTool: toolUseId }
    return s
  })
  $.ui.invalidate('ui.render')
}

// the tool_use_id of the Agent call that started a subagent loop, if this session saw it start
export function parentToolOf(agentId?: string): string | undefined {
  return agentId ? spawnedBy[agentId] : undefined
}

export async function addSection($: any, title?: string, name?: string, value?: string, step?: Pick<ExpanderSection, 'status' | 'subject' | 'agent' | 'subagent' | 'toolId'>) {
  if (name === undefined) { name = '' }
  const n = list.length + 1
  const id = `section-${n}`
  // the session id (once the session has started) is drawn ahead of the name, in the second column
  const section: ExpanderSection = { id, title: title ?? `section ${n}`, message: name, items: [], expanded: true }
  if (sessionTag) section.session = sessionTag
  if (value !== undefined) section.detail = value
  if (step?.status !== undefined) section.status = step.status
  if (step?.subject !== undefined) section.subject = step.subject
  // the id of the subagent loop this section ran in; absent for the main loop
  if (step?.agent) section.agent = step.agent
  if (step?.subagent) section.subagent = step.subagent
  // the tool_use_id of this call, and of the Agent call that started the subagent this section runs in
  if (step?.toolId) section.toolId = step.toolId
  const parent = step?.agent ? spawnedBy[step.agent] : undefined
  if (parent) section.parentTool = parent
  list = [
    ...list.map(s => ({ ...s, expanded: false })),
    section,
  ]
  counts[id] = 0
  markDirty($, id)
  //await $.clock.sleep(5000)
  $.ui.invalidate('ui.render')

  return id
}

export function setSectionStatus($: any, id: string, status: ExpanderSection['status']) {
  list = list.map(s => (s.id === id ? { ...s, status } : s))
  markDirty($, id)
  $.ui.invalidate('ui.render')
}

export async function toggleSection($: any, id: string, open: boolean) {
  // Accordion: opening a section collapses whichever section was open before, so at most one section is expanded
  // at a time. Collapsing only affects the target.
  const changes = list
    .filter(s => s.id === id || (open && s.expanded))
    .map(s => ({ id: s.id, open: s.id === id ? open : false }))
  await setExpandedState($, changes)
}


export async function addItem($: any, id: string, title?: string, color?: string, italic?: boolean) {
  if (!list.some(s => s.id === id)) return
  const n = (counts[id] ?? 0) + 1
  counts[id] = n
  // every printed line carries the session id, once the session has started
  //const text = `${sessionTag ? `[${sessionTag}] ` : ''}${title ?? `item ${n}`}`
  const text = `${title}`
  // only the style fields that are set, so the props stay free of undefined values
  const item: Line = color || italic ? { text, ...(color ? { color } : {}), ...(italic ? { italic } : {}) } : text
  // every line goes to the file; it joins the shown lines only if the step is open and its lines have loaded
  waiting[id] = [...(waiting[id] ?? []), item]
  markDirty($, id)
  list = list.map(s => (s.id === id && s.expanded && !loading.has(id) ? { ...s, items: [...(s.items ?? []), item] } : s))
  if (follow[id] ?? true) scrolls = { ...scrolls, [id]: maxOffset(list.find(s => s.id === id)) }
  //await $.clock.sleep(5000)
  try {
    $.ui.invalidate('ui.render')
  }
  catch (error: any) {
    $.ui.log(`addItem error: ${error.toString()}`)
  }
}


export async function addItemToLatestSection($: any, title?: string, color?: string, italic?: boolean) {
  const latest = list[list.length - 1]
  if (latest) await addItem($, latest.id, title, color, italic)
}

export function resetSections($: any) {
  // the session's file is emptied (the host cannot delete it), and nothing waits to be written any more
  dirty.clear()
  for (const id of Object.keys(waiting)) delete waiting[id]
  for (const id of Object.keys(counts)) delete counts[id]
  loading.clear()
  enqueue(async () => $.fs.write(await storePath($), '{}')).catch(() => undefined)
  list = []
  scrolls = {}
  follow = {}
  $.ui.invalidate('ui.render')
}


// every section on one line, its items indented under it: the whole list, not just the window
// the title column is as wide as the longest title, never narrower than the pane's gutter
const TITLE_COLUMN = 17
const titleWidth = () => Math.max(TITLE_COLUMN, ...list.map(s => s.title.length))
// the second column of a section's header line: its status, message, detail and subject
const metaOf = (s: ExpanderSection) => [s.session, s.agent, s.toolId, s.subagent, s.message, s.detail, s.subject].filter(Boolean).join(' · ')
export function expanderText(): string {
  const width = titleWidth()
  return list.map(s => {
    const head = `${s.title.padEnd(width)} ${metaOf(s)}`.trimEnd()
    return [head, ...idsLines(s).map(line => `  ${line}`), ...allItems(s).map(i => `  ${typeof i === 'string' ? i : i.text}`)].join('\n')
  }).join('\n') + '\n'
}

// local time as YYYY-MM-DD-HH:MM:SS
const stamp = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`
}

// a new file per write, named by when it was written; earlier files are left alone
// a value as a Markdown code span, longer delimiter when the value holds backticks
const code = (text: string) => {
  const run = Math.max(0, ...(text.match(/`+/g) ?? []).map(m => m.length))
  const delim = '`'.repeat(run + 1)
  return `${delim} ${text} ${delim}`
}

// the session header is the h1; each section is an h2. Italic items are parameters
// (addItem's style for a tool's input), plain items are output.
// a Markdown text run escaped so it shows as written
const escapeMd = (text: string) => text.replace(/[\\`*_[\]<>]/g, '\\$&')

// a table cell: pipes escaped, line breaks as <br>
const cell = (text: string) => text.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')

// one table for the whole run, so every second column lines up in any Markdown viewer.
// A section is a row: its title, then its metadata in italics. Its parameters are rows
// under it in the code style, and its output rows are plain text; both leave the first column empty.
export function expanderMarkdown(): string {
  const rows = ['| Section | Details |', '| --- | --- |']
  for (const s of list) {
    const meta = metaOf(s)
    rows.push(`| **${escapeMd(s.title)}** | ${meta ? `*${cell(escapeMd(meta))}*` : ''} |`)
    for (const line of idsLines(s)) rows.push(`|  | ${cell(escapeMd(line))} |`)
    for (const i of allItems(s)) {
      const text = typeof i === 'string' ? i : i.text
      const isParam = typeof i !== 'string' && i.italic === true
      rows.push(`|  | ${cell(isParam ? code(text) : escapeMd(text))} |`)
    }
  }
  return rows.join('\n') + '\n'
}

// the sections as plain data: the same fields the text and Markdown files show
// a parameter whose value is an array or object, as `key: {json}`, laid out one property per line
// with the brackets on their own lines; anything else is returned as it is
// the text as pretty JSON when it is an object or array, otherwise undefined.
// A JSON string that itself holds an object or array (a value sent already encoded) is unwrapped once.
const prettyJson = (text: string): string | undefined => {
  try {
    let value = JSON.parse(text)
    if (typeof value === 'string') value = JSON.parse(value)
    if (value === null || typeof value !== 'object') return undefined
    return JSON.stringify(value, null, 2)
  }
  catch {
    return undefined
  }
}

const prettyParam = (text: string) => {
  // the whole text first: an unlabelled array or object has ': ' inside it, so splitting would cut it apart
  const whole = prettyJson(text)
  if (whole !== undefined) return whole
  // otherwise a `key: {json}` or `key: [json]` line, the label kept as it is
  const at = text.indexOf(': ')
  if (at < 0) return text
  const body = prettyJson(text.slice(at + 2))
  return body === undefined ? text : `${text.slice(0, at + 2)}${body}`
}

export function expanderData() {
  return list.map(s => ({
    title: s.title,
    status: s.status ?? null,
    message: s.message ?? '',
    detail: s.detail ?? '',
    subject: s.subject ?? '',
    ids: idsLines(s),
    items: allItems(s).map(i => (typeof i === 'string'
      ? { kind: 'output', text: prettyParam(i) }
      : i.italic === true
        ? { kind: 'parameter', text: prettyParam(i.text) }
        : { kind: 'output', text: prettyParam(i.text) })),
  }))
}

// one self-contained page: the data as JSON, read by a small script into the same table as the Markdown
export function expanderHtml(): string {
  // '<' as an escape, so the data can never close its script element
  const json = JSON.stringify({ sections: expanderData() }).replace(/</g, '\\u003c')
  const ran = new Date().toLocaleString()
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Expander</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; vertical-align: top; padding: 0.25rem 0.75rem; }
  thead th { border-bottom: 2px solid #888; }
  tr.section td { border-top: 1px solid #ccc; padding-top: 0.6rem; padding-bottom: 0; }
  tr:has(+ tr.section):not(.toggle-line) td { padding-bottom: 0.6rem; }
  tr.toggle-line + tr.section td { padding-top: 0; }
  tr.toggle-line:has(+ tr.output[hidden]) td { padding-bottom: 0.6rem; }
  td.title { font-weight: bold; white-space: nowrap; width: 1%; font-size: 0.8em; }
  td.meta { font-style: italic; font-size: 0.7em; }
  span.name.done { color: green; }
  span.name.fail { color: red; }
  td.output { white-space: pre-wrap; font-size: 0.6em; color: #b8860b; }
  tr.output td { padding-top: 0; padding-bottom: 0; line-height: 1.2; }
  tr.parameter td { padding-top: 0; padding-bottom: 0; line-height: 1.2; }
  tr.ids td { padding-top: 0; padding-bottom: 0; line-height: 1.2; }
  td.ids { font-size: 0.7em; color: ${ID_COLOR}; }
  td.parameter { font-size: 0.7em; color: purple; overflow-wrap: anywhere; }
  td.parameter code { white-space: pre-wrap; overflow-wrap: anywhere; }
  header.page { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
  header.page h1 { margin: 0; font-size: 1.5em; }
  div.titles { display: flex; align-items: center; gap: 0.75rem; }
  span.actions { display: flex; gap: 0.4rem; }
  button.toggle { font-family: inherit; font-size: 0.6em; margin-left: 0; padding: 0 0.4em; border: 1px solid #ccc; border-radius: 3px; background: #f2f2f2; color: inherit; cursor: pointer; }
  button.all { font-size: 0.75em; padding: 0.15em 0.6em; }
</style>
</head>
<body>
<header class="page">
  <div class="titles">
    <h1>Sencha Claude Code Companion</h1>
    <span class="actions">
      <button type="button" class="toggle all" id="expand-all">Expand All</button>
      <button type="button" class="toggle all" id="collapse-all">Collapse All</button>
    </span>
  </div>
  <span class="run-date">${ran}</span>
</header>
<table>
  <thead><tr><th>Section</th><th>Details</th></tr></thead>
  <tbody id="rows"></tbody>
</table>
<script type="application/json" id="expander-data">${json}</script>
<script>
  var data = JSON.parse(document.getElementById('expander-data').textContent)
  var body = document.getElementById('rows')
  // every kind-of-rows control on the page, so the header's Expand All / Collapse All can reach them
  var groups = []
  function el(tag, cls, text) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (text !== undefined) e.textContent = text
    return e
  }
  data.sections.forEach(function (s) {
    var head = el('tr', 'section')
    // the tool's name is coloured by its status: green when done, red when it failed
    var meta = el('td', 'meta')
    if (s.message) meta.append(el('span', 'name ' + (s.status || ''), s.message))
    var rest = [s.detail, s.subject].filter(Boolean).join(' \u00b7 ')
    if (rest) meta.append((s.message ? ' \u00b7 ' : '') + rest)
    head.append(el('td', 'title', s.title), meta)
    body.append(head)
    // the id rows: session, tool and agent, each on its own line in blue under the header
    s.ids.forEach(function (line) {
      var idRow = el('tr', 'ids')
      idRow.append(el('td', ''), el('td', 'ids', line))
      body.append(idRow)
    })
    // one control per section: it shows or hides every output row under the header
    // one control per kind of row in the section: it shows or hides every row of that kind under the header
    var params = []
    var outputs = []
    // a row of its own holding the control for the rows given, above the first of them
    function toggleLine(label, rows, startCollapsed) {
      var button = el('button', 'toggle')
      button.type = 'button'
      var group = {
        collapsed: false,
        set: function (collapsed) {
          group.collapsed = collapsed
          button.textContent = label + (collapsed ? ': Expand' : ': Collapse')
          rows.forEach(function (r) { r.hidden = collapsed })
        }
      }
      group.set(!!startCollapsed)
      button.addEventListener('click', function () { group.set(!group.collapsed) })
      groups.push(group)
      var line = el('tr', 'toggle-line')
      var lineDetail = el('td', '')
      lineDetail.append(button)
      line.append(el('td', ''), lineDetail)
      return line
    }
    s.items.forEach(function (item) {
      var row = el('tr', item.kind)
      var detail
      if (item.kind === 'parameter') {
        // the parameters start expanded, so the button says Collapse
        if (!params.length) body.append(toggleLine('Parameters', params))
        detail = el('td', 'parameter')
        detail.append(el('code', '', item.text))
        params.push(row)
      } else {
        // the output starts collapsed: its rows start hidden and the button says Expand
        if (!outputs.length) body.append(toggleLine('Output', outputs, true))
        row.hidden = true
        detail = el('td', 'output', item.text)
        outputs.push(row)
      }
      row.append(el('td', ''), detail)
      body.append(row)
    })
  })
  // the header's buttons: every parameters and output control on the page, all at once
  function setAll(collapsed) {
    groups.forEach(function (g) { g.set(collapsed) })
  }
  document.getElementById('expand-all').addEventListener('click', function () { setAll(false) })
  document.getElementById('collapse-all').addEventListener('click', function () { setAll(true) })
</script>
</body>
</html>
`
}

// one name, three files: the plain text, the Markdown and the HTML, all with the session id and the same time stamp
export async function writeExpanderFile($: any, given?: string) {
  const base = given ?? `expander-${await $.session.id()}-${stamp(new Date())}`
  try {
    // absolute, in the session's own folder: a relative path would land in the plugin's folder
    const dir = await $.session.cwd()
    $.ui.log(`expander file: ${dir}/${base}.html`)
    // the file holds every step's lines; waiting changes are written first so none is missing
    await enqueue(async () => {
      await writeDirty($)
      const store = await readStore($, await storePath($))
      exportLines = new Map(Object.entries(store).map(([id, step]) => [id, step.items]))
    })
    //await $.fs.write(`${dir}/${base}.txt`, expanderText())
    //await $.fs.write(`${dir}/${base}.md`, expanderMarkdown())
    await $.fs.write(`${dir}/${base}.html`, expanderHtml())
  }
  catch (error: any) {
    $.ui.log(`writeExpanderFile error: ${error.toString()}`)
  }
  finally {
    exportLines = undefined
  }
}

export async function runTests($: any) {
  const wait = 0;
  for (let i = 0; i < 10; i++) {
    await addSection($, `new section ${i}`)
    await $.clock.sleep(wait)
    const count = 700 + Math.floor(Math.random() * 6)
    for (let j = 0; j < count; j++) {
      await addItemToLatestSection($, `new item ${j}`)
      await $.clock.sleep(wait)
    }
  }
  await writeExpanderFile($)
}

// export async function runTests2($: any) {
//   const wait = 50;
//   for (let i = 0; i < 10; i++) {
//     await addSection($, `new section ${i}`)
//     await $.clock.sleep(wait)
//     const count = 5 + Math.floor(Math.random() * 6)
//     for (let j = 0; j < count; j++) {
//       await addItemToLatestSection($, `new item ${j}`)
//       await $.clock.sleep(wait)
//     }
//   }
// }
