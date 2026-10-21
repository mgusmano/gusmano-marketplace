import { expect, mock, test } from 'claude-code/testing'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25"><rect width="25" height="25"/></svg>'
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const paneProps = (bodyColumns: number) =>
  ({ title: 'Sencha', isFocused: false, bodyColumns, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} }) as any

function world(on: any) {
  mock.env(on, {})
  const clock = mock.clock(on, { now: 1_800_000_000_000 })
  mock.store(on)
  on('command.register', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.close', () => ({ value: undefined }))
  on('ui.log', () => ({ value: undefined }))
  on('ui.status', () => ({ value: undefined }))
  on('fs.read', ($: any, e: any) => {
    const path = String(e.path)
    if (path.endsWith('plugin.json')) return { value: '{"version":"0.0.13"}' }
    if (path.endsWith('.svg')) return { value: SVG }
    if (path.endsWith('.png')) return { value: { base64: PNG_BASE64 } }
    return { value: '' }
  })
  on('session.start', (_$: any, e: any) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: '/tmp' }))
  on('session.id', () => ({ value: 'test' }))
  on('session.surfaces', () => ({ value: ['desktop'] }))
  return clock
}

for (const surface of ['desktop', 'terminal'] as const) {
  test(`sencha pane draws on ${surface}`, { timeoutMs: 20_000 }, async ($, on) => {
    const clock = world(on)
    await $.session.start({ cwd: '/tmp', surface, isInteractive: true })
    await clock.settle()
    const ui = await $.ui.mount({ plugin: 'sencha', surface, component: 'Pane', requestId: 'sencha', props: paneProps(98) })
    await clock.settle()
    const drawn = JSON.stringify(await ui.drawn())
    expect(drawn).toContain('Sencha')
    expect(drawn).toContain('session.start')
    const expander = JSON.stringify(await ui.drawn({ in: 'expander' }))
    expect(expander).toContain('"color":"cyan"')
    expect(expander).toContain('"color":"white"')
    expect(expander).toContain('"width":')
    expect(expander).toContain('"wrap":"truncate"')
    await ui.unmount()
  })
}

test('sencha pane draws fullscreen on desktop', { timeoutMs: 20_000 }, async ($, on) => {
  const clock = world(on)
  await $.session.start({ cwd: '/tmp', surface: 'desktop', isInteractive: true })
  await clock.settle()
  const props = {
    title: 'Sencha',
    isFocused: false,
    bodyColumns: 98,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 51 },
    view: {},
    viewport: { columns: 106, rows: 58, isFullscreen: true },
  } as any
  const ui = await $.ui.mount({ plugin: 'sencha', surface: 'desktop', component: 'Pane', requestId: 'sencha', props })
  await clock.settle()
  const drawn = JSON.stringify(await ui.drawn())
  expect(drawn).toContain('Sencha')
  expect(drawn).toContain('session.start')
  await ui.unmount()
})

for (const surface of ['desktop', 'terminal'] as const) {
  test(`sencha expander section expands and collapses on click (${surface})`, { timeoutMs: 20_000 }, async ($, on) => {
    const clock = world(on)
    await $.session.start({ cwd: '/tmp', surface, isInteractive: true })
    await clock.settle()
    const ui = await $.ui.mount({ plugin: 'sencha', surface, component: 'Pane', requestId: 'sencha', props: paneProps(98) })
    await clock.settle()
    const drawn = () => ui.drawn({ in: 'expander' }).then(r => JSON.stringify(r))
    expect(await drawn()).toContain('▾')
    await ui.pointer({ type: 'down', x: 2, y: 0, button: 'left', in: 'expander' })
    await ui.pointer({ type: 'up', x: 2, y: 0, button: 'left', in: 'expander' })
    await clock.settle()
    expect(await drawn()).toContain('▸')
    expect(await drawn()).not.toContain('▾')
    await ui.pointer({ type: 'down', x: 2, y: 0, button: 'left', in: 'expander' })
    await ui.pointer({ type: 'up', x: 2, y: 0, button: 'left', in: 'expander' })
    await clock.settle()
    expect(await drawn()).toContain('▾')
    await ui.unmount()
  })
}

test('sencha tool call sections go yellow while running and green when done', { timeoutMs: 20_000 }, async ($, on) => {
  const clock = world(on)
  let release: () => void = () => {}
  const gate = new Promise<void>(resolve => { release = resolve })
  on('tool.call', () => gate.then(() => ({ result: { ok: true } })))
  await $.session.start({ cwd: '/tmp', surface: 'desktop', isInteractive: true })
  await clock.settle()
  const ui = await $.ui.mount({ plugin: 'sencha', surface: 'desktop', component: 'Pane', requestId: 'sencha', props: paneProps(98) })
  await clock.settle()
  const drawn = () => ui.drawn({ in: 'expander' }).then(r => JSON.stringify(r))

  const pending = $.tool.call({ tool: 'Bash', command: 'ls -la', tool_use_id: 'call1' })
  await clock.settle()
  const running = await drawn()
  expect(running).toContain('"color":"warning"')
  expect(running).toContain('[" ▾ Bash"]')
  expect(running).toContain('["ls -la"]')
  expect(running).not.toContain('[" · ls -la"]')
  expect(running).not.toContain('"color":"white"},"children":["Bash"]')

  release()
  await pending
  await clock.settle()
  const done = await drawn()
  expect(done).toContain('"color":"success"')
  expect(done).not.toContain('"color":"warning"')
  expect(done).toContain('["ls -la"]')
  expect(done).not.toContain('[" · ls -la"]')
  const full = JSON.stringify(await ui.drawn())
  expect(full).toContain('"width":34')
  expect(full).toContain('tool call')
  expect(full).toContain('[" · ls -la"]')
  expect(done).not.toContain('"color":"white"},"children":["Bash"]')
  await ui.unmount()
})

test('sencha MCP tool call sections keep the pane valid (no undefined props)', { timeoutMs: 20_000 }, async ($, on) => {
  const clock = world(on)
  on('tool.call', () => ({ result: { ok: true } }))
  await $.session.start({ cwd: '/tmp', surface: 'desktop', isInteractive: true })
  await clock.settle()
  const ui = await $.ui.mount({ plugin: 'sencha', surface: 'desktop', component: 'Pane', requestId: 'sencha', props: paneProps(98) })
  await clock.settle()
  await $.tool.call({ tool: 'mcp__plugin_sencha_extjs-tools__sencha-app-build', cwd: '/tmp' })
  await clock.settle()
  const expander = JSON.stringify(await ui.drawn({ in: 'expander' }))
  expect(expander).toContain('"color":"success"')
  expect(expander).toContain('sencha-app-build')
  expect(expander).toContain('"color":"white"},"children":[" "]')
  expect(expander).not.toContain('"children":["mcp__plugin_sencha_extjs-tools__sencha-app-build"]')
  await ui.unmount()
})

test('sencha pane draws the header Test button and pressing it runs the rounds', { timeoutMs: 20_000 }, async ($, on) => {
  const clock = world(on)
  await $.session.start({ cwd: '/tmp', surface: 'desktop', isInteractive: true })
  await clock.settle()
  const ui = await $.ui.mount({ plugin: 'sencha', surface: 'desktop', component: 'Pane', requestId: 'sencha', props: paneProps(98) })
  await clock.settle()
  const drawn = () => ui.drawn().then(r => JSON.stringify(r))
  expect(await drawn()).toContain('header-test')
  expect(await drawn()).toContain('button.tsx')
  expect(await ui.drawn({ in: 'header-test' })).toBeDefined()

  await ui.press({ key: 'header-test' })
  // ten rounds, each a section plus 5-10 rows, 200ms apart
  for (let i = 0; i < 60; i++) await clock.advance(500)
  await clock.settle()
  const after = await drawn()
  expect(after).toContain('new section 0')
  expect(after).toContain('new section 9')
  expect(after).toContain('new item 0')
  await ui.unmount()
})

test('sencha clear button empties the expander sections', { timeoutMs: 20_000 }, async ($, on) => {
  const clock = world(on)
  await $.session.start({ cwd: '/tmp', surface: 'desktop', isInteractive: true })
  await clock.settle()
  const ui = await $.ui.mount({ plugin: 'sencha', surface: 'desktop', component: 'Pane', requestId: 'sencha', props: paneProps(98) })
  await clock.settle()
  const drawn = () => ui.drawn({ in: 'expander' }).then(r => JSON.stringify(r))
  expect(await drawn()).toContain('session.start')
  await ui.press({ key: 'clear-top' })
  await clock.settle()
  expect(await drawn()).not.toContain('session.start')
  expect(JSON.stringify(await ui.drawn())).toContain('"sections":[]')
  await ui.press({ key: 'add-section' })
  await clock.settle()
  expect(await drawn()).toContain('section 1')
  await ui.press({ key: 'clear-bottom' })
  await clock.settle()
  expect(await drawn()).not.toContain('section 1')
  expect(JSON.stringify(await ui.drawn())).toContain('"sections":[]')
  await ui.unmount()
})

test('sencha close buttons go through ui.message and close the pane', { timeoutMs: 20_000 }, async ($, on) => {
  const clock = world(on)
  await $.session.start({ cwd: '/tmp', surface: 'desktop', isInteractive: true })
  await clock.settle()
  const ui = await $.ui.mount({ plugin: 'sencha', surface: 'desktop', component: 'Pane', requestId: 'sencha', props: paneProps(98) })
  await clock.settle()
  const drawn = () => ui.drawn({ in: 'expander' }).then(r => JSON.stringify(r))
  await ui.press({ key: 'close-top' })
  await clock.settle()
  expect(await drawn()).toContain('ui.close')
  await ui.unmount()
})

test('sencha toggle-all, add-section, add-item-latest and run-test buttons all work', { timeoutMs: 20_000 }, async ($, on) => {
  const clock = world(on)
  await $.session.start({ cwd: '/tmp', surface: 'desktop', isInteractive: true })
  await clock.settle()
  const ui = await $.ui.mount({ plugin: 'sencha', surface: 'desktop', component: 'Pane', requestId: 'sencha', props: paneProps(98) })
  await clock.settle()
  const expander = () => ui.drawn({ in: 'expander' }).then(r => JSON.stringify(r))
  const full = () => ui.drawn().then(r => JSON.stringify(r))
  expect(await full()).toContain('Collapse All')
  expect(await expander()).toContain('▾')
  expect(await expander()).not.toContain('▸')
  await ui.press({ key: 'toggle-all' })
  await clock.settle()
  expect(await full()).toContain('Expand All')
  expect(await expander()).toContain('▸')
  expect(await expander()).not.toContain('▾')
  await ui.press({ key: 'toggle-all' })
  await clock.settle()
  expect(await full()).toContain('Collapse All')
  expect(await expander()).toContain('▾')
  await ui.press({ key: 'add-section' })
  await clock.settle()
  expect(await expander()).toContain('section 2')
  await ui.press({ key: 'add-item-latest' })
  await clock.settle()
  expect(await expander()).toContain('item 1')
  await ui.press({ key: 'run-test' })
  await clock.settle()
  for (let i = 0; i < 60; i++) await clock.advance(500)
  await clock.settle()
  expect(await expander()).toContain('new section 0')
  await ui.unmount()
})
