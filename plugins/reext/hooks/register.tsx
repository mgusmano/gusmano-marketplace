import type { Register, ThemeSetArgs, EngineInterface, Args, Frozen, Next, RenderSurface, PaneOpenArgs, UiLogOptions, UiLogSink } from 'claude-code'
import { versionString, doError, LOGO_SVG, LOGO_PNG, logo_only_svg, logo_only_png } from '../common'
import { Header } from './components/header'
import { HoverHint } from './components/hoverhint'
import type { ButtonProps } from './components/button'
import { HELP_PANE, HELP_MARKDOWN } from './helpers/help'

const SENCHA_HELP_PANE = 'sencha-help'

const LOOK: ThemeSetArgs = {
  backdrop: { scene: 'ReExt', glass: { blur: 4, tint: '#0a1326', opacity: 0.55 } },
}

export const register: Register = on => {
  let hoverHints: Partial<Record<'above' | 'pane', string>> = {}
  let subHeading = 'Plugin Loaded'
  // whether the Sencha Claude Code Companion band is drawn above the prompt; hidden until toggled on
  let isCompanionShown = false
  // whether Santa's sleigh is drawn on the Christmas theme's backdrop; the theme owns it, this tracks what we last asked for (starts hidden)
  let isSantaShown = false
  // whether the falling snow is drawn on the Christmas theme's backdrop; same arrangement as Santa
  let isSnowShown = true

  on('plugin.register', async ($, e, next) => {
    // runs before session.start; set up anything that must exist early here
    // $.ui.log('ReExt plugin registered')
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  on('session.start', async ($, e, next) => {
    subHeading = `session started...`


    const set = await $.theme.set(LOOK)

    // if (!set.isDrawn) {
    //   $.ui.log(set.reason)
    //   $.ui.status(set.reason)
    // }
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

  // Hide the Sencha band's row while the companion is toggled off; its hook still runs, so the Sencha pane keeps working
  on('ui.render', { component: 'AbovePromptList' }, async ($, e, next) => {
    if (isCompanionShown) return next(e)
    return next({ ...e, props: { ...e.props, rows: e.props.rows.filter(row => row.plugin !== 'sencha') } })
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    //return next(e)

    if (e.surface === 'desktop' || e.surface === 'terminal' || e.surface === 'vscode') {
      const ui = $.ui.resolve(e);
      const { Box, Text } = ui
      // Client is not in the VS Code element table, so it is optional here and only used off VS Code
      const { Svg, Image, Client, Button } = ui as { Svg?: any; Image?: any; Client?: any; Button?: any }
      const headerImage = <Header Box={Box} Text={Text} Image={Image} logo={{ png: (await $.fs.read(`${$.plugin.root}/${logo_only_png}`, { as: 'bytes' })).base64 }} name="SenchaReExt" version={await versionString($)} />
      const headerSvg = <Header Box={Box} Text={Text} Svg={Svg} logo={await $.fs.read(`${$.plugin.root}/${logo_only_svg}`)} name="Sencha ReExt" version={await versionString($)} />

      let header;
      if (e.surface === 'desktop') header = headerSvg;
      if (e.surface === 'terminal') header = headerImage;
      if (e.surface === 'vscode') header = headerSvg;

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
            {e.surface === 'vscode' || e.surface === 'terminal'
              ? (
                <Box flexDirection="row">
                  <Box marginRight={0} >
                    <Button key="reext-create" label={`run 'reext-create' skill`} onPress={() => $.command.run({ command: 'reext-create', args: '' }).catch(err => doError($, err))} />
                  </Box>
                  <Box marginLeft={1} >
                    <Button key="open-help" label="Open Help Pane" onPress={() => $.ui.open({ id: HELP_PANE, title: 'About ReExt', focus: true, closeOnEscape: true }).catch(err => doError($, err))} />
                  </Box>
                  <Box marginLeft={1} >
                    <Button key="open-sencha" label="Open Sencha Pane" onPress={() => $.command.run({ command: 'show-pane', args: '' }).catch(err => doError($, err))} />
                  </Box>
                  {/* <Box marginLeft={1} >
                    <Button key="toggle-companion" label={isCompanionShown ? 'Hide Sencha Claude Code Companion' : 'Start Sencha Claude Code Companion'} onPress={() => { isCompanionShown = !isCompanionShown; $.ui.invalidate('ui.render') }} />
                  </Box> */}
                  <Box marginLeft={1} >
                    <Button key="toggle-santa" label={isSantaShown ? 'Hide Santa' : 'Show Santa'} onPress={() => { isSantaShown = !isSantaShown; $.command.run({ command: 'santa', args: isSantaShown ? 'show' : 'hide' }).catch(err => doError($, err)); $.ui.invalidate('ui.render') }} />
                  </Box>
                  <Box marginLeft={1} >
                    <Button key="toggle-snow" label={isSnowShown ? 'Hide Snow' : 'Show Snow'} onPress={() => { isSnowShown = !isSnowShown; $.command.run({ command: 'snow', args: isSnowShown ? 'show' : 'hide' }).catch(err => doError($, err)); $.ui.invalidate('ui.render') }} />
                  </Box>
                </Box>
              )
              : (
                <Box flexDirection="row">
                  {/* <Client key="reext-create" module="./components/button.tsx" props={{ id: 'reext-create', label: `run 'reext-create' skill`, dim: false, surface: e.surface, place: 'above', hint: `run the 'reext-create' Skill` } satisfies ButtonProps} /> */}
                  <Box marginRight={0} >
                    <Button key="reext-create" label={`run 'reext-create' skill`} onPress={() => $.command.run({ command: 'reext-create', args: '' }).catch(err => doError($, err))} />
                  </Box>
                  {/* <Box marginLeft={1} >
                    <Button key="open-help" label="Open Help Pane" onPress={() => $.ui.open({ id: HELP_PANE, title: 'About ReExt', focus: true, closeOnEscape: true }).catch(err => doError($, err))} />
                  </Box> */}
                  <Box marginLeft={1} >
                    <Button key="open-sencha" label="Steps" onPress={() => $.command.run({ command: 'show-pane', args: '' }).catch(err => doError($, err))} />
                  </Box>
                  <Box marginLeft={1} >
                    <Button key="toggle-companion" label={isCompanionShown ? 'Hide Sencha Claude Code Companion' : 'Show Sencha Claude Code Companion'} onPress={() => { isCompanionShown = !isCompanionShown; $.ui.invalidate('ui.render') }} />
                  </Box>
                  <Box marginLeft={1} >
                    <Button key="toggle-santa" label={isSantaShown ? 'Hide Santa' : 'Show Santa'} onPress={() => { isSantaShown = !isSantaShown; $.command.run({ command: 'santa', args: isSantaShown ? 'show' : 'hide' }).catch(err => doError($, err)); $.ui.invalidate('ui.render') }} />
                  </Box>
                  <Box marginLeft={1} >
                    <Button key="toggle-snow" label={isSnowShown ? 'Hide Snow' : 'Show Snow'} onPress={() => { isSnowShown = !isSnowShown; $.command.run({ command: 'snow', args: isSnowShown ? 'show' : 'hide' }).catch(err => doError($, err)); $.ui.invalidate('ui.render') }} />
                  </Box>
                </Box>
              )}
          </Box>
          {isCompanionShown && (
            <Box height={1} marginTop={0} overflow="hidden">
              <Text dimColor>{'─'.repeat(500)}</Text>
            </Box>
          )}
        </Box>
      )
    }
    // if (e.surface === 'vscode') {
    //   const { Text } = $.ui.resolve(e)
    //   return (<Text>vscode</Text>)
    // }
    if (e.surface === 'mobile') {
      const { Text } = $.ui.resolve(e)
      return (<Text>mobile</Text>)
    }
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) });

  const scene = (logo: string) => `
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1198 525" preserveAspectRatio="xMidYMid meet">
  <rect x="-100000" y="-100000" width="200000" height="200000" fill="#1f5fbf"/>
  <g opacity="0.2">${logo}</g>
</svg>`

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)
    if (e.props.scene !== 'ReExt') return next(e)
    const { Svg } = $.ui.resolve(e)
    const logo = await $.fs.read(`${$.plugin.root}/${LOGO_SVG}`)
    return (
      <Svg
        source={scene(logo)}
        alt="ReExt"
        isInteractive
      />
    )
  })

  on('ui.render', { component: 'Pane', requestId: HELP_PANE }, async ($, e, next) => {
    const ui = $.ui.resolve(e)
    const { Box, Text } = ui
    const { Button } = ui as { Button?: any }
    return (
      <Box flexDirection="column">
        <Text>Sample Text</Text>
        <Box marginTop={1} borderStyle="none" paddingY={0}>
          <Button key="close-help" label="Close" onPress={() => $.ui.close({ id: HELP_PANE }).catch(err => doError($, err))} />
        </Box>
      </Box>
    )
  }).catch(($, e, next) => { doError($, e, next); return next(e) })
}
