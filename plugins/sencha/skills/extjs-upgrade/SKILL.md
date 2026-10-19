---
name: extjs-upgrade
description: Determines Ext JS project details within a repository or workspace, including project location, Sencha Cmd usage, and the Ext JS framework version. Then performs Ext JS upgrade. 
---

# Ext JS Upgrade Expert

## Core Rules
* **Constraint**: Leave unrelated code untouched
* **Thinking**: Be terse when creating and outputting thinking/thought tokens
* **Model Context Protocol Tools**: Always call Model Context Protocol Tools directly via Model Context Protocol, never via Bash or Terminal. 
* **Continue**: Continue through the entire skill without asking.
* **Constraint**: Use ToDos or todowrite Model Context Protocol tool to document progress
* **Path Definition**:
  * `<rootPath>` = current / root path
  * `<sourceRoot>` = Folder containing the application to be upgraded
  * `<targetRoot>` = Folder containing the newly created v8 application
  * `<targetSDK>` = Folder containing the ExtJS Version 8 SDK files
  * `<projectType>` = Project type: `senchaCmd`, `extGen`, `custom`, `architect`

## Workflow Instructions

1. **Determine There Is Exactly One Target Folder**
   * List the top-level folders in `<rootPath>`, **excluding hidden folders** (names beginning with a dot, e.g. `.sencha`, `.git`, `.vscode`).
   * **Precondition:** this skill interrogates **one and only one** project folder. If there are zero folders, or more than one candidate folder exists, do not proceed — stop the entire skill immediately and report the outcome (no project folder / ambiguous — multiple candidates found).
   * **Otherwise, if exactly one folder exists**, the exactly one folder is set to `<sourceRoot>`

2. **Detect Which Project Type (`<projectType>`)**
    * Run Model Context Protocol tool `extjs-project-type`
        - folderPath=`<sourceRoot>`
        returning: 
        - `<projectType>`
        - `<toolkit>`
        - `<theme>`
        - `<sourceVersionShort>`

3. **Branching Execution**

#### If `<projectType>` = `senchaCmd` (is a Sencha Cmd application)
1. Only run this branch 1 time.
2. Run Model Context Protocol tool `extjs-tools_extjs-initilize-with-sencha-cmd` 
        - rootPath=`<rootPath>`
        returning:
        - `<sourceRoot>` 
        - `<sourceApps>`
        - `<sourcePackages>`
        - `<targetRoot>`
        - `<augmentedFiles>`
    * if a result=fail is returned, then end processing - do not do any exploring, ALWAYS END THIS SKILL — echo the tool's fail reason
    * if result=success is returned, continue.
3. Verify Linting in Apps Folders
    * If there are any file names in `<augmentedFiles>` then fead each file name and find the text to the right of all `***ADDITIONAL MESSAGE:` markers.  For each found text read the text and confirm that the lint fix is conforms to the text - make needed fixes to the file if not correct - indicate with `// ***ADDITIONAL MESSAGE FIX IS IMPLEMENTED`.
    * If there are no file names in `<augmentedFiles>` then continue.
4. Production Build & Validation
    * Run Model Context Protocol tool `extjs-tools_sencha-stop` and wait for it to fully complete.
    * Do the following steps for each `<appsFolder>` in `<sourceApps>` 
      a. Run Model Context Protocol tool `extjs-tools_sencha-app-build`
        - cwd=`<appsFolder>`
      b. Inspect `<targetRoot>/ext/build/ext-all-rtl-debug.js` to debug and resolve any compilation errors,
    * If an error is resolved, repeat starting at step 1. Start Server until all errrors are resolved.
5. Dev Server & Smoke Test Validation
    * Do the following steps for each `<appsFolder>` in `<sourceApps>` 
      a. Run Model Context Protocol tool `extjs-tools_sencha-stop` and wait for it to fully complete.
      b. Run Model Context Protocol tool `extjs-tools_sencha-app-watch`
        - cwd=`<appsFolder>`
        and wait for the server ready signal.
      c. Model Context Protocol tool `extjs-tools_extjs-capture-logs-puppeteer` to produce basic smoke test to find runtime errors.  
        * Never run puppeteer on its own - only use this Model Context Protocol tool.
        * Fix any errors and rerun from the beginning of Smoke Test until no more errors.
      e. Reseach and fix runtime errors from capture logs, do not research warnings.  Inspect `<targetRoot>/ext/build/ext-all-rtl-debug.js` to resolve any runtime errors
      f. If an error is resolved, repeat starting at step 1a. Contonue until all errrors for `<appsFolder>` are resolved.
    * Do not move to the next `<appsFolder>` until all errrors are resolved.
6. Cleanup and Documention Summary
    * Only start this step if all runtime errors are resolved.
    * Run Model Contect Protocol tool `extjs-tools_extjs-prettier-all`
        - folderPath=`<targetRoot>`
    * Show the app in an inline browser at `http://localhost:1977`
    * Create `<targetRoot>/UPGRADE.md` documenting:
        -steps
        -changes
        -`Override of Class` notes
        -Model Contect Protocol tool `extjs-tools_extjs-capture-logs-puppeteer` notes
        -residual warnings
    * Output the final path to `<targetRoot>/UPGRADE.md`.
    * Do not outout any text summary, explain that the upgrate is now complete and that the summary is available in  `<name>/UPGRADE.md`
