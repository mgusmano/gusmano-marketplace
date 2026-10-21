import type { EngineInterface, Frozen, Next, On, Register, SessionStartInput, PaneOpenArgs } from 'claude-code'
import type { ExpanderProps, ExpanderSection } from './expander'

const PANE = 'client'
const LIGHT_HOVER = '#14532d'
const expanderProps = (): ExpanderProps => ({
  sections,
  itemColor: 'yellow',
  hoverBg: LIGHT_HOVER,
  unicode: true,
})
let sections: ExpanderSection[] = [
  {
    id: 'log',
    title: 'activity log',
    expanded: false,
    items: [
      { text: 'session.start', color: 'green' },
      'command.register  clienttest',
      'ui.open  Client',
      { text: 'ui.render  Pane', dim: true },
      'ready'
    ],
  },
  {
    id: 'notes',
    title: 'notes',
    expanded: false,
    items: [
      'first note',
      'second note'
    ]
  },
]

const doError = ($: any, e: any) => {
  $.ui.log(`error: ${JSON.stringify(e)}`)
}

const expandAll = () => {
  sections = sections.map(s => ({ ...s, expanded: true }))
}

const collapseAll = () => {
  sections = sections.map(s => ({ ...s, expanded: false }))
}

const addItem = (id: string) => {
  sections = sections.map(s => {
    if (s.id !== id) return s
    const n = (s.items?.length ?? 0) + 1
    return { ...s, items: [...(s.items ?? []), `item ${n}`] }
  })
}

const addSection = () => {
  const n = sections.length + 1
  const previous = sections.length - 1
  sections = [
    ...sections.map((s, i) => (i === previous ? { ...s, expanded: false } : s)),
    { id: `section-${n}`, title: `section ${n}`, items: [], expanded: true },
  ]
}

const addItemToLatestSection = () => {
  const latest = sections[sections.length - 1]
  if (latest) addItem(latest.id)
}

export const register: Register = (on: On) => {

  on('session.start', async ($: EngineInterface, e: Frozen<SessionStartInput>, next: Next<'session.start'>) => {
    $.ui.log(`session.start: At ${new Date().toLocaleString()}`)
    await $.command.register({ name: 'clienttest', description: 'Client Test' })
    void $.ui.open({ id: PANE, title: 'Client' })
    return next(e)
  }).catch(($, e, next) => { doError($, e); return next(e) });

  on('command.run', { command: 'clienttest' }, async ($, e, next) => {
    const paneOpenArgs: PaneOpenArgs = { id: PANE, title: 'Test', columns: 100, focus: true }
    await $.ui.open(paneOpenArgs).catch((error) => {
      $.ui.log(`PANE.ERROR: ${error.toString()}`)
    })
    const out = await next(e)
    return { ...out, text: JSON.stringify({ text: JSON.stringify(e) }) }
  }).catch(($, e, next) => { doError($, e); return next(e) });

  // on('ui.message', async ($, e, next) => {
  //   if (e.element !== 'expander') return next(e)
  //   const data = e.data as {
  //     toggle?: { section: string; open: boolean }
  //     addRow?: { section: string }
  //     addSection?: boolean
  //     press?: { section: string; index: number }
  //   }
  //   if (data?.toggle) {
  //     const { section, open } = data.toggle
  //     sections = sections.map(s => (s.id === section ? { ...s, expanded: open } : s))
  //     return { props: expanderProps() }
  //   }
  //   if (data?.addRow) {
  //     const { section } = data.addRow
  //     sections = sections.map(s => {
  //       if (s.id !== section) return s
  //       const n = (s.items?.length ?? 0) + 1
  //       return { ...s, items: [...(s.items ?? []), `item ${n}`] }
  //     })
  //     return { props: expanderProps() }
  //   }
  //   if (data?.addSection) {
  //     addSection()
  //     return { props: expanderProps() }
  //   }
  //   return next(e)
  // }).catch(($, e, next) => { doError($, e); return next(e) });

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e, next) => {
    if (e.surface !== 'terminal' && e.surface !== 'desktop') return next(e)

    const { Box, Text, Button, Client } = $.ui.resolve(e)

    const allExpanded = sections.length > 0 && sections.every(s => s.expanded)

    return (
      <Box flexDirection="column">
        {/* <Text>top</Text> */}

        <Button key="host-toggle-all" onPress={() => {
          if (allExpanded) collapseAll()
          else expandAll()
          $.ui.invalidate('ui.render')
        }}>{allExpanded ? 'Collapse All' : 'Expand All'}</Button>

        <Button key="host-add-section" onPress={() => {
          addSection()
          $.ui.invalidate('ui.render')
        }}>Add Section</Button>

        <Button key="host-add-row-latest" onPress={() => {
          addItemToLatestSection()
          $.ui.invalidate('ui.render')
        }}>Add Item to Latest Section</Button>

       <Box marginTop={1}></Box>

        <Client key="expander" module="./expander.tsx" props={expanderProps() satisfies ExpanderProps} />

        {/* <Text>bottom</Text> */}
      </Box>
    )
  }).catch(($, e, next) => { doError($, e); return next(e) });

}




