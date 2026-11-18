import type { ClientModule, RenderElement } from 'claude-code'

import { CHEVRON_CLOSED, CHEVRON_OPEN, CIRCLE_FILLED, CIRCLE_NERD } from './icons'

// rows of an expanded section the host sends at a time; scrolling moves this window
export const WINDOW = 10

export type ExpanderItem = { text: string; color?: string; dim?: boolean; italic?: boolean }
export type ExpanderStatus = 'runs' | 'done' | 'fail'
export type ExpanderSection = {
  id: string
  title: string
  message?: string
  status?: ExpanderStatus
  subject?: string
  detail?: string
  // the session id, drawn in light gray ahead of the message
  session?: string
  // the subagent loop's id, for a section run by a subagent; drawn in light gray after the session id
  agent?: string
  // the label of a tool call that starts a subagent ("subagent call (type)"); drawn in amber
  subagent?: string
  // the tool_use_id of the call this section is for (the tool call's own id); drawn in light gray
  toolId?: string
  // for a section run by a subagent: the tool_use_id of the Agent call that started that subagent; light gray
  parentTool?: string
  items?: (string | ExpanderItem)[]
  expanded?: boolean
}
// what the client gets for a section: `items` is only the window at `offset`, `total` the whole list
export type ExpanderView = Omit<ExpanderSection, 'items'> & {
  items: (string | ExpanderItem)[]
  total: number
  offset: number
}
export type ExpanderProps = {
  sections: ExpanderView[]
  titleColor?: string
  itemColor?: string
  // draw rows that use the default item color (the progress lines) with the host's code font, so columns line up.
  // Code takes no color, so these rows show in the default text color rather than itemColor.
  itemMonospace?: boolean
  hoverBg?: string
  unicode?: boolean
}
type Row = { text: string; color?: string; dim?: boolean; italic?: boolean }
type Local = {
  hover: { sec: string; row: number } | null
  drag: string | false
  focus: string | null
}

const toRows = (items?: (string | ExpanderItem)[]): Row[] =>
  (items ?? []).map(i => (typeof i === 'string' ? { text: i } : i))

