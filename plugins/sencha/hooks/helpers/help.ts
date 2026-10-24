// The help dialog: a pane opened from the header's help button, showing this description.
export const HELP_PANE = 'sencha-help'

export const HELP_MARKDOWN = `# Sencha AI Upgrade

Sencha is a Claude Code mod for Ext JS work. It adds a header above the prompt and a side pane that lists each step as it runs.

## Above the prompt
- **Sencha**: opens the side pane.
- **run extjs-upgrade**: puts \`/extjs-upgrade\` in the prompt, sends it, and opens the side pane.
- **help**: shows this description.

## Side pane
- **clear**, **close**, **bottom** and **top**: empty the steps, close the pane, and scroll.
- **Expand All** / **Collapse All**, **Add Section**, **Add Item** and **Test**: manage the steps.

## Commands
- \`/sencha\` opens the side pane.
- \`/callit\` calls a tool.
- \`/ask\` asks Example.
`
