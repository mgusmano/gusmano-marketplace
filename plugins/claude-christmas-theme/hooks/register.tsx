import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { SCENE } from './scene.js'

// Midnight-blue Christmas Eve. The scene is always night, so the theme is
// dark-only: light text in either app mode. Secondary and muted text (the
// thinking text, the spinner's label) are bright enough to read over the art.
const { theme, problems } = makeColors({
  label: 'Christmas Eve',
  only: 'dark',
  roles: { accent: '#f2c14e', danger: '#ff6b6b', success: '#5fd18c', warning: '#ffc857', pro: '#c9a7ff' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0a1326',
        'surface-1': '#111c36',
        'surface-2': '#182545',
        'surface-3': '#1c2a4c',
        'text-primary': '#f6f8ff',
        'text-secondary': '#e2e8f8',
        'text-muted': '#c3cde6',
      },
    },
  },
})

// A thicker veil behind the panels so words stand off the tiles.
const LOOK: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: 'christmas', glass: { blur: 4, tint: '#0a1326', opacity: 0.55 } },
}

// The scene with Santa's sleigh (class "sleigh") and the falling snow (class "snow") hidden as asked.
const sceneFor = (isSantaShown: boolean, isSnowShown: boolean): string => {
  const hidden = [isSantaShown ? '' : '.sleigh{display:none}', isSnowShown ? '' : '.snow{display:none}'].join('')
  return hidden === '' ? SCENE : SCENE.replace('</defs>', `<style>${hidden}</style></defs>`)
}

export const register: Register = on => {
  // whether Santa's sleigh and the falling snow are drawn across the backdrop: Santa starts hidden, the snow starts shown
  let isSantaShown = false
  let isSnowShown = true

  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) $.ui.toast(unpainted)

    const set = await $.theme.set(LOOK)
    if (!set.isDrawn) $.ui.status(set.reason)

    await $.command.register({ name: 'santa', description: 'show or hide Santa\'s sleigh (args: show | hide; none toggles)' })
    await $.command.register({ name: 'snow', description: 'show or hide the falling snow (args: show | hide; none toggles)' })

    return next(e)
  })

  // `santa show` / `santa hide` set it; a bare `santa` flips it
  on('command.run', { command: 'santa' }, async ($, e) => {
    const want = e.args.trim()
    isSantaShown = want === 'show' ? true : want === 'hide' ? false : !isSantaShown
    $.ui.invalidate('ui.render')
    return { text: isSantaShown ? 'Santa shown' : 'Santa hidden' }
  })

  // `snow show` / `snow hide` set it; a bare `snow` flips it
  on('command.run', { command: 'snow' }, async ($, e) => {
    const want = e.args.trim()
    isSnowShown = want === 'show' ? true : want === 'hide' ? false : !isSnowShown
    $.ui.invalidate('ui.render')
    return { text: isSnowShown ? 'Snow shown' : 'Snow hidden' }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)
    if (e.props.scene !== 'christmas') return next(e)
    const { Svg } = $.ui.resolve(e)
    return (
      <Svg
        source={sceneFor(isSantaShown, isSnowShown)}
        alt="Pixel-tile mosaic of Christmas Eve: snow falling as Santa's sleigh and reindeer fly past the moon, over a house strung with twinkling lights"
        isInteractive
      />
    )
  })
}
