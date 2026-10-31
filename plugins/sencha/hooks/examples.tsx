import type { On } from 'claude-code'
import { doError } from './helpers'

// Examples of the lifecycle hooks a plugin can handle: session, turn and tool.
// Not wired into register.tsx. To use one, call registerHookExamples(on) from
// register, or copy a single handler into it. Each handler calls next(e) and
// returns its result, so the host and any later hook still see the event.

export const registerHookExamples = (on: On) => {
  // session: start, then end. The reason says why the session ended ('clear' on /clear).
  on('session.start', async ($, e, next) => {
    $.ui.log(`example session.start cwd=${e.cwd} interactive=${e.isInteractive}`)
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) })

  on('session.end', async ($, e, next) => {
    $.ui.log(`example session.end reason=${e.reason} sessionId=${e.sessionId}`)
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) })

  // turn: a turn starts with the user's text, and completes with the answer and its duration.
  on('turn.start', async ($, e, next) => {
    $.ui.log(`example turn.start turnId=${e.turnId} chars=${e.text.length}`)
    return next(e)
  }).catch(($, e, next) => { doError($, e, next); return next(e) })

  on('turn.complete', async ($, e, next) => {
    $.ui.log(`example turn.complete reason=${e.reason} ms=${e.durationMs} chars=${e.answer.length}`)
    const result = await next(e)
    $.ui.log(`example turn.complete usage=${JSON.stringify(result?.usage)}`)
    return result
  }).catch(($, e, next) => { doError($, e, next); return next(e) })

  // tool: runs before the host calls the tool. The result comes back from next(e).
  on('tool.call', async ($, e, next) => {
    $.ui.log(`example tool.call tool=${e.tool}`)
    const result = await next(e)
    if (result?.isError === true) $.ui.log(`example tool.call failed tool=${e.tool}`)
    return result
  }).catch((_, e, next) => next(e))
}
