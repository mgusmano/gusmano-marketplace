import { atom, read, update } from 'claude-code'
import type { Engine, Register } from 'claude-code'

import type { Fill } from '../types'

const percent = atom({ plugin: 'context-weather', key: 'percent' } as const, null)

const CELLS = 20

// Reads the live window's fill into the atom; the write redraws the band.
// Never throws: a failed read must not hold up the prompt it gates.
const refresh = async ($: Engine) => {
  try {
    const { context } = await $.session.usage()
    const fill: Fill = context.percent ?? null
    await update($, percent, () => fill)
  } catch {
    // keep the last reading
  }
}

const weather = (pct: number) => {
  if (pct < 50) return { word: 'clear', color: 'success' as const }
  if (pct < 75) return { word: 'cloudy', color: 'success' as const }
  if (pct < 90) return { word: 'rain', color: 'warning' as const }
  return { word: 'storm', color: 'error' as const }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await refresh($)

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    await refresh($)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await refresh($)

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const pct = await read($, percent)

    if (e.props.hasSurvey || pct === null) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const { word, color } = weather(pct)
    const filled = Math.min(CELLS, Math.round((pct / 100) * CELLS))
    const bar = '█'.repeat(filled) + '░'.repeat(CELLS - filled)

    return (
      <Box>
        <Text color={color}>{bar}</Text>
        <Text dimColor>
          {' '}
          mjg {pct}% context, {word}
        </Text>
      </Box>
    )
  })
}
