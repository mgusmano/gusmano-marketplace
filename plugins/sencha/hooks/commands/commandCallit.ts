import type { EngineInterface } from 'claude-code'

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