// Text and Code draw one row of plain text: control characters (newlines, carriage returns, ANSI escapes)
// would draw past the row's bounds or make the tree malformed, and a row longer than the room is cut.
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/g
const ROW_CHARS = 500
const clean = (value: string | undefined, max = ROW_CHARS): string => {
  const text = (value ?? '').replace(/\t/g, '    ').replace(CONTROL, ' ')
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

// Presentational: sections, rows and expanded flags arrive as props and every
// change leaves as an event for the host to own. Only view state (hover,
// drag, focus) lives here; the scroll offset is the host's, sent in each section.
// A tree past 100,000 characters serialized unmounts the expander. The limit leaves room for the host's own wrapping.
const TREE_LIMIT = 80_000

// The tree as text for the hook log. A post carries at most 100,000 characters, so the text is cut short.
let lastDump = ''
function dump(tree: unknown): string {
  try {
    return (JSON.stringify(tree) ?? 'undefined').slice(0, 50000)
  }
  catch (error: any) {
    return `dump failed: ${error?.message ?? String(error)}`
  }
}

const Expander: ClientModule<ExpanderProps, Local> = (props, surface) => {
  const { Box, Text, Code } = surface.elements
  try {
    let state = surface.state
    if (state === undefined) {
      surface.post({ log: 'in Expander' })
      state = { hover: null, drag: false, focus: props.sections[0]?.id ?? null }
      surface.setState(state)
    }

    const cur = () => surface.state ?? state
    const caretOpen = props.unicode ? '▼' : CHEVRON_OPEN
    const caretClosed = props.unicode ? '▶' : CHEVRON_CLOSED
    const cap = WINDOW
    // the sections this render drew (see the tree limit below); the pointer maps rows through this list
    let drawn: ExpanderView[] = props.sections
    const sectionOf = (id: string) => props.sections.find(s => s.id === id)
    const focusId = (): string | null => {
      const s = cur()
      return s.focus !== null && sectionOf(s.focus) ? s.focus : props.sections[0]?.id ?? null
    }
    const toggle = (id: string) => surface.post({ toggle: { section: id, open: !sectionOf(id)?.expanded } })
    const addRow = (id: string) => surface.post({ addRow: { section: id } })
    const addSection = () => surface.post({ addSection: true })
    const press = (id: string, index: number) => surface.post({ press: { section: id, index } })
    const scrollTo = (id: string, offset: number) => surface.post({ scroll: { section: id, offset } })
    const hits = (): { sec: string; row: number }[] => {
      const list: { sec: string; row: number }[] = []
      // the rows as this render drew them: sections cut to fit the tree limit are not in the list
      drawn.forEach(s => {
        list.push({ sec: s.id, row: 0 })
        if (s.expanded) toRows(s.items).forEach((_, ii) => list.push({ sec: s.id, row: 1 + ii }))
      })
      return list
    }
    const hoverOn = (sec: string, row: number) =>
      state.hover !== null && state.hover.sec === sec && state.hover.row === row
    // One section: a compact header row (the root node, which is never cut), then its rows. `rows` is how many of
    // its window's rows to draw; `titleCap` and `metaCap` trim the title and the message, detail and subject, so the
    // render can fit every header in the tree limit.
    const sectionBlock = (sec: ExpanderView, rows: number, titleCap: number, metaCap: number): RenderElement[] => {
      try {
        const items = toRows(sec.items).slice(0, rows)
        const hasItems = sec.total > 0
        const glyph = hasItems ? (sec.expanded ? caretOpen : caretClosed) : (props.unicode ? CIRCLE_FILLED : CIRCLE_NERD)
        const maxScroll = Math.max(0, sec.total - cap)
        const clipped = Boolean(sec.expanded) && sec.total > cap
        const shown = sec.expanded ? items : []
        const barSize = clipped ? Math.max(1, Math.round((cap * cap) / sec.total)) : 0
        const barPos = clipped && maxScroll > 0 ? Math.round((sec.offset * (cap - barSize)) / maxScroll) : 0
        const titleColor =
          sec.status === 'runs' ? 'warning'
            : sec.status === 'done' ? 'success'
              : sec.status === 'fail' ? 'error'
                : props.titleColor
        // the first column is as wide as the longest title (at least 11), so the second column lines up in every section
        const titleCol = Math.max(11,...props.sections.map(s => Math.min(s.title.length, titleCap)))
        const title = clean(sec.title, titleCap)
        //const session = clean(sec.session, metaCap)
        //const agent = sec.agent ? clean(`agent ${sec.agent}`, metaCap) : ''
        const subagent = sec.subagent ? clean(sec.subagent, metaCap) : ''
        //const toolId = sec.toolId ? clean(`tool: ${sec.toolId}`, metaCap) : ''
        const meta = clean([sec.message, sec.detail, sec.subject].filter(Boolean).join(' · '), metaCap)
        // the second column, in order: session and agent ids in light gray, a subagent call in amber, then the rest
        const parts: { text: string; color?: string }[] = []
        //if (session) parts.push({ text: 'session: ' + session, color: '#9ca3af' })
        //if (agent) parts.push({ text: agent, color: '#9ca3af' })
        //if (toolId) parts.push({ text: toolId, color: '#9ca3af' })
        if (meta) parts.push({ text: meta, color: titleColor })
        if (subagent) parts.push({ text: subagent, color: '#f59e0b' })
        // fixed-width cells, not padded text: the glyph gutter, then the title column, then the rest. Each
        // column starts at the same cell in every section whatever the glyph's or the title's width.
        const head = (
          <Box
            key={sec.id}
            flexDirection="row"
            height={1}
            overflow="hidden"
            {...(hoverOn(sec.id, 0) ? { backgroundColor: props.hoverBg } : {})}
          >
            <Box width={3} flexShrink={0}>
              <Text color={titleColor}>{` ${glyph}`}</Text>
            </Box>
            <Box width={titleCol} flexShrink={0} overflow="hidden">
              <Text color={titleColor} wrap="truncate-end">{title}</Text>
            </Box>
            {parts.length > 0 ? (
              <Box flexDirection="row" flexShrink={1} overflow="hidden">
                {parts.map((p, i) => (
                  <Text key={String(i)} color={p.color} wrap="truncate-end">{i === 0 ? p.text : `  ${p.text}`}</Text>
                ))}
              </Box>
            ) : null}
          </Box>
        )
        const rowEls = shown.map((it, i) => (
          <Box
            key={`${sec.id}-${i}`}
            flexDirection="row"
            height={1}
            overflow="hidden"
            {...(hoverOn(sec.id, 1 + i) ? { backgroundColor: props.hoverBg } : {})}
          >
            <Box marginLeft={3} flexShrink={1} overflow="hidden">
              {it.color === undefined && props.itemMonospace
                ? <Code source={clean(it.text)} wrap="truncate-end" />
                : <Text color={it.color ?? props.itemColor} {...(it.dim ? { dimColor: true } : {})} {...(it.italic ? { italic: true } : {})} wrap="wrap">{clean(it.text)}</Text>}
            </Box>
            <Box flexGrow={1} />

            {clipped ? <Text>{i >= barPos && i < barPos + barSize ? '┃' : '│'}</Text> : null}
          </Box>
        ))
        return [head, ...rowEls]
      }
      catch (error: any) {
        return [<Text>ERROR: {error.toString()}</Text>]
      }
    }

    surface.onPointer(e => {
      const s = cur()
      if (e.type === 'leave') {
        if (s.hover !== null || s.drag !== false) surface.setState({ ...s, hover: null, drag: false })
        return
      }
      const rows = hits()
      // an active scrollbar drag owns the pointer until it comes up
      if (s.drag !== false) {
        const sec = sectionOf(s.drag)
        if (!sec) {
          surface.setState({ ...s, drag: false })
          return
        }
        if (e.type === 'up') {
          surface.setState({ ...s, drag: false })
          return
        }
        if (e.type === 'down' || e.type === 'move') {
          const maxScroll = Math.max(0, sec.total - cap)
          const start = rows.findIndex(r => r.sec === sec.id && r.row === 1)
          const span = Math.max(1, Math.min(cap, sec.total) - 1)
          const rel = Math.max(0, Math.min(span, e.y - start))
          const to = maxScroll === 0 ? 0 : Math.round((rel / span) * maxScroll)
          surface.setState({ ...s, drag: sec.id, hover: null })
          scrollTo(sec.id, to)
          return
        }
      }
      const hit = rows[e.y]
      if (e.type === 'move' && !e.button) {
        const h = hit ? { sec: hit.sec, row: hit.row } : null
        if (s.hover === null || h === null || s.hover.sec !== h.sec || s.hover.row !== h.row) {
          surface.setState({ ...s, hover: h })
        }
        return
      }
      if (e.type !== 'down' || (e.button ?? 'left') !== 'left' || !hit) return
      // grab a section's scrollbar in its rightmost column
      if (e.x >= surface.columns - 1 && hit.row >= 1) {
        const sec = sectionOf(hit.sec)
        if (sec && sec.total > cap) {
          surface.setState({ ...s, drag: hit.sec, hover: null, focus: hit.sec })
          return
        }
      }
      // a click gives its section the keyboard, so j/k scroll the section that was clicked
      surface.setState({ ...s, focus: hit.sec })
      if (hit.row === 0) {
        const sec = sectionOf(hit.sec)
        // a section with nothing under it has no expander; leave it alone
        if (sec && sec.total > 0) toggle(hit.sec)
        return
      }
      if (hit.row >= 1) {
        const sec = sectionOf(hit.sec)
        if (sec) press(sec.id, sec.offset + (hit.row - 1))
      }
    })

    surface.onKey(e => {
      const id = focusId()
      const sec = sectionOf(id ?? '')
      if (!sec) return
      const s = cur()
      if (e.key === 'return' || e.key === ' ') {
        if (sec.total > 0) toggle(sec.id)
      } else if (e.key === 'a') {
        addRow(sec.id)
      } else if (e.key === 'n') {
        addSection()
      } else {
        const maxScroll = Math.max(0, sec.total - cap)
        if (sec.expanded && (e.key === 'down' || e.key === 'j')) {
          surface.setState({ ...s, focus: sec.id })
          scrollTo(sec.id, Math.min(maxScroll, sec.offset + 1))
        } else if (sec.expanded && (e.key === 'up' || e.key === 'k')) {
          surface.setState({ ...s, focus: sec.id })
          scrollTo(sec.id, Math.max(0, sec.offset - 1))
        }
      }
    })

    // Fit the tree to TREE_LIMIT without losing a section. Every header is drawn: the title and meta are trimmed
    // (in steps) only as far as all headers fit in 60% of the limit. The expanded rows then take what is left, and
    // are cut before anything else. The sizes are measured on the elements, since each element adds its own props.
    const measure = (x: unknown): number => JSON.stringify(x)?.length ?? 0
    const CAPS: [number, number][] = [[160, 400], [80, 160], [40, 60], [24, 0]]
    let [titleCap, metaCap] = CAPS[CAPS.length - 1] ?? [24, 0]
    for (const [t, m] of CAPS) {
      const headers = props.sections.reduce((n, sec) => n + measure(sectionBlock(sec, 0, t, m)), 0)
      if (headers <= TREE_LIMIT * 0.6) { titleCap = t; metaCap = m; break }
    }
    let budget = TREE_LIMIT - props.sections.reduce((n, sec) => n + measure(sectionBlock(sec, 0, titleCap, metaCap)), 0)
    const blocks: RenderElement[] = []
    const kept: ExpanderView[] = []
    for (const sec of props.sections) {
      const base = measure(sectionBlock(sec, 0, titleCap, metaCap))
      let rows = 0
      if (sec.expanded && sec.items.length > 0) {
        // the most rows of this section that still fit: the size grows with the rows, so search for the largest
        const fits = (n: number) => measure(sectionBlock(sec, n, titleCap, metaCap)) - base <= budget
        let lo = 0
        let hi = sec.items.length
        while (lo < hi) {
          const mid = Math.floor((lo + hi + 1) / 2)
          if (fits(mid)) lo = mid
          else hi = mid - 1
        }
        rows = lo
        budget -= measure(sectionBlock(sec, rows, titleCap, metaCap)) - base
      }
      blocks.push(...sectionBlock(sec, rows, titleCap, metaCap))
      kept.push({ ...sec, items: sec.items.slice(0, rows) })
    }
    drawn = kept
    const b = blocks
    // $.ui.log is hooks-only; the surface sends the tree's text up with post, and register.tsx logs it (ui.message)
    const text = dump(b)
    if (text !== lastDump) {
      lastDump = text
      surface.post({ debug: text })
    }

    return <Box flexDirection="column">{b}</Box>
  }
  catch (error) {
    return (<Text>Error</Text>)
  }
}

export default Expander
