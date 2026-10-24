import type { EngineInterface, Hook } from 'claude-code'

export async function commandAsk($: EngineInterface, e: Parameters<Hook<'command.run'>>[1], next: Parameters<Hook<'command.run'>>[2]) {
  const tool = `mcp__plugin_sencha_extjs-tools__test-global-set`; const name = 'test-global-set';
  const value = 'hello'
  const { decision } = await $.tool.check({ tool, input: { name, value } })
  //$.ui.log(`decision ${decision}`)
  if (decision !== 'allow') {
    const answer = await $.ui.ask(`SET Allow ${name} with value '${value}'?`, ['Yes', 'No'])
    if (answer !== 'Yes') return { text: 'ask cancelled' }
  }
  const out = await next(e)
  return { ...out, text: JSON.stringify({ text: 'polling done' }) }
}
