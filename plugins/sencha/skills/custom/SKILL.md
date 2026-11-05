---
name: custom
description: This is a custom customer skill
---

# Custom Skill Expert

* **Invoke custom data tool**
    * set `<data>` to the following JSON array (keep it valid JSON):
    ```json
    [
      { "name": "mjg3", "html": "/Users/demo/upgrade/Huge/hugerun/current/wab/aaak/frmDMDebtorsSearch.csp" }
    ]
    ```
   * call `mcp__plugin_sencha_extjs-tools__custom` (load its schema with ToolSearch first if it is deferred)
   * pass `data` set to the value of `<data>`, as a JSON string
   * report the tool's response as a JSON code structure in `<response>`
   * report `<response>`[0].html
