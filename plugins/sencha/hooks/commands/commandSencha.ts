import { addSection } from '../helpers/sections'
import { PANE } from '../helpers'

export async function commandSencha($: any): Promise<{ text: string }> {
  const message = `command 'sencha' executed.`
  await addSection($, 'command.run', message)
  // No surface attached (bare -p run): ui.open may never settle, so check first
  if ((await $.session.surfaces()).length === 0) {
    return { text: 'Sencha pane could not open: no surface is attached' }
  }
  try {
    const opened = await $.ui.open({ id: PANE, title: 'Sencha', focus: true, columns: 320 })
    if (!opened.isPlaced) return { text: `Sencha pane waiting: ${opened.reason}` }
  } catch {
    return { text: 'Sencha pane could not open: no surface is attached' }
  }
  return { text: 'Sencha pane opened' }
}
