import { WINDOW, type ExpanderItem, type ExpanderProps, type ExpanderSection, type ExpanderView } from '../components/expander'

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
  const offset = s.expanded ? Math.min(scrolls[s.id] ?? 0, Math.max(0, all.length - WINDOW)) : 0
  return { ...rest, items: s.expanded ? all.slice(offset, offset + WINDOW) : [], total: all.length, offset }
}

const maxOffset = (s?: ExpanderSection) => Math.max(0, (s?.items?.length ?? 0) - WINDOW)

export function scrollSection(id: string, offset: number) {
  const max = maxOffset(list.find(x => x.id === id))
  const next = Math.max(0, Math.min(max, Math.round(offset)))
  scrolls = { ...scrolls, [id]: next }
  follow = { ...follow, [id]: next >= max }
}

export function expanderProps(dropped: string[] = []): ExpanderProps {
  return {
    sections: cleanData(list.map(view), 'sections', dropped),
    titleColor: 'cyan',
    itemColor: 'yellow',
    hoverBg: '#14532d',
    unicode: true,
  }
}

export function expandAll($: any) {
  try {
    list = list.map(s => ({ ...s, expanded: true }))
    $.ui.invalidate('ui.render')
  }
  catch (error) {
    $.ui.log(`error here...`)
  }
}

export function collapseAll($: any) {
  list = list.map(s => ({ ...s, expanded: false }))
  $.ui.invalidate('ui.render')
}

// title: the first column. name: the white column after it. value: the italic purple column after that.
export async function addSection($: any, title?: string, name?: string, value?: string, step?: Pick<ExpanderSection, 'status' | 'subject'>) {
  if (name === undefined) { name = '' }
  const n = list.length + 1
  const id = `section-${n}`
  const section: ExpanderSection = { id, title: title ?? `section ${n}`, message: name, items: [], expanded: true }
  if (value !== undefined) section.detail = value
  if (step?.status !== undefined) section.status = step.status
  if (step?.subject !== undefined) section.subject = step.subject
  list = [
    ...list.map(s => ({ ...s, expanded: false })),
    section,
  ]
  //await $.clock.sleep(5000)
  $.ui.invalidate('ui.render')

  return id
}

export function setSectionStatus($: any, id: string, status: ExpanderSection['status']) {
  list = list.map(s => (s.id === id ? { ...s, status } : s))
  $.ui.invalidate('ui.render')
}

export function toggleSection(id: string, open: boolean) {
  // Accordion: opening a section collapses whichever section was open before,
  // so at most one section is expanded at a time. Collapsing only affects the
  // target. Collapsing every other expanded section is equivalent to tracking
  // the previous id, and cannot drift out of sync with list/addSection/etc.
  list = list.map(s => {
    if (s.id === id) return { ...s, expanded: open }
    if (open && s.expanded) return { ...s, expanded: false }
    return s
  })
}

export async function addItem($: any, id: string, title?: string, color?: string, italic?: boolean) {
  list = list.map(s => {
    if (s.id !== id) return s
    const n = (s.items?.length ?? 0) + 1
    const text = title ?? `item ${n}`
    // only the style fields that are set, so the props stay free of undefined values
    const item = color || italic ? { text, ...(color ? { color } : {}), ...(italic ? { italic } : {}) } : text
    return { ...s, items: [...(s.items ?? []), item] }
  })
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
const metaOf = (s: ExpanderSection) => [s.message, s.detail, s.subject].filter(Boolean).join(' · ')
export function expanderText(): string {
  const width = titleWidth()
  return list.map(s => {
    const head = `${s.title.padEnd(width)} ${metaOf(s)}`.trimEnd()
    return [head, ...(s.items ?? []).map(i => `  ${typeof i === 'string' ? i : i.text}`)].join('\n')
  }).join('\n') + '\n'
}

// local time as YYYY-MM-DD-HH:MM:SS
const stamp = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
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
    for (const i of s.items ?? []) {
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
const prettyParam = (text: string) => {
  const at = text.indexOf(': ')
  if (at < 0) return text
  try {
    const value = JSON.parse(text.slice(at + 2))
    if (value === null || typeof value !== 'object') return text
    return `${text.slice(0, at + 2)}${JSON.stringify(value, null, 2)}`
  }
  catch {
    return text
  }
}

export function expanderData() {
  return list.map(s => ({
    title: s.title,
    status: s.status ?? null,
    message: s.message ?? '',
    detail: s.detail ?? '',
    subject: s.subject ?? '',
    items: (s.items ?? []).map(i => (typeof i === 'string'
      ? { kind: 'output', text: i }
      : i.italic === true
        ? { kind: 'parameter', text: prettyParam(i.text) }
        : { kind: 'output', text: i.text })),
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
  td.title { font-weight: bold; white-space: nowrap; width: 1%; font-size: 0.8em; }
  td.meta { font-style: italic; font-size: 0.7em; }
  span.name.done { color: green; }
  span.name.fail { color: red; }
  td.output { white-space: pre-wrap; font-size: 0.6em; color: #b8860b; }
  tr.output td { padding-top: 0; padding-bottom: 0; line-height: 1.2; }
  tr.parameter td { padding-top: 0; padding-bottom: 0; line-height: 1.2; }
  td.parameter { font-size: 0.7em; color: purple; overflow-wrap: anywhere; }
  td.parameter code { white-space: pre-wrap; overflow-wrap: anywhere; }
  header.page { display: flex; justify-content: space-between; align-items: baseline; }
  header.page h1 { margin: 0 0 1rem; font-size: 1.5em; }
  button.toggle { font-family: inherit; font-size: 0.6em; margin-left: 0; padding: 0 0.4em; border: 1px solid #ccc; border-radius: 3px; background: #f2f2f2; color: inherit; cursor: pointer; }
</style>
</head>
<body>
<header class="page">
  <h1>Sencha Claude Code Companion</h1>
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
    // one control per section: it shows or hides every output row under the header
    // one control per kind of row in the section: it shows or hides every row of that kind under the header
    var params = []
    var outputs = []
    // a row of its own holding the control for the rows given, above the first of them
    function toggleLine(label, rows, startCollapsed) {
      var collapsed = !!startCollapsed
      var button = el('button', 'toggle', label + (collapsed ? ': Expand' : ': Collapse'))
      button.type = 'button'
      button.addEventListener('click', function () {
        collapsed = !collapsed
        button.textContent = label + (collapsed ? ': Expand' : ': Collapse')
        rows.forEach(function (r) { r.hidden = collapsed })
      })
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
</script>
</body>
</html>
`
}

// one name, three files: the plain text, the Markdown and the HTML, all with the same time stamp
export async function writeExpanderFile($: any, base = `expander-${stamp(new Date())}`) {
  try {
    // absolute, in the session's own folder: a relative path would land in the plugin's folder
    const dir = await $.session.cwd()
    $.ui.log(`expander file: ${dir}/${base}.html`)
    //await $.fs.write(`${dir}/${base}.txt`, expanderText())
    //await $.fs.write(`${dir}/${base}.md`, expanderMarkdown())
    await $.fs.write(`${dir}/${base}.html`, expanderHtml())
  }
  catch (error: any) {
    $.ui.log(`writeExpanderFile error: ${error.toString()}`)
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
