---
name: reext-create
description: Creates a ReExt Application
---

# ReExt Create Expert

Use this skill to create a ReExt application

## Core Rules
* At the start of every task and tool call, output a mcp__ccd_turn__update_plan or structured status box or checklist using markdown code blocks so the progress is explicitly visible in the terminal. If available, use ToDos or todowrite or todowrite or mcp__ccd_turn__update_plan Model Context Protocol tool to document progress.
Update the progress after every tool call.  For mcp__ccd_turn__update_plan you must always provide a scope parameter.
* **Constraint**: Leave unrelated code untouched
* **Thinking**: Be terse when creating and outputting thinking/thought tokens
* **Model Context Protocol Tools**: Always call Model Context Protocol Tools directly via Model Context Protocol, never via Bash or Terminal. 
* **Continue**: Continue through the entire skill without asking.
* **Constraint**: Use ToDos or todowrite Model Context Protocol tool to document progress
* **Path Definition**:
  * `<rootPath>` = the full root path of the project / the current working directory
* documentation for ReExt is at https://www.npmjs.com/package/@sencha/reext

# **Create a ReExt Application

* Call the `AskUserQuestion` tool (not a plain-text prompt) to ask for the application name; recommend `MyApp` - put answer in `<AppName>`
* Run Model Context Protocol tool `reext-create-app`
    - progress=true
    - cwd=`<rootFolder>`
    - name=`<appName>`
* Call the `AskUserQuestion` tool (not a plain-text prompt) to request the ReExt key
* create an environment variable in .env to hold reextkey called VITE_REEXT_KEY
* add the answer form the request of ReExt key as the value of the created environment variable
* always hide the ReExt key from the user and never display it in any output
* never write the key into the skill or any file in the repo
* use the environment variable key reference in main.tsx to set reextkey={import.meta.env.VITE_REEXT_KEY} of ReExtProvider
* change sdkversion in ReExtData.js to "8.1.0"

* Call the `AskUserQuestion` tool (not a plain-text prompt) to ask if the user has a design artifact to implement (yes or no);

* if no, do the following: 
    * for vite require the port to be 1977 - stop the port if it is running
    * do not do npm run build
    * do npm run dev
    * open the app in the browser as a developer build
    * create a SUMMARY.md in the root folder of the application
    * complete the skill and exit; 

* if yes, continue to the next step

* Call the `AskUserQuestion` tool (not a plain-text prompt) with all design artifacts as selectable options
* clear out all of the existing views in the application, do not clear out the public folder
* create all mock json in a data folder - each source as a separate file - and import into app
* use store config prop for all components needing data
* point to mock data only if no connector data from the design artifact
* for any css use tailwindcss as styles, no inline css in React JSX or html tags
* always use an existing ReExt component for any UI elements - charts, grids, buttons
* always use dataview ReExt component for any html-based UI elements - like KPI's
* all subsections of the page should not have scrollbars, only the main page content should be scrollable
* put each ReExt config in a const at the top of the page with comments
* make sure by testing that the main page root element takes up the entire client area
* make sure by testing that the main page content is scrollable
* make the default background page for the html page white
* for the selected artifact completely implement its design
* completely implement the title / header
* use flexBox to make sure all components render
* use any and all connectors used by the artifact in the ReExt application as the source of data
* make sure all grid row cells display actual data, not the tpl text - no span displayed, should be rendered - use encodeHtml: false
* make sure all headers render exactly as in the  artifact
* make sure all charts render exactly as in the  artifact
* make sure all kpi's render exactly as in the  artifact - each kpi's border needs to be correct width
* after the selected artifact is completely implemented, add this JSX as the first child of the main page root element
```javascript
    <ReExt xtype='logo'/>
```
* update all dependencies and devDependencies to latest versions and do an npm install
* do not do npm run build
* do npm run dev
* for vite require the port to be 1977 - stop the port if it is running
* open the app in the browser as a developer build
* verify with puppeteer and screen shots that everything works and all data displays
* create a SUMMARY.md in the root folder of the application
