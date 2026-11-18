import type { Register, EngineInterface, Args, Frozen, Next, RenderSurface, PaneOpenArgs, UiLogOptions, UiLogSink } from 'claude-code'
import { versionString, doError, LOGO_SVG, LOGO_PNG } from '../common'
import { Header } from './components/header'
import { HoverHint } from './components/hoverhint'
import type { ButtonProps } from './components/button'

export const register: Register = on => {
  let hoverHints: Partial<Record<'above' | 'pane', string>> = {}
  let subHeading = 'Plugin Loaded'

  on('session.start', async ($, e, next) => {
    subHeading = `session started...`
    return next(e);
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  on('tool.call', async ($, e, next) => {
    subHeading = `tool call: ${e.tool}...`
    let out = await next(e)
    return out;
  }).catch((_, e, next) => next(e))

  on('turn.start', async ($, e, next) => {
    subHeading = `turn start...`
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  on('turn.step', async function* (_, e, next) {
    const nowSeconds = Math.floor(Date.now() / 1000)
    const nowDisplay = new Date(nowSeconds * 1000).toLocaleString()
    subHeading = `turn step ${nowDisplay}...`
    let out = next(e)
    yield* out;
  }).catch(async function* ($, e, next) { doError($, e, next); yield* next(e); });

  on('turn.complete', async ($, e, next) => {
    subHeading = `ready...`
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  // Any button that reports hover: its hint shows in the status bar and in the spot for its place.
  on('ui.message', async ($, e, next) => {
     const data = e.data as { over?: boolean; hint?: string; place?: 'above' | 'pane' } | undefined
    if (data?.over === undefined || data.place === undefined) return next(e)
    const hint = data.over ? data.hint : undefined
    hoverHints = { ...hoverHints, [data.place]: hint }
    $.ui.invalidate('ui.render')
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  // AbovePrompt messages
  on('ui.message', { element: 'reext-create' }, async ($: EngineInterface, e: Frozen<Args<'ui.message'>>, next: Next<'ui.message'>) => {
    if ((e.data as { press?: boolean }).press === true) {
      await $.command.run({ command: 'reext-create', args: '' }).catch(err => doError($, err))
    }
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.surface === 'desktop' || e.surface === 'terminal') {
      const ui = $.ui.resolve(e);
      const { Box, Text, Client } = ui
      const { Svg, Image } = ui as { Svg?: any; Image?: any }
      const header = e.surface === 'desktop'
        ? <Header Box={Box} Text={Text} Svg={Svg} logo={await $.fs.read(`${$.plugin.root}/${LOGO_SVG}`)} name="Sencha ReExt" version={await versionString($)} />
        : <Header Box={Box} Text={Text} Image={Image} logo={{ png: (await $.fs.read(`${$.plugin.root}/${LOGO_PNG}`, { as: 'bytes' })).base64 }} name="SenchaReExt" version={await versionString($)} />
      return (
        <Box flexDirection="column" marginLeft={0} marginTop={0} marginBottom={0} >
          <Box flexDirection="row">
            {header}
            <Box marginLeft={2} flexGrow={1}><HoverHint Box={Box} Text={Text} hint={hoverHints.above} /></Box>
            {/* <Client key="help" module="./components/button.tsx" props={{ id: 'help', label: 'about', dim: false, surface: e.surface, place: 'above', hint: 'About' } satisfies ButtonProps} /> */}
          </Box>
          <Box marginLeft={3} flexDirection="row">
            <Text size="caption" color="#fb923c" dimColor>{subHeading}</Text>
          </Box>
          <Box flexDirection="row" marginTop={1} marginRight={0} marginBottom={0} marginLeft={0}>
            <Client key="reext-create" module="./components/button.tsx" props={{ id: 'reext-create', label: `run 'reext-create' skill`, dim: false, surface: e.surface, place: 'above', hint: `run the 'reext-create' Skill` } satisfies ButtonProps} />
          </Box>
          <Box height={1} marginTop={0} overflow="hidden">
            <Text dimColor>{'─'.repeat(500)}</Text>
          </Box>
        </Box>
      )
    }
    if (e.surface === 'vscode') {
      const { Text } = $.ui.resolve(e)
      return (<Text>vscode</Text>)
    }
    if (e.surface === 'mobile') {
      const { Text } = $.ui.resolve(e)
      return (<Text>mobile</Text>)
    }
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });
}
