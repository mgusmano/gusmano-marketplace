import type { EngineInterface, Hook, Register, RenderInput, ToolCallInput, PaneOpenArgs } from 'claude-code'

// //export const versionString = async ($: EngineInterface): Promise<string> => {
// export const versionString = async ($: any): Promise<string> => {
//   try {
//     const manifest = JSON.parse(await $.fs.read(`${$.plugin.root}/.claude-plugin/plugin.json`)) as { version?: unknown }
//     return typeof manifest.version === 'string' ? `v${manifest.version}` : 'v?'
//   } catch {
//     return 'v?'
//   }
// }

// export const doError = ($: any, e: any, next?: { error?: { kind?: string; message?: string } }) => {
//   const f = next?.error
//   const why = f ? ` (${f.kind}: ${f.message ?? ''})` : ''
//   $.ui.log(`error${why}: ${JSON.stringify(e)}`)
// }