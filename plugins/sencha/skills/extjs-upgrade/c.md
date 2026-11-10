


#### If `<projectType>` = `customCurrent` (Custom application)
* create a v8 folder in `<rootPath>` and refer to it as `<targetV8Root>`
* copy entire `<sourceRoot>` to `<targetV8Root>` and include all files and folders
* Follow the steps in `custom-project.md` in this skill's directory.
* set `<data>` to  the return from `custom-project.md` 
* after finishing, AskAQuestion Should the source code in `<name>` be displayed?
* if yes, read the data and display as a separate code structure block in the output
* for each string `<file>` in the files array for `<targetV8Root>`, call Run Model Context Protocol tool `extjs-lint-test` 
      - folderPath=`<targetV8Root>`
      - fromVersion="4.2.6"
      - applyFixes=false
* Make all LINT fixes
    * for each string `<file>` in the files array  for `<targetV8Root>`, find each //**LINT START** to //**LINT END** and make the changes needed.  if // additional: exists prioritize that
    * If there are no file names in `<augmentedFiles>` with //**LINT START** to //**LINT END** then continue.
    * one of the comments is `// AI:` - use that to write any comments to the right of it on what was done to fix the linting issues.  Do not exceed the 1 line comment limit.  If there are multiple // AI: comments, combine them into one comment. never leave this blank - always comment on every instance.
    * do not remove the resolved lint comments, leave them in the code for future reference.
    * never remove any source code, always comment it out as a comment - never on a separate line - always to the right of the modified source code line starting with `//**LINT COMMENTED OUT**`  Add a comment `// AI: ` to the right of the commented code explaining why it was commented out - always on the same line, never on a separate line.  If there are multiple // AI: comments, combine them into one comment.
    * do research and find solutions for all deep API migrations
    * do not remove `// AI: ` if it is blank, leave it in the code for future reference.
    * do not leave any `// AI: ` blank - comment on every instance

* Update index.html
    * update script and lint tags for the target SDK then make the needed updates - set target SDK folder to `<targetSDK>`
    * use v8sdk to update the index.html file in `<v8>`
    
* Smoke test
    * Run Model Context Protocol tool `extjs-tools_sencha-stop` and wait for it to fully complete.
    * Run Model Context Protocol tool `extjs-tools_sencha-web-start`
        - folderPath=`<targetRoot>`
          and wait for sencha web start ready.

    * Run Model Context Protocol tool `extjs-tools_extjs-capture-logs-puppeteer`
    - progress=true
    - appPath=`<currenttargetRootAppPath>`
    * to produce basic smoke test to find runtime errors. 
    * Never run puppeteer on its own - only use this Model Context Protocol tool.
    * Resolve any errors and rerun from the beginning of Smoke Test until no more errors
    c. When an error is resolved put a comment `//**UPGRADE FROM SMOKE TEST START**` above the resolution and put a comment `//**UPGRADE FROM SMOKE TEST END**` below the resolution 

    * when all errors are fixed Run Model Context Protocol tool `extjs-tools_sencha-stop` and wait for it to fully complete.
    * Research and fix runtime errors from capture logs, do not research warnings.  Inspect `<targetSDK>` resolve any runtime errors
      * If an error is resolved, repeat this step 11 - Smoke test. Continue until all errors are resolved.
    * Do not move to the next step until all errors are resolved.

* Cleanup
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

* Output Format
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
