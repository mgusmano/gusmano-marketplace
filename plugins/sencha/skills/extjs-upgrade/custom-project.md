# Custom Project Steps

#### If `<projectType>` = `custom2` (Custom application)
* Follow the steps in `custom-project.md` in this skill's directory.
* set `<name>` to  `<response>`[0].html
* after finishing, AskAQuestion Should the source code in `<name>` be displayed?
* if yes, read the data and display as a separate code structure block in the output


Used by `SKILL.md` when `<projectType>` = `custom` (Custom application).

* **Invoke custom data tool**
    * set `<data>` to the following JSON array (keep it valid JSON):
    ```json
    [
      { "html": "/Users/demo/upgrade/Huge/hugerun/current/wab/aaak/frmDMDebtorsSearch.csp" }
    ]
    ```
   * call `mcp__plugin_sencha_extjs-tools__custom` (load its schema with ToolSearch first if it is deferred)
   * pass `data` set to the value of `<data>`, as a JSON string
   * pass the tool's response as a JSON code structure in `<response>`
   * report `<response>`[0].html as `<name>`
