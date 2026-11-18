---
name: reext-create
description: Creates a ReExt Application
---

# ReExt Create Expert

Use this skill to create a ReExt application

# **Create a ReExt Application

* AskAQuestion or ask user question for the name of the application - make 1 recommendation as MyApp
* create a ReExtApp with the name of the application 
* use the @sencha/reext npm package readme quickstart for guidence 
* do ALL steps in the @sencha/reext npm package readme quickstart, including the copy steps
* use extjs 8.0.0 for sdkversion in ReExtData
* use modern for toolkit in ReExtData
* use material for theme in ReExtData
* do not do npm run build
* do npm run dev
* create an environment variable in .env to hold reextkey
* add the reext key: read it from the `REEXT_KEY` claude environment variable (e.g. `printenv REEXT_KEY`).
* a 5 character `REEXT_KEY` is valid
* if it is unset, stop and tell the user to add it to `~/.claude/settings.json` under `env`
* never write the key into the skill or any file in the repo
* AskAQuestion or ask user question with a list of all design artifacts to select 
* clear out all of the existing views in the application, do not clear out the public folder
* create all mock json in a data folder and import into app
* use store config prop for all components needing data
* point to mock data only if no connector data from the design artifact
* for any css use tailwindcss as styles, no inline css in React JSX or html tags
* always use an existing ReExt component for any UI elements - charts, grids, buttons
* put each ReExt config in a const at the top of the page
* make sure by testing that the main page is scrollable
* make the default background page for the html page white
* for the selected artifact completely implement its design
* use any and all connectors used by the artifact in the ReExt application as thesource of data
* make sure all headers render exactly as in the  artifact
* make sure all charts render exactly as in the  artifact
* make sure all kpi's render exactly as in the  artifact
* after the selected artifact is completely implemented, add this JSX to top of the page
```javascript
    <ReExt xtype='logo'/>
```
* update all dependencies and devDependencies to latest versions and do an npm install
* for vite require the port to be 1977 - stop the port if it is running
* open the app in the browser as a developer build
* create a SUMMARY.md in the root folder of the application
