import { expect, mock, test } from 'claude-code/testing'
import { appendLines, clearAll, subjectOf, PANE } from './helpers'
import { addItemToLatestSection, addSection, sections, toggleSection } from './helpers/sections'

// The harness hands tests its own Engine; appendLines is typed against the plugin's EngineInterface.
const asHost = ($: unknown) => $ as Parameters<typeof appendLines>[0]

const props = { title: 'Sencha', isFocused: false, bodyColumns: 98, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} } as never

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25"><rect width="25" height="25"/></svg>'
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

/** Mocks the host calls the Sencha plugin makes on start and draw. */
function world(on: any) {
  const registered: string[] = []
  mock.env(on, {})
  const clock = mock.clock(on, { now: 1_800_000_000_000 })
  mock.store(on)
  on('command.register', (_$: any, e: any) => {
    registered.push(e.name)
    return { value: undefined }
  })
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
  return { clock, registered }
}

for (const surface of ['desktop', 'terminal'] as const) {
  test(`session start registers the three commands and draws the start section (${surface})`, { timeoutMs: 20_000 }, async ($, on) => {
    const { clock, registered } = world(on)
    await $.session.start({ cwd: '/tmp', surface, isInteractive: true })
    await clock.settle()
    expect(registered, 'commands').toEqual(['sencha', 'callit', 'ask'])
    const ui = await $.ui.mount({ plugin: 'sencha', surface, component: 'Pane', requestId: PANE, props })
    await clock.settle()
    expect(JSON.stringify(await ui.drawn()), 'start section drawn').toContain('session.start')
    await ui.unmount()
  })
}

test('appendLines skips lone-dot and blank lines and returns the count kept', { timeoutMs: 20_000 }, async ($, on) => {
  world(on)
  await $.session.start({ cwd: '/tmp', surface: 'desktop', isInteractive: true })
  await clearAll($)
  await addSection($, 'tool.call', 'Bash')
  const kept = await appendLines(asHost($), [
    { name: 'first' },
    { name: '.' },
    { name: '   ' },
    { name: '' },
    { name: undefined as never },
    { name: 'second' },
  ])
  expect(kept, 'kept count').toBe(2)
  expect(sections().at(-1)?.items, 'items').toEqual(['first', 'second'])
})

test('appendLines only takes lines it has not seen yet', { timeoutMs: 20_000 }, async ($, on) => {
  world(on)
  await $.session.start({ cwd: '/tmp', surface: 'desktop', isInteractive: true })
  await clearAll($)
  await addSection($, 'tool.call', 'Bash')
  const batch = [{ name: 'a' }, { name: 'b' }]
  expect(await appendLines(asHost($), batch), 'first poll').toBe(2)
  expect(await appendLines(asHost($), [...batch, { name: 'c' }]), 'second poll').toBe(1)
  expect(sections().at(-1)?.items, 'items').toEqual(['a', 'b', 'c'])
})

test('addItemToLatestSection keeps a colour and stores plain text without one', { timeoutMs: 20_000 }, async ($, on) => {
  world(on)
  await $.session.start({ cwd: '/tmp', surface: 'desktop', isInteractive: true })
  await clearAll($)
  await addSection($, 'tool.call', 'Read')
  await addItemToLatestSection($, 'file_path: /tmp/a.ts', '#c4b5fd')
  await addItemToLatestSection($, '/tmp/a.ts')
  expect(sections().at(-1)?.items, 'items').toEqual([{ text: 'file_path: /tmp/a.ts', color: '#c4b5fd' }, '/tmp/a.ts'])
})

test('subjectOf picks the argument each built-in tool acts on', { timeoutMs: 20_000 }, async () => {
  expect(subjectOf({ tool: 'Bash', command: 'ls' } as never)).toBe('ls')
  expect(subjectOf({ tool: 'Read', file_path: '/a' } as never)).toBe('/a')
  expect(subjectOf({ tool: 'Edit', file_path: '/b' } as never)).toBe('/b')
  expect(subjectOf({ tool: 'Write', file_path: '/c' } as never)).toBe('/c')
  expect(subjectOf({ tool: 'NotebookEdit', notebook_path: '/n' } as never)).toBe('/n')
  expect(subjectOf({ tool: 'WebSearch', query: 'q' } as never)).toBe('q')
  expect(subjectOf({ tool: 'WebFetch', url: 'https://x' } as never)).toBe('https://x')
  expect(subjectOf({ tool: 'Grep', pattern: 'p' } as never)).toBeUndefined()
})

test('toggleSection is an accordion: opening one closes the others', { timeoutMs: 20_000 }, async ($, on) => {
  world(on)
  await $.session.start({ cwd: '/tmp', surface: 'desktop', isInteractive: true })
  await clearAll($)
  const one = await addSection($, 'one')
  const two = await addSection($, 'two')
  toggleSection(one, true)
  toggleSection(two, true)
  expect(sections().map(s => [s.id, s.expanded]), 'only the last opened stays open').toEqual([[one, false], [two, true]])
  toggleSection(two, false)
  expect(sections().map(s => s.expanded), 'collapse only the target').toEqual([false, false])
})

test('the pane lists sections added after start', { timeoutMs: 20_000 }, async ($, on) => {
  const { clock } = world(on)
  await $.session.start({ cwd: '/tmp', surface: 'desktop', isInteractive: true })
  await clock.settle()
  await clearAll($)
  await addSection($, 'tool.call', 'Bash ')
  const ui = await $.ui.mount({ plugin: 'sencha', surface: 'desktop', component: 'Pane', requestId: PANE, props })
  await clock.settle()
  expect(JSON.stringify(await ui.drawn({ in: 'expander' })), 'tool.call row').toContain('tool.call')
  await ui.unmount()
})
