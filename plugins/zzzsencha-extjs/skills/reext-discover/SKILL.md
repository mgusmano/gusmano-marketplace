---
name: reext-discover
description: Discovers an Ext JS version 8 application and migrates it to a Sencha ReExt app — scaffolds a React application (Vite or Next.js), wires up @sencha/reext (ReExtProvider + ReExtData), and converts the Ext JS views, stores, ViewModels, and custom components into React-hosted ReExt components.
---

# ReExt Discover Expert

Use this skill to discover an Ext JS version 8 application in a folder and convert it into a Sencha ReExt application (Ext JS components hosted inside React via the `@sencha/reext` npm package).

## Core Rules

* **Path Definition**:
  * `<rootPath>` = current / root path
  * `<sourcePath>` = Folder containing the Ext JS 8 application being migrated
  * `<targetRoot>` = Folder containing the newly created React/ReExt application
  * `<projectType>` = Project type: `senchaCmd`, `extGen`, `custom`, `architect`

## Reference Sources (primary, authoritative)
* **NPM package README** — `https://www.npmjs.com/package/@sencha/reext` (or `npm view @sencha/reext readme`). 
* **Sencha ReExt documentation** — `https://docs.sencha.com/reext/` (Getting Started, Step by Step Guide) and * * * **Sencha Ext JS documentation** — `https://docs.sencha.com/extjs/8.0.0/` 

## Key facts to carry through the whole skill:
* ReExt renders any Ext JS `xtype` in React: `<ReExt xtype='grid' config={{...}} onSelect={(cmp,...)=>{...}} ready={(cmp)=>{...}}/>`.
* Every Ext JS component is wrapped in a root React div; layout of parents can be driven with `childFlex` / `childHeight` / `childWidth` / `childRegion` / `childSplit` props; the default parent layout is `{ type: 'vbox', align: 'stretch' }`.
* Custom Ext JS classes (those the app defines with `Ext.define`) are brought into React two ways:
  1. **Files imported into React** — copy the app's custom `Ext.define` classes (views/stores/etc.) into the React app (e.g. `src/reext/`), import them once (`await import('./MainList')`), then use `<ReExt xtype='mainlist' .../>`.
  2. **customfolder + customfiles** — set `ReExtData.customfolder` (a path under the React app's `public` folder) and `ReExtData.customfiles` (array of file names) so ReExt loads the custom component files itself.
* Requires an Ext JS SDK: run a `location: 'local'` app by copying the Ext JS 8 SDK folder (`ext-8.0.0`) and pointing `ReExtData.sdkfolder` at it, or use `location: 'remote'` with `sdkversion` for trial/demo use.
* Overrides (if the source app uses them) go into `classicoverrides.js` / `modernoverrides.js` (per toolkit) inside the SDK folder, with `overrides: true` in `ReExtData`.

## Workflow Instructions

1. **Determine There Is Exactly One Target Folder**
   * List the top-level folders in `<rootPath>`, **excluding hidden folders** (names beginning with a dot, e.g. `.sencha`, `.git`, `.vscode`).
   * **Precondition:** this skill interrogates **one and only one** project folder. If there are zero folders, or more than one candidate folder exists, do not proceed — stop the entire skill immediately and report the outcome (no project folder / ambiguous — multiple candidates found).
   * Otherwise, if exactly one folder exists, set `<sourcePath>` to its path and continue.

2. **Detect Which Project Type (`<projectType>`)**
   * Run Model Context Protocol tool `extjs-project-type`
       - folderPath=`<sourcePath>`
       returning:
       - `<projectType>`
       - `<projectName>`
       - `<reextName>`
       - `<toolkit>` (`classic` | `modern`)
       - `<theme>`
       - `<sourceVersion>`
       - `<sourceVersionShort>`
       - `<sourcePath>`
       - `<targetPath>`
   * Precondition: the source must be an Ext JS **8.x** app. 
   * If `<sourceVersionShort>` is below 8.0.0, stop this SKILL and report the error.
   * If `<sourceVersionShort>` is 8.0.0, continue.
   * Do NOT inventory the application at this time, before trying to understand the appplication, generate the ReExt application in the next step, that step copies all needed files to the ReExt project
   * do no analysis to the generated ReExt project.
   * do not inventory the source application.
   * do not convert any files to ReExt.
   
3. **Determine starting Ext JS view in (`<sourcePath>`)**
   * in `<sourcePath>` determine which Ext JS view is the main / initial view called by the application
   * for the discovered initial view, determine the full file path and put that value in `<reextMainView>` 
   * report the value of `<reextMainView>`

4. **Generate ReExt Project**
   * Run Model Context Protocol tool `reext-generate`
      - reextMainView=`<reextMainView>`
      - sourceName=`<projectName>`
      - targetName=`<reextName>`
      - sourcePath=`<sourcePath>`
      - targetPath=`<targetPath>`
   * Do NOT use local for the generated ReExt application, use remote.

5. **Testing the ReExt application**
   * run the application by calling `npm run dev`
   * show the application in the browser with the http address that was output from `npm run dev`
