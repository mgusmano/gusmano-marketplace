import type { ClientModule, RenderElement } from 'claude-code'
import { CHEVRON_CLOSED, CHEVRON_OPEN } from './icons'

export type ExpanderItem = { text: string; color?: string; dim?: boolean }

export type ExpanderStatus = 'runs' | 'done' | 'fail'

export type ExpanderSection = {
  id: string
  title: string
  message?: string
  status?: ExpanderStatus
  subject?: string
  items?: (string | ExpanderItem)[]
  expanded?: boolean
}

export type ExpanderProps = {
  sections: ExpanderSection[]
  titleColor?: string
  itemColor?: string
  hoverBg?: string
  unicode?: boolean
  max?: number
}

type Row = { text: string; color?: string; dim?: boolean }
type Local = {
  hover: { sec: string; row: number } | null
  drag: string | false
  scrolls: Record<string, number>
  focus: string | null
}

const toRows = (items?: (string | ExpanderItem)[]): Row[] =>
  (items ?? []).map(i => (typeof i === 'string' ? { text: i } : i))

// Presentational: sections, rows and expanded flags arrive as props and every
// change leaves as an event for the host to own. Only view state (hover,
// scroll, drag) lives here.
const Expander: ClientModule<ExpanderProps, Local> = (props, surface) => {
  const { Box, Text } = surface.elements
  let state = surface.state
  if (state === undefined) {
    state = { hover: null, drag: false, scrolls: {}, focus: props.sections[0]?.id ?? null }
    surface.setState(state)
  }
  const cur = () => surface.state ?? state
  const caretOpen = props.unicode ? '▾' : CHEVRON_OPEN
  const caretClosed = props.unicode ? '▸' : CHEVRON_CLOSED
  const cap = Math.max(1, Math.min(props.max ?? Infinity, 500))

  const sectionOf = (id: string) => props.sections.find(s => s.id === id)
  const focusId = (): string | null => {
    const s = cur()
    return s.focus !== null && sectionOf(s.focus) ? s.focus : props.sections[0]?.id ?? null
  }
  const toggle = (id: string) => surface.post({ toggle: { section: id, open: !sectionOf(id)?.expanded } })
  const addRow = (id: string) => surface.post({ addRow: { section: id } })
  const addSection = () => surface.post({ addSection: true })
  const press = (id: string, index: number) => surface.post({ press: { section: id, index } })

  // one entry per drawn row: { section id, row within it }
  const hits = (): { sec: string; row: number }[] => {
    const list: { sec: string; row: number }[] = []
    props.sections.forEach(s => {
      list.push({ sec: s.id, row: 0 })
      if (s.expanded) toRows(s.items).forEach((_, ii) => list.push({ sec: s.id, row: 1 + ii }))
    })
    return list
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
        const items = toRows(sec.items)
        const maxScroll = Math.max(0, items.length - cap)
        const start = rows.findIndex(r => r.sec === sec.id && r.row === 1)
        const span = Math.max(1, Math.min(cap, items.length) - 1)
        const rel = Math.max(0, Math.min(span, e.y - start))
        const to = maxScroll === 0 ? 0 : Math.round((rel / span) * maxScroll)
        surface.setState({ ...s, scrolls: { ...s.scrolls, [sec.id]: to }, drag: sec.id, hover: null })
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
      if (sec && toRows(sec.items).length > cap) {
        surface.setState({ ...s, drag: hit.sec, hover: null })
        return
      }
    }
    if (hit.row === 0) {
      toggle(hit.sec)
      return
    }
    if (hit.row >= 1) {
      const sec = sectionOf(hit.sec)
      if (sec) press(sec.id, (s.scrolls[sec.id] ?? 0) + (hit.row - 1))
    }
  })

  surface.onKey(e => {
    const id = focusId()
    const sec = sectionOf(id ?? '')
    if (!sec) return
    const s = cur()
    if (e.key === 'return' || e.key === ' ') {
      toggle(sec.id)
    } else if (e.key === 'a') {
      addRow(sec.id)
    } else if (e.key === 'n') {
      addSection()
    } else {
      const items = toRows(sec.items)
      const maxScroll = Math.max(0, items.length - cap)
      const from = s.scrolls[sec.id] ?? 0
      if (sec.expanded && (e.key === 'down' || e.key === 'j')) {
        surface.setState({ ...s, scrolls: { ...s.scrolls, [sec.id]: Math.min(maxScroll, from + 1) }, focus: sec.id })
      } else if (sec.expanded && (e.key === 'up' || e.key === 'k')) {
        surface.setState({ ...s, scrolls: { ...s.scrolls, [sec.id]: Math.max(0, from - 1) }, focus: sec.id })
      }
    }
  })

  const hoverOn = (sec: string, row: number) =>
    state.hover !== null && state.hover.sec === sec && state.hover.row === row

  const sectionBlock = (sec: ExpanderSection): RenderElement => {
    try {
      const items = toRows(sec.items)
      const scroll = state.scrolls[sec.id] ?? 0
      const maxScroll = Math.max(0, items.length - cap)
      const at = Math.max(0, Math.min(scroll, maxScroll))
      const clipped = Boolean(sec.expanded) && items.length > cap
      const shown = sec.expanded ? items.slice(at, at + cap) : []
      const barSize = clipped ? Math.max(1, Math.round((cap * cap) / items.length)) : 0
      const barPos = clipped && maxScroll > 0 ? Math.round((at * (cap - barSize)) / maxScroll) : 0
      const titleColor =
        sec.status === 'runs' ? 'warning'
          : sec.status === 'done' ? 'success'
            : sec.status === 'fail' ? 'error'
              : props.titleColor
      const right = sec.subject
      return (
        <Box key={sec.id} flexDirection="column">
          <Box
            flexDirection="row"
            height={1}
            overflow="hidden"
            backgroundColor={hoverOn(sec.id, 0) ? props.hoverBg : undefined}
          >
            <Box width={15} flexShrink={0}>
              <Text color={titleColor} wrap="truncate">{` ${sec.expanded ? caretOpen : caretClosed} ${sec.title}`}</Text>
            </Box>
            {right
              ? <Text color={titleColor} dimColor wrap="truncate">{right}</Text>
              : sec.message
                ? <Text color="white">{`${sec.message}`}</Text>
                : null}
            <Box flexGrow={1} />
          </Box>
          {shown.map((it, i) => (
            <Box
              key={`${sec.id}-${i}`}
              flexDirection="row"
              height={1}
              overflow="hidden"
              backgroundColor={hoverOn(sec.id, 1 + i) ? props.hoverBg : undefined}
            >
              <Text color={it.color ?? props.itemColor} dimColor={it.dim}>{`   ${it.text}`}</Text>
              <Box flexGrow={1} />
              {clipped ? <Text>{i >= barPos && i < barPos + barSize ? '┃' : '│'}</Text> : null}
            </Box>
          ))}
        </Box>
      )
    }
    catch (error: any) {
      return (<Text>ERROR: {error.toString()}</Text>)
    }
  }

  return <Box flexDirection="column">{props.sections.map(sectionBlock)}</Box>
}

export default Expander
