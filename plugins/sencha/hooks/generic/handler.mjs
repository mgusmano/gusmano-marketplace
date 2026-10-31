#!/usr/bin/env node
// Generic hook handler, shared by every host. Usage:
//   node handler.mjs <event>
// <event> is a normalized name: session.start, session.end, turn.start, turn.end,
// tool.before or tool.after. Each host's config passes it as the first argument.
// The event JSON arrives on stdin: { session_id, cwd, tool_name?, tool_input?, ... }.
//
// Exit 0 lets the event through. Exit 2 blocks it (for tool.before), and the
// reason on stderr goes back to the host. Only Node built-ins are used.
import { appendFileSync } from 'node:fs'
import { join } from 'node:path'

const event = process.argv[2] ?? 'unknown'

// Each handler gets the parsed input and returns { block: reason } to stop the event, or nothing.
// Add a handler to a list to run it on that event. Lists run in order and stop at the first block.
const logEvent = (input) => {
  const logFile = process.env.GENERIC_HOOK_LOG ?? join(input.cwd ?? process.cwd(), '.hook-events.jsonl')
  appendFileSync(logFile, JSON.stringify({ at: new Date().toISOString(), event, session: input.session_id, tool: input.tool_name }) + '\n')
}




// Example guard: refuse a force push from a shell tool.
const guardForcePush = (input) => {
  if (input.tool_name !== 'Bash') return
  const command = String(input.tool_input?.command ?? '')
  if (/git\s+push\s+.*(--force\b|-f\b)/.test(command)) return { block: 'force push blocked by the generic hook' }
}

const handlers = {
  // normalized events, sent by every host
  'session.start': [logEvent],
  'session.end': [logEvent],
  'turn.start': [logEvent],
  'turn.end': [logEvent],
  // 'tool.before': [logEvent, guardForcePush],
  // 'tool.after': [logEvent],

  // // Claude Code hook events
  // 'classic.ConfigChange': [logEvent],
  // 'classic.CwdChanged': [logEvent],
  // 'classic.DirectoryAdded': [logEvent],
  // 'classic.Elicitation': [logEvent],
  // 'classic.ElicitationResult': [logEvent],
  // 'classic.FileChanged': [logEvent],
  // 'classic.InstructionsLoaded': [logEvent],
  // 'classic.MessageDisplay': [logEvent],
  // 'classic.Notification': [logEvent],
  // 'classic.PermissionDenied': [logEvent],
  // 'classic.PermissionRequest': [logEvent],
  // 'classic.PostCompact': [logEvent],
  // 'classic.PostModelSwitch': [logEvent],
  // 'classic.PostToolBatch': [logEvent],
  // 'classic.PostToolUse': [logEvent],
  // 'classic.PostToolUseFailure': [logEvent],
  // 'classic.PreCompact': [logEvent],
  // 'classic.PreModelSwitch': [logEvent],
  // 'classic.PreToolUse': [logEvent],
  // 'classic.SessionEnd': [logEvent],
  // 'classic.SessionStart': [logEvent],
  // 'classic.Setup': [logEvent],
  // 'classic.Stop': [logEvent],
  // 'classic.StopFailure': [logEvent],
  // 'classic.SubagentStart': [logEvent],
  // 'classic.SubagentStop': [logEvent],
  // 'classic.TaskCompleted': [logEvent],
  // 'classic.TaskCreated': [logEvent],
  // 'classic.TeammateIdle': [logEvent],
  // 'classic.UserPromptExpansion': [logEvent],
  'classic.UserPromptSubmit': [logEvent],
  // 'classic.WorktreeCreate': [logEvent],
  // 'classic.WorktreeRemove': [logEvent],

  // // engine events
  // 'agent.offer': [logEvent],
  // 'agent.spawn': [logEvent],
  // 'attribution.text': [logEvent],
  // 'command.describe': [logEvent],
  // 'command.run': [logEvent],
  // 'config.describe': [logEvent],
  // 'config.set': [logEvent],
  // 'engine.create': [logEvent],
  // 'plugin.register': [logEvent],
  // 'prompt.attachment': [logEvent],
  // 'prompt.autocomplete': [logEvent],
  // 'prompt.change': [logEvent],
  // 'prompt.compose': [logEvent],
  // 'prompt.context': [logEvent],
  // 'prompt.edit': [logEvent],
  // 'prompt.fill': [logEvent],
  // 'prompt.mention': [logEvent],
  // 'prompt.section': [logEvent],
  'prompt.submit': [logEvent],
  // 'prompt.suggest': [logEvent],
  // 'session.append': [logEvent],
  // 'session.attach': [logEvent],
  // 'session.compact': [logEvent],
  // 'session.detach': [logEvent],
  // 'session.measure': [logEvent],
  // 'session.receive': [logEvent],
  // 'session.send': [logEvent],
  // 'skill.prompt': [logEvent],
  // 'telemetry.log': [logEvent],
  // 'telemetry.mark': [logEvent],
  // 'tool.call': [logEvent],
  // 'tool.check': [logEvent],
  // 'tool.describe': [logEvent],
  // 'turn.complete': [logEvent],
  // 'turn.step': [logEvent],
  // 'ui.fault': [logEvent],
  // 'ui.focus': [logEvent],
  // 'ui.input': [logEvent],
  'ui.message': [logEvent],
  // 'ui.press': [logEvent],
  // 'ui.render': [logEvent],
  // 'ui.resolve': [logEvent],
  // 'ui.scroll': [logEvent],
  // 'ui.select': [logEvent],
}

const logTest = (input) => {
  const logFile = process.env.GENERIC_HOOK_LOG ?? join(input.cwd ?? process.cwd(), '.hook-events.jsonl')
  appendFileSync(logFile, input + '\n')
}

// try {
//   //logTest('hi')
//   const chunks = []
//   for await (const chunk of process.stdin) chunks.push(chunk)
//   const raw = Buffer.concat(chunks).toString()
//   const input = raw.trim() ? JSON.parse(raw) : {}


//   logTest(JSON.stringify(input, null, 1))
//   //logTest(input.hook_event_name)




//   // runs every handler registered for a normalized event, stopping at the first block
//   const run = (name) => {
//     for (const handler of handlers[name] ?? []) {
//       const result = handler(input)
//       if (result?.block) {
//         process.stderr.write(result.block + '\n')
//         process.exit(2)
//       }
//     }
//   }

//   switch (input.hook_event_name) {
//     case 'SessionStart': run('session.start'); break
//     case 'SessionEnd': run('session.end'); break
//     case 'UserPromptSubmit': run('turn.start'); break
//     case 'Stop': run('turn.end'); break
//     case 'PreToolUse': run('tool.before'); break
//     case 'PostToolUse': run('tool.after'); break
//     default: break
//   }
//   process.exit(0)
// }
// catch (error) {
//   process.stderr.write('mjg error: ' + error.toString() + '\n')
//   logTest(error.toString())
//   process.exit(2)
// }


// echo 'not json' | node /Users/marcgusmano/gusmano-marketplace/plugins/sencha/hooks/generic/handler.mjs session.start; echo $?


async function main() {
  try {
    //logTest('hi')
    const chunks = []
    for await (const chunk of process.stdin) chunks.push(chunk)
    const raw = Buffer.concat(chunks).toString()
    const input = raw.trim() ? JSON.parse(raw) : {}

    switch (input.hook_event_name) {
      // case 'SessionStart': logTest(`session.start: ${input.session_id}`); logTest(JSON.stringify(input, null, 1)); break;
      // //case 'UserPromptSubmit': logTest('turn.start'); logTest(JSON.stringify(input, null, 1)); break;
      // case 'Stop': logTest('turn.end'); logTest(JSON.stringify(input, null, 1)); break;
      // case 'PreToolUse': logTest('tool.before'); logTest(JSON.stringify(input, null, 1)); break;
      // case 'PostToolUse': logTest('tool.after'); logTest(JSON.stringify(input, null, 1)); break;
      // case 'SessionEnd': logTest('session.end'); logTest(JSON.stringify(input, null, 1)); break;
      default: logTest('hook_event_name: ' + input.hook_event_name); logTest(JSON.stringify(input, null, 1)); break;
    }

    // logTest(JSON.stringify(input, null, 1))
    //logTest(input.hook_event_name)

    // runs every handler registered for a normalized event, stopping at the first block
    // const run = (name) => {
    //   for (const handler of handlers[name] ?? []) {
    //     const result = handler(input)
    //     if (result?.block) {
    //       process.stderr.write(result.block + '\n')
    //       process.exit(2)
    //     }
    //   }
    // }

    // switch (input.hook_event_name) {
    //   case 'SessionStart': run('session.start'); break
    //   case 'SessionEnd': run('session.end'); break
    //   case 'UserPromptSubmit': run('turn.start'); break
    //   case 'Stop': run('turn.end'); break
    //   case 'PreToolUse': run('tool.before'); break
    //   case 'PostToolUse': run('tool.after'); break
    //   default: break
    // }
    process.exit(0)
  }
  catch (error) {
    process.stderr.write('mjg error: ' + error.toString() + '\n')
    logTest(error.toString())
    process.exit(2)
  }


}

main()