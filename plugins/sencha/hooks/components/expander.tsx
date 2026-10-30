import type { ClientModule, RenderElement } from 'claude-code'

import { CHEVRON_CLOSED, CHEVRON_OPEN, CIRCLE_FILLED, CIRCLE_NERD } from './icons'

// rows of an expanded section the host sends at a time; scrolling moves this window
export const WINDOW = 200

export type ExpanderItem = { text: string; color?: string; dim?: boolean; italic?: boolean }
export type ExpanderStatus = 'runs' | 'done' | 'fail'
export type ExpanderSection = {
  id: string
  title: string
  message?: string
  status?: ExpanderStatus
  subject?: string
  detail?: string
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

// Presentational: sections, rows and expanded flags arrive as props and every
// change leaves as an event for the host to own. Only view state (hover,
// drag, focus) lives here; the scroll offset is the host's, sent in each section.
const Expander: ClientModule<ExpanderProps, Local> = (props, surface) => {
  const { Box, Text } = surface.elements
  try {
    let state = surface.state
    if (state === undefined) {
      //surface.post({ log: 'in Expander' })
      state = { hover: null, drag: false, focus: props.sections[0]?.id ?? null }
      surface.setState(state)
    }

    const cur = () => surface.state ?? state
    const caretOpen = props.unicode ? '▼' : CHEVRON_OPEN
    const caretClosed = props.unicode ? '▶' : CHEVRON_CLOSED
    const cap = WINDOW
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
      props.sections.forEach(s => {
        list.push({ sec: s.id, row: 0 })
        if (s.expanded) toRows(s.items).forEach((_, ii) => list.push({ sec: s.id, row: 1 + ii }))
      })
      return list
    }
    const hoverOn = (sec: string, row: number) =>
      state.hover !== null && state.hover.sec === sec && state.hover.row === row
    const sectionBlock = (sec: ExpanderView): RenderElement => {
      try {
        const items = toRows(sec.items)
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
        const right = sec.subject
        //return (<Text>SectionBlock title:{sec.title} message:{sec.message} detail:{sec.detail?.length}</Text>)
        return (
          <Box key={sec.id} flexDirection="column">
            <Box
              flexDirection="row"
              height={1}
              overflow="hidden"
              backgroundColor={hoverOn(sec.id, 0) ? props.hoverBg : undefined}
            >
              <Box width={17} flexShrink={0} flexDirection="row">
                {/* fixed 3-column gutter so the title starts at column 3 whatever the glyph's width */}
                <Box width={3} flexShrink={0}>
                  <Text color={titleColor}>{` ${glyph}`}</Text>
                </Box>
                <Text color={titleColor} wrap="wrap">{sec.title}</Text>
              </Box>
              {sec.message ? <Box flexShrink={1} overflow="hidden"><Text color="white" wrap="wrap">{`${sec.message}`}</Text></Box> : null}
              {sec.detail ? <Box flexShrink={1} overflow="hidden"><Text color="#c4b5fd" italic wrap="wrap">{` ${sec.detail}`}</Text></Box> : null}
              {right ? <Text color={titleColor} dimColor wrap="wrap">{right}</Text> : null}
              <Box flexGrow={1} />
            </Box>
            {/* {shown.map((it, i) => (<Text>{it.text}</Text>
            ))} */}
            {shown.map((it, i) => (
              <Box
                key={`${sec.id}-${i}`}
                flexDirection="row"
                height={1}
                overflow="hidden"
                backgroundColor={hoverOn(sec.id, 1 + i) ? props.hoverBg : undefined}
              >
                <Box marginLeft={3} flexShrink={1} overflow="hidden">
                  <Text color={it.color ?? props.itemColor} dimColor={it.dim} italic={it.italic} wrap="wrap">{it.text}</Text>
                </Box>
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

    return <Box flexDirection="column">{props.sections.map(sectionBlock)}</Box>
  }
  catch (error) {
    return (<Text>Error</Text>)
  }
}

export default Expander
