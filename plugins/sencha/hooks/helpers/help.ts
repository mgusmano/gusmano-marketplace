// The help dialog: a pane opened from the header's help button, showing this description.
export const HELP_PANE = 'sencha-help'

export const HELP_MARKDOWN = `# Sencha AI Upgrade

Sencha is a Claude Code mod for Ext JS work. It adds a header above the prompt and a side pane that lists each step as it runs.

## Above the prompt
- **/extjs-upgrade**: runs the \`extjs-upgrade\` Skill. It finds the Ext JS project, checks the Sencha Cmd use and the Ext JS framework version, and then performs the upgrade. It opens the side pane.
- **/extjs-dependency-report**: runs the \`extjs-dependency-report\` Skill. It builds a dependency and AST report for the Ext JS application and writes a summary Markdown file. It opens the side pane.
- **/reext-migrate** (ReExt Migrate): not ready yet. Pressing it shows a "coming soon" message. It will run the ReExt migration.
- **show side pane** (Sencha in the terminal): opens the side pane and focuses it.
- **delete v8 folder** (Delete V8 folder in the terminal): sends Claude the prompt "If there is a V8 folder, then delete it." Claude deletes the folder if it finds one. The button doesn't ask first.
- **help** (Help in the terminal): opens this page.

## Side pane
- **go to bottom** and **go to top**: scroll to the newest or oldest step.
- **clear**: removes every step.
- **close**: closes the side pane.
- **Test**: adds 10 sections of random test items. It is for checking the pane.
- **Add Section** and **Add Item to Latest Section**: add a blank section or item by hand. They are for checking the pane.
- **Expand All** / **Collapse All**: opens or closes every section.

Each step is a section in the list. The list fills in as things happen:
- a session start, with the time, working folder and session ID;
- each prompt you send;
- each command you run;
- each tool call, with its inputs, and a status of running, done, or failed. A failed call shows its error;
- the time each turn took.

Click a section's header to open or close it.

## Skills
- \`extjs-upgrade\`: upgrades an Ext JS project.
- \`extjs-dependency-report\`: writes a dependency and AST report for an Ext JS project.
- \`reext-discover\`: discovers an Ext JS 8 application and migrates it to a Sencha ReExt app. No button runs it yet.

## Commands
- \`/sencha\`: opens the side pane.
- \`/callit\`: runs a Sencha app build on a sample project path. It is for development.
- \`/ask\`: asks for permission to set a test value, then checks the result. It is for development.
`