7. Output Format
    * Return the final analysis in the following structured format:
      * **Source Project Type (`<projectType>`):** `senchaCmd` | `extGen` | `custom`
      * **Source Folder (`<sourceRoot>`):** `<path_to_sourceRoot>`
      * **Target Folder (`<targetRoot>`):** `<path_to_targetRoot>`
      * **Source Ext JS Version (`<sourceVersionShort>`):** `<sourceVersionShort_string>`
      * **Source Ext JS Toolkit (`<toolkit>`):** `classic` | `modern` | `unknown`
      * **Source Ext JS Theme (`<theme>`):** `<theme_name>`
      * **Lint Folders Processed (`<foldersProcessed>`):** `<foldersProcessed>`
      * **Lint Files Fixed (`<filesFixed>`):** `<filesFixed>`
      * **Lint Folders Failed (`<foldersFailed>`):** `<foldersFailed>`

#### If `<projectType>` = `extGen` (is a ext-gen application)
1. Output Format
    * Return the final analysis in the following structured table format - 1 per line:
      Source Project Type - NOT YET IMPLEMENTED
      * **Source Project Type (`<projectType>`):** `senchaCmd` | `extGen` | `custom` | `architect`
      * **Source Folder (`<sourceRoot>`):** `<path_to_sourceRoot>`
      * **Source Ext JS Version (`<sourceVersionShort>`):** `<sourceVersionShort_string>`
      * **Source Ext JS Toolkit (`<toolkit>`):** `classic` | `modern` | `unknown`
      * **Source Ext JS Theme (`<theme>`):** `<theme_name>`

#### If `<projectType>` = `architect` (is an architect application)
1. Output Format
    * Return the final analysis in the following structured table format - 1 per line:
      Source Project Type - NOT YET IMPLEMENTED
      * **Source Project Type (`<projectType>`):** `senchaCmd` | `extGen` | `custom` | `architect`
      * **Source Folder (`<sourceRoot>`):** `<path_to_sourceRoot>`
      * **Source Ext JS Version (`<sourceVersionShort>`):** `<sourceVersionShort_string>`
      * **Source Ext JS Toolkit (`<toolkit>`):** `classic` | `modern` | `unknown`
      * **Source Ext JS Theme (`<theme>`):** `<theme_name>`

#### If `<projectType>` = `custom` (Custom application)

1. Run Model Context Protocol tool `extjs-tools_extjs-initilize-custom` 
      - rootPath=`<rootPath>`
      returning:
      - `<foldersProcessed>`
      - `<filesFixed>`
      - `<foldersFailed>`
      - `<augmentedFiles>`
    * if a result=fail is returned, then end processing - do not do any exploring, ALWAYS END THIS SKILL — echo the tool's fail reason
    * if result=success is returned, continue.
2. Verify Linting in Apps Folders
    * Read each file in `<augmentedFiles>` and find the text to the right of all `***ADDITIONAL MESSAGE:` markers.  For each found text read the text and confirm that the lint fix is conforms to the text - make needed fixes to the file if not correct - indicate with `// ***ADDITIONAL MESSAGE FIX IS IMPLEMENTED`.
3. Update index.html
    * update script and lint tags for the target SDK then make the needed updates - set target SDK folder to `<targetSDK>`
4. Smoke test
    * Run Model Context Protocol tool `extjs-tools_sencha-stop` and wait for it to fully complete.
    * Run Model Context Protocol tool `extjs-tools_sencha-web-start`
        - folderPath=`<targetRoot>`
          and wait for sencha web start ready.
    * Model Context Protocol tool `extjs-tools_extjs-capture-logs-puppeteer` to produce basic smoke test to find runtime errors.  
      * Never run puppeteer on its own - only use this Model Context Protocol tool.
      * Fix any errors and rerun from the beginning of Smoke Test until no more errors.
    * when all errors are fixed Run Model Context Protocol tool `extjs-tools_sencha-stop` and wait for it to fully complete.
    * Reseach and fix runtime errors from capture logs, do not research warnings.  Inspect `<targetSDK>` resolve any runtime errors
      * If an error is resolved, repeat this step 11 - Smoke test. Continue until all errors are resolved.
    * Do not move to the next step until all errors are resolved.
5. Cleanup
    * Only start this step if all runtime errors are resolved.
    * Run Model Context Protocol tool `extjs-tools_sencha-stop` and wait for it to fully complete.
    * Run Model Contect Protocol tool `extjs-tools_extjs-prettier-all`
        - folderPath=`<targetRoot>`
    * Create `<targetRoot>/UPGRADE.md` documenting:
        -steps
        -changes
        -`Override of Class` notes
        -Model Contect Protocol tool `extjs-tools_extjs-capture-logs-puppeteer` notes
        -residual warnings
    * Output the final path to `<targetRoot>/UPGRADE.md`.
    * Do not outout any text summary, explain that the upgrate is now complete and that the summary is available in  `<name>/UPGRADE.md`
6. Output Format
    * Return the final analysis in the following structured table format - 1 per line:
      * **Source Project Type (`<projectType>`):** `senchaCmd` | `extGen` | `custom`
      * **Source Folder (`<sourceRoot>`):** `<path_to_sourceRoot>`
      * **Target Folder (`<targetRoot>`):** `<path_to_targetRoot>`
      * **Source Ext JS Version (`<sourceVersionShort>`):** `<sourceVersionShort_string>`
      * **Source Ext JS Toolkit (`<toolkit>`):** `classic` | `modern` | `unknown`
      * **Source Ext JS Theme (`<theme>`):** `<theme_name>`
      * **Source SDK Folders (`<sdkFolders>`):** `<sdkFolders>`
      * **Lint Folders Processed (`<foldersProcessed>`):** `<foldersProcessed>`
      * **Lint Files Fixed (`<filesFixed>`):** `<filesFixed>`
      * **Lint Folders Failed (`<foldersFailed>`):** `<foldersFailed>`
