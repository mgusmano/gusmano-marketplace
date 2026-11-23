import type { EngineInterface } from 'claude-code'
export const LOGO_SVG = 'common/assets/reext.svg'
export const LOGO_PNG = 'common/assets/reext.png'
export const logo_only_svg = 'common/assets/reext_logo.svg'
export const logo_only_png = 'common/assets/reext_logo.png'


export async function versionString($: EngineInterface): Promise<string> {
  try {
    const manifest = JSON.parse(await $.fs.read(`${$.plugin.root}/.claude-plugin/plugin.json`)) as { version?: unknown }
    return typeof manifest.version === 'string' ? `v${manifest.version}` : 'v?'
  } catch {
    return 'v?'
  }
}

export function doError($: any, e: any, next?: { error?: { kind?: string; message?: string } }) {
  const f = next?.error
  const why = f ? ` (${f.kind}: ${f.message ?? ''})` : ''
  // JSON.stringify drops an Error's message, so show name and message for those
  const detail = e instanceof Error || typeof e?.message === 'string' ? `${e.name}: ${e.message}` : JSON.stringify(e)
  //$.ui.log(`doError3 error${why}: ${detail}`)
  $.ui.log(`doError3 error${why}`)
 // $.ui.log(`doError2 error:${JSON.stringify(next)}`)
}