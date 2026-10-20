import type { ClientModule, RenderElement } from 'claude-code'
import { CHEVRON_CLOSED, CHEVRON_OPEN, fileIcon } from './icons'

export type TreeNodeInput = {
  id?: string
  name: string
  kind?: 'dir' | 'file' | 'link'
  children?: TreeNodeInput[]
  badge?: string
  badgeColor?: string
  color?: string
}

export type FlatNodeInput = {
  id: string
  parent?: string
  name: string
  kind?: 'dir' | 'file' | 'link'
  badge?: string
  badgeColor?: string
  color?: string
}

export type TreeViewProps = {
  data?: TreeNodeInput[]
  nodes?: FlatNodeInput[]
  root?: string
  expanded?: string[]
  active?: string
  activeBg?: string
  hoverBg?: string
  indent?: number
  unicode?: boolean
}

type TNode = {
  id: string
  parent: string
  name: string
  kind: 'dir' | 'file' | 'link'
  hidden: boolean
  mtime: number
  size: number
  loaded: boolean
  badge?: string
  badgeColor?: string
  color?: string
}

type Row = { node: TNode; depth: number; open: boolean }
type Local = { expanded: string[]; cursor: number; scroll: number; hover: number }

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

function join(dir: string, name: string): string {
  return dir === '' ? name : dir.endsWith('/') ? dir + name : `${dir}/${name}`
}

function parentOf(id: string): string {
  const i = id.lastIndexOf('/')
  return i <= 0 ? '' : id.slice(0, i)
}

function fromNested(items: TreeNodeInput[], parent: string, out: TNode[]): void {
  for (const it of items) {
    const id = it.id ?? join(parent, it.name)
    // a `children` key marks a dir even when the list is empty (lazy trees)
    const kind = it.kind ?? (it.children !== undefined ? 'dir' : 'file')
    out.push({
      id,
      parent,
      name: it.name,
      kind,
      hidden: it.name.startsWith('.'),
      mtime: 0,
      size: 0,
      loaded: Boolean(it.children?.length),
      badge: it.badge,
      badgeColor: it.badgeColor,
      color: it.color,
    })
    if (it.children?.length) fromNested(it.children, id, out)
  }
}

function buildNodes(props: TreeViewProps): TNode[] {
  const out: TNode[] = []
  if (props.data?.length) {
    fromNested(props.data, props.root ?? '', out)
    return out
  }
  const explicit = new Set<string>()
  for (const n of props.nodes ?? []) {
    if (n.kind) explicit.add(n.id)
    out.push({
      id: n.id,
      parent: n.parent ?? parentOf(n.id),
      name: n.name,
      kind: n.kind ?? 'file',
      hidden: n.name.startsWith('.'),
      mtime: 0,
      size: 0,
      loaded: false,
      badge: n.badge,
      badgeColor: n.badgeColor,
      color: n.color,
    })
  }
  // any node other nodes hang off is a dir, unless the input said otherwise
  const parents = new Set(out.map(n => n.parent))
  for (const n of out) if (!explicit.has(n.id) && parents.has(n.id)) n.kind = 'dir'
  out.sort(
    (a, b) =>
      collator.compare(a.parent, b.parent) ||
      (a.kind === 'dir' ? 0 : 1) - (b.kind === 'dir' ? 0 : 1) ||
      collator.compare(a.name, b.name),
  )
  return out
}

function flatten(nodes: TNode[], root: string, open: Set<string>): Row[] {
  const kids = new Map<string, TNode[]>()
  for (const n of nodes) {
    const list = kids.get(n.parent)
    if (list) list.push(n)
    else kids.set(n.parent, [n])
  }
  const rows: Row[] = []
  const walk = (dir: string, depth: number) => {
    for (const n of kids.get(dir) ?? []) {
      const isOpen = n.kind === 'dir' && open.has(n.id)
      rows.push({ node: n, depth, open: isOpen })
      if (isOpen && kids.has(n.id)) walk(n.id, depth + 1)
    }
  }
  walk(root, 0)
  return rows
}

const TreeView: ClientModule<TreeViewProps, Local> = (props, surface) => {
  const { Box, Text } = surface.elements
  let state = surface.state
  if (state === undefined) {
    state = { expanded: props.expanded ?? [], cursor: 0, scroll: 0, hover: -1 }
    surface.setState(state)
  }
  const indent = props.indent ?? 2
  const caretOpen = props.unicode ? '▾' : CHEVRON_OPEN
  const caretClosed = props.unicode ? '▸' : CHEVRON_CLOSED
  const root = props.root ?? ''
  const rows = flatten(buildNodes(props), root, new Set(state.expanded))
  const room = surface.rows > 0 ? surface.rows : Math.max(1, rows.length)
  const cursor = Math.max(0, Math.min(state.cursor, rows.length - 1))
  let scroll = Math.max(0, Math.min(state.scroll, Math.max(0, rows.length - room)))
  if (cursor < scroll) scroll = cursor
  if (cursor >= scroll + room) scroll = Math.max(0, cursor - room + 1)
  const shown = rows.slice(scroll, scroll + room)

  surface.onPointer(e => {
    const cur = surface.state ?? state
    const i = scroll + e.y
    const row = rows[i]
    if (e.type === 'leave' || e.y < 0 || e.y >= shown.length) {
      if (cur.hover !== -1) surface.setState({ ...cur, hover: -1 })
      return
    }
    if (e.type === 'move' && !e.button && cur.hover !== i) surface.setState({ ...cur, hover: i })
    if (e.type !== 'down' || (e.button ?? 'left') !== 'left' || !row) return
    if (row.node.kind === 'dir') {
      const open = new Set(cur.expanded)
      open.has(row.node.id) ? open.delete(row.node.id) : open.add(row.node.id)
      surface.setState({ ...cur, expanded: [...open], cursor: i, hover: i })
      surface.post({ toggle: row.node.id, open: open.has(row.node.id) })
    } else {
      surface.setState({ ...cur, cursor: i, hover: i })
      surface.post({ press: row.node.id })
    }
  })

  surface.onKey(e => {
    const cur = surface.state ?? state
    const move = (d: number) =>
      surface.setState({ ...cur, cursor: Math.max(0, Math.min(rows.length - 1, cursor + d)) })
    const node = rows[cursor]?.node
    if (e.key === 'up' || e.key === 'k') move(-1)
    else if (e.key === 'down' || e.key === 'j') move(1)
    else if (e.key === 'pageup') move(-room)
    else if (e.key === 'pagedown') move(room)
    else if (e.key === 'home') surface.setState({ ...cur, cursor: 0 })
    else if (e.key === 'end') surface.setState({ ...cur, cursor: Math.max(0, rows.length - 1) })
    else if ((e.key === 'right' || e.key === 'l') && node?.kind === 'dir' && !cur.expanded.includes(node.id))
      surface.setState({ ...cur, expanded: [...cur.expanded, node.id] })
    else if ((e.key === 'left' || e.key === 'h') && node) {
      if (node.kind === 'dir' && cur.expanded.includes(node.id))
        surface.setState({ ...cur, expanded: cur.expanded.filter(x => x !== node.id) })
      else {
        const at = rows.findIndex(r => r.node.id === node.parent)
        if (at >= 0) surface.setState({ ...cur, cursor: at })
      }
    } else if (e.key === 'return' && node) {
      if (node.kind === 'dir')
        surface.setState({
          ...cur,
          expanded: cur.expanded.includes(node.id)
            ? cur.expanded.filter(x => x !== node.id)
            : [...cur.expanded, node.id],
        })
      surface.post({ press: node.id })
    }
  })

  if (rows.length === 0) return <Box flexDirection="column"><Text dimColor>{'  (empty)'}</Text></Box>

  const rowEl = (r: Row, i: number): RenderElement => {
    const n = r.node
    const isDir = n.kind === 'dir'
    const caret = isDir ? (r.open ? caretOpen : caretClosed) : ' '
    const icon = fileIcon(n, r.open, false)
    const bg =
      props.active && n.id === props.active
        ? props.activeBg
        : scroll + i === state.hover
          ? props.hoverBg
          : undefined
    return (
      <Box flexDirection="row" height={1} overflow="hidden" backgroundColor={bg}>
        <Text>{' '.repeat(indent * r.depth)}</Text>
        <Text> {caret} </Text>
        <Text color={n.color}>{icon}</Text>
        <Text color={n.color}>{` ${n.name}`}</Text>
        <Box flexGrow={1} />
        {n.badge ? <Text color={n.badgeColor}>{n.badge}</Text> : null}
      </Box>
    )
  }

  return <Box flexDirection="column">{shown.map(rowEl)}</Box>
}

export default TreeView
