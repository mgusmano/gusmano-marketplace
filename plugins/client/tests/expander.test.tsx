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

const expanderOf = async (ui: any) => JSON.stringify(await ui.drawn({ in: 'expander' }))

const clickTitle = async (ui: any, y: number) => {
  await ui.pointer({ type: 'down', x: 2, y, button: 'left', in: 'expander' })
  await ui.pointer({ type: 'up', x: 2, y, button: 'left', in: 'expander' })
}

for (const surface of ['terminal', 'desktop'] as const) {
  test(`expander expands and collapses on title click (${surface})`, { timeoutMs: 20_000 }, async ($, on) => {
    const clock = world(on)
    await $.session.start({ cwd: '/tmp', surface, isInteractive: true })
    await clock.settle()
    const ui = await $.ui.mount({ plugin: 'client', surface, component: 'Pane', requestId: 'client', props: paneProps(60) })
    await clock.settle()
    const before = await expanderOf(ui)
    expect(before).toContain('activity log')
    expect(before).not.toContain('session.start')
    // click the title row
    await clickTitle(ui, 0)
    await clock.settle()
    const after = await expanderOf(ui)
    expect(after).toContain('session.start')
    expect(after).toContain('ready')
    // click the title row again to collapse
    await clickTitle(ui, 0)
    await clock.settle()
    expect(await expanderOf(ui)).not.toContain('session.start')
    await ui.unmount()
  })

  test(`expander adds rows from the host (${surface})`, { timeoutMs: 20_000 }, async ($, on) => {
    const clock = world(on)
    await $.session.start({ cwd: '/tmp', surface, isInteractive: true })
    await clock.settle()
    const ui = await $.ui.mount({ plugin: 'client', surface, component: 'Pane', requestId: 'client', props: paneProps(60) })
    await clock.settle()
    expect(await expanderOf(ui)).not.toContain('item 3')
    // the host button adds a row to the latest section (notes, collapsed at
    // start: title row 1 sits under the collapsed activity log)
    await ui.press({ key: 'host-add-row-latest' })
    await clock.settle()
    await clickTitle(ui, 1)
    await clock.settle()
    expect(await expanderOf(ui)).toContain('item 3')
    // the row survives collapsing and re-expanding its section
    await clickTitle(ui, 1)
    await clock.settle()
    await clickTitle(ui, 1)
    await clock.settle()
    expect(await expanderOf(ui)).toContain('item 3')
    await ui.unmount()
  })

  test(`expander adds independent sections (${surface})`, { timeoutMs: 20_000 }, async ($, on) => {
    const clock = world(on)
    await $.session.start({ cwd: '/tmp', surface, isInteractive: true })
    await clock.settle()
    const ui = await $.ui.mount({ plugin: 'client', surface, component: 'Pane', requestId: 'client', props: paneProps(60) })
    await clock.settle()
    const before = await expanderOf(ui)
    expect(before).toContain('activity log')
    expect(before).toContain('notes')
    // both start collapsed; notes' rows show after expanding its title (row 1)
    await clickTitle(ui, 1)
    await clock.settle()
    expect(await expanderOf(ui)).toContain('first note')
    // the host button adds a section; the previous last one collapses
    await ui.press({ key: 'host-add-section' })
    await clock.settle()
    const withSec = await expanderOf(ui)
    expect(withSec).toContain('section 3')
    expect(withSec).not.toContain('first note')
    // rows added from the host land in the latest section only
    await ui.press({ key: 'host-add-row-latest' })
    await clock.settle()
    await ui.press({ key: 'host-add-row-latest' })
    await clock.settle()
    const afterAdd = await expanderOf(ui)
    expect(afterAdd).toContain('item 1')
    expect(afterAdd).toContain('item 2')
    // expanding the activity log does not touch the new section's rows
    await clickTitle(ui, 0)
    await clock.settle()
    expect(await expanderOf(ui)).toContain('ready')
    expect(await expanderOf(ui)).toContain('item 2')
    // collapsing the activity log again keeps them too
    await clickTitle(ui, 0)
    await clock.settle()
    const afterCollapse = await expanderOf(ui)
    expect(afterCollapse).not.toContain('ready')
    expect(afterCollapse).toContain('item 2')
    // collapse section 3 (title is now row 2: log, notes, section 3), then reopen
    await clickTitle(ui, 2)
    await clock.settle()
    expect(await expanderOf(ui)).not.toContain('item 2')
    await clickTitle(ui, 2)
    await clock.settle()
    expect(await expanderOf(ui)).toContain('item 2')
    await ui.unmount()
  })

  test(`expander expands and collapses all from the host (${surface})`, { timeoutMs: 20_000 }, async ($, on) => {
    const clock = world(on)
    await $.session.start({ cwd: '/tmp', surface, isInteractive: true })
    await clock.settle()
    const ui = await $.ui.mount({ plugin: 'client', surface, component: 'Pane', requestId: 'client', props: paneProps(60) })
    await clock.settle()
    expect(await expanderOf(ui)).not.toContain('session.start')
    // one toggle button: mixed state reads "Expand" and expands everything
    await ui.press({ key: 'host-toggle-all' })
    await clock.settle()
    const expanded = await expanderOf(ui)
    expect(expanded).toContain('session.start')
    expect(expanded).toContain('first note')
    // now everything is expanded, so the same button reads "Collapse"
    const drawnAll = JSON.stringify(await ui.drawn())
    expect(drawnAll).toContain('"key":"host-toggle-all"')
    expect(drawnAll).toContain('Collapse')
    await ui.press({ key: 'host-toggle-all' })
    await clock.settle()
    const collapsed = await expanderOf(ui)
    expect(collapsed).toContain('activity log')
    expect(collapsed).toContain('notes')
    expect(collapsed).not.toContain('session.start')
    expect(collapsed).not.toContain('first note')
    await ui.unmount()
  })

  test(`expander test button makes ten sections of 5-10 rows (${surface})`, { timeoutMs: 20_000 }, async ($, on) => {
    const clock = world(on)
    await $.session.start({ cwd: '/tmp', surface, isInteractive: true })
    await clock.settle()
    const ui = await $.ui.mount({ plugin: 'client', surface, component: 'Pane', requestId: 'client', props: paneProps(60) })
    await clock.settle()
    await ui.press({ key: 'host-test' })
    // ten rounds, each a section plus 5-10 rows, a clock second apart
    for (let i = 0; i < 130; i++) await clock.advance(1000)
    await clock.settle()
    const drawn = await expanderOf(ui)
    // seeds are section 1 and 2, so ten rounds end at section 12
    expect(drawn).toContain('section 3')
    expect(drawn).toContain('section 12')
    const rows = drawn.match(/item \d+/g) ?? []
    // each round collapsed the section before it, so only the last one's rows draw
    expect(rows.length).toBeGreaterThanOrEqual(5)
    expect(rows.length).toBeLessThanOrEqual(10)
    await ui.unmount()
  })

  test(`expander survives a pane re-render (${surface})`, { timeoutMs: 20_000 }, async ($, on) => {
    const clock = world(on)
    await $.session.start({ cwd: '/tmp', surface, isInteractive: true })
    await clock.settle()
    const ui = await $.ui.mount({ plugin: 'client', surface, component: 'Pane', requestId: 'client', props: paneProps(60) })
    await clock.settle()
    await clickTitle(ui, 0)
    await clock.settle()
    expect(await expanderOf(ui)).toContain('ready')
    await $.ui.render({ surface, component: 'Pane', requestId: 'client', props: paneProps(60) })
    await clock.settle()
    expect(await expanderOf(ui)).toContain('ready')
    await ui.unmount()
  })
}
