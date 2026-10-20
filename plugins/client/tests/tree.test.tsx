import { expect, mock, test } from 'claude-code/testing'

const paneProps = (bodyColumns: number) =>
  ({ title: 'Test', isFocused: false, bodyColumns, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} }) as any

function world(on: any) {
  mock.env(on, {})
  const clock = mock.clock(on, { now: 1_800_000_000_000 })
  mock.store(on)
  on('command.register', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.log', () => ({ value: undefined }))
  on('session.start', (_$: any, e: any) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: '/tmp' }))
  on('session.id', () => ({ value: 'test' }))
  return clock
}

const treeOf = async (ui: any) => JSON.stringify(await ui.drawn({ in: 'tree' }))

// the register's example decides which Client is mounted; skip when the tree one is commented out
const treeMounted = async (ui: any) => {
  try {
    await ui.drawn({ in: 'tree' })
    return true
  } catch {
    return false
  }
}

for (const surface of ['terminal', 'desktop'] as const) {
  test(`tree root node expands when clicked (${surface})`, { timeoutMs: 20_000 }, async ($, on) => {
    const clock = world(on)
    await $.session.start({ cwd: '/tmp', surface, isInteractive: true })
    await clock.settle()
    const ui = await $.ui.mount({ plugin: 'client', surface, component: 'Pane', requestId: 'client', props: paneProps(60) })
    await clock.settle()
    if (!(await treeMounted(ui))) return
    const before = await treeOf(ui)
    expect(before).toContain('plugins')
    expect(before).not.toContain('sencha')
    // rows: 0 src, 1 app.ts, 2 ui, 3 tree-view.tsx, 4 rows.tsx, 5 button.tsx, 6 index.ts, 7 package.json, 8 README.md, 9 plugins
    await ui.pointer({ type: 'down', x: 3, y: 9, button: 'left', in: 'tree' })
    await ui.pointer({ type: 'up', x: 3, y: 9, button: 'left', in: 'tree' })
    await clock.settle()
    const after = await treeOf(ui)
    expect(after).toContain('sencha')
    // collapse again
    await ui.pointer({ type: 'down', x: 3, y: 9, button: 'left', in: 'tree' })
    await ui.pointer({ type: 'up', x: 3, y: 9, button: 'left', in: 'tree' })
    await clock.settle()
    expect(await treeOf(ui)).not.toContain('sencha')
    await ui.unmount()
  })

  test(`tree first root row toggles (${surface})`, { timeoutMs: 20_000 }, async ($, on) => {
    const clock = world(on)
    await $.session.start({ cwd: '/tmp', surface, isInteractive: true })
    await clock.settle()
    const ui = await $.ui.mount({ plugin: 'client', surface, component: 'Pane', requestId: 'client', props: paneProps(60) })
    await clock.settle()
    if (!(await treeMounted(ui))) return
    // row 0 = src, starts expanded per props.expanded
    expect(await treeOf(ui)).toContain('app.ts')
    await ui.pointer({ type: 'down', x: 3, y: 0, button: 'left', in: 'tree' })
    await ui.pointer({ type: 'up', x: 3, y: 0, button: 'left', in: 'tree' })
    await clock.settle()
    expect(await treeOf(ui)).not.toContain('app.ts')
    await ui.pointer({ type: 'down', x: 3, y: 0, button: 'left', in: 'tree' })
    await ui.pointer({ type: 'up', x: 3, y: 0, button: 'left', in: 'tree' })
    await clock.settle()
    expect(await treeOf(ui)).toContain('app.ts')
    await ui.unmount()
  })

  test(`tree expansion survives a pane re-render (${surface})`, { timeoutMs: 20_000 }, async ($, on) => {
    const clock = world(on)
    await $.session.start({ cwd: '/tmp', surface, isInteractive: true })
    await clock.settle()
    const ui = await $.ui.mount({ plugin: 'client', surface, component: 'Pane', requestId: 'client', props: paneProps(60) })
    await clock.settle()
    if (!(await treeMounted(ui))) return
    await ui.pointer({ type: 'down', x: 3, y: 9, button: 'left', in: 'tree' })
    await ui.pointer({ type: 'up', x: 3, y: 9, button: 'left', in: 'tree' })
    await clock.settle()
    expect(await treeOf(ui)).toContain('sencha')
    // the pane re-renders (focus change, transcript update, ...) — does the expansion survive?
    await $.ui.render({ surface, component: 'Pane', requestId: 'client', props: paneProps(60) })
    await clock.settle()
    expect(await treeOf(ui)).toContain('sencha')
    await ui.unmount()
  })
}
