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

// Full text of a thrown value: JSON.stringify drops an Error's name, message and stack, and a
// hooks error can carry its details in extra fields, so list every own property too.
export function describeError(x: any): string {
  if (x === null || typeof x !== 'object') return String(x)
  //const head = x instanceof Error || typeof x.message === 'string' ? `${x.name}: ${x.message}\n${x.stack ?? ''}\n` : ''
  const head = x instanceof Error || typeof x.message === 'string' ? `${x.name}: ${x.message}\n` : ''
  const fields: Record<string, unknown> = {}
  for (const k of Object.getOwnPropertyNames(x)) {
    try { fields[k] = x[k] } catch { fields[k] = '<unreadable>' }
  }
  let body: string
  try {
    body = JSON.stringify(fields, (_, v) => (v instanceof Error ? { name: v.name, message: v.message, stack: v.stack } : v), 2)
  } catch {
    body = String(x)
  }
  //return head + body
  return head
}

export function doError($: any, e: any, next?: { error?: { kind?: string; message?: string } }) {
  const f = next?.error
  const why = f ? ` (${f.kind}: ${f.message ?? ''})` : ''
  $.ui.log(`error: ${describeError(e)}`)

}