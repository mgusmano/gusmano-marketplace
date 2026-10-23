import type { EngineInterface, Hook } from 'claude-code'
import { addSection } from './sections'
import { PANE } from './index'

export async function commandSencha($: any): Promise<{ text: string }> {
  const message = `command 'sencha' executed.`
  await addSection($, 'command.run', message)
  // No surface attached (bare -p run): ui.open may never settle, so check first
  if ((await $.session.surfaces()).length === 0) {
    return { text: 'Sencha pane could not open: no surface is attached' }
  }
  try {
    const opened = await $.ui.open({ id: PANE, title: 'Sencha', focus: true })
    if (!opened.isPlaced) return { text: `Sencha pane waiting: ${opened.reason}` }
  } catch {
    return { text: 'Sencha pane could not open: no surface is attached' }
  }
  return { text: 'Sencha pane opened' }
}

export async function commandCallit($: EngineInterface): Promise<{ text: string }> {
  //const tool = `mcp__plugin_sencha_extjs-tools__extjs-initialize-with-sencha-cmd`

  // const args: any = { 
  //   tool: `mcp__plugin_sencha_extjs-tools__extjs-initialize-with-sencha-cmd`, 
  //   progress: true, 
  //   rootPath: '/Users/demo/upgrade/run/MyWorkspaceRun' 
  // }


  // const args: any = {
  //   tool: `mcp__plugin_sencha_extjs-tools__extjs-prettier-all`,
  //   progress: false,
  //   folderPath: '/Users/demo/upgrade/run/MyWorkspaceRun/v8/MyWorkspace'
  // }

  const args: any = {
    tool: `mcp__plugin_sencha_extjs-tools__sencha-app-build`,
    progress: true,
    cwd: '/Users/demo/upgrade/run/MyWorkspaceRun/MyWorkspace/apps/demos/login'
  }

  let theResult
  $.tool.call(args).then(async toolResult => {
    //$.ui.log(`toolResult ${JSON.stringify(toolResult)}`)
    theResult = toolResult;
    //$.ui.log(`tool.call:isError ${JSON.stringify(toolResult)}`)
    //$.ui.log(`tool.call:isError ${JSON.stringify(toolResult.isError)}`)
    if (toolResult.isError === true) {
      //await addItemToLatestSection($, toolResult.text)
      //stop = true
    }
    if (toolResult.deny) {
      //stop = true;
    }
  })


  //let out = $.tool.call(args)
  // $.ui.log(`out ${JSON.stringify(out)}`)
  // $.tool.call(args).then(async extjsInitializeWithSenchaCmdResult => {
  //   //out = next(e).then(async extjsInitializeWithSenchaCmdResult => {
  //   if (extjsInitializeWithSenchaCmdResult.deny) {
  //     //message = JSON.stringify(extjsInitializeWithSenchaCmdResult)
  //     //stop = true;
  //   }
  // })
  return { text: 'running' }
}

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
