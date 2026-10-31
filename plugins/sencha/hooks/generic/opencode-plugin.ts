// OpenCode: place in .opencode/plugins/ (project) or ~/.config/opencode/plugins/ (global).
// Reuses handler.mjs, so the same rules apply in OpenCode as in Claude Code and Codex.
// Event names follow the OpenCode plugin docs: the `event` hook for session events and
// tool.execute.before / after for tools. Check them against the installed plugin types.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HANDLER = fileURLToPath(new URL('./handler.mjs', import.meta.url))

// Runs the shared handler with a normalized event name. Exit 2 means blocked: throw so OpenCode stops the tool.
const run = (event: string, payload: Record<string, unknown>) => {
  const result = spawnSync('node', [HANDLER, event], { input: JSON.stringify(payload), encoding: 'utf8' })
  if (result.status === 2) throw new Error(result.stderr.trim() || `blocked by ${event}`)
}

export const GenericHooks = async ({ directory }: { directory: string }) => ({
  event: async ({ event }: { event: { type: string; properties?: Record<string, any> } }) => {
    const session = event.properties?.sessionID
    const map: Record<string, string> = {
      'session.created': 'session.start',
      'session.idle': 'turn.end',
      'session.deleted': 'session.end',
    }
    const name = map[event.type]
    if (name) run(name, { session_id: session, cwd: directory })
  },

  'tool.execute.before': async (
    input: { tool: string; sessionID: string },
    output: { args: Record<string, any> },
  ) => {
    run('tool.before', { session_id: input.sessionID, cwd: directory, tool_name: input.tool, tool_input: output.args })
  },

  // The after hook's output carries the tool's result, not its arguments, so tool_input is left out.
  'tool.execute.after': async (input: { tool: string; sessionID: string }) => {
    run('tool.after', { session_id: input.sessionID, cwd: directory, tool_name: input.tool })
  },
})
