---
name: custom
description: This is a custom customer skill
---

# Custom Skill Expert
* `<company>` = Huge

1. **Announce custom skill**
   * display a response saying you are a custom skill for `<company>` 
   * set `<customAppPath>` to path.join(`<sourceRoot>`,wab,aaak)   
   * set `<customData>` to the following JSON array (keep it valid JSON):
     ```json
     [
       { 
            "html": "/Users/demo/upgrade/Huge/current/wab/aaak/frmDMDebtorsSearch.csp", 
            "fromVersion": "4.2.6",
            "files": [
                { "src": "/Users/demo/upgrade/Huge/current/resources/javascriptEXT/AcckComboBox.js" }, 
                { "src": "/Users/demo/upgrade/Huge/current/resources/javascriptEXT/AcckComboBox2.js" }, 
                { "src": "/Users/demo/upgrade/Huge/current/resources/javascriptEXT/AcckCustomFieldSearchPanel.js" }, 
                { "src": "/Users/demo/upgrade/Huge/current/resources/javascriptEXT/AcckProxyStore.js" }, 
                { "src": "/Users/demo/upgrade/Huge/current/resources/javascriptEXT/frmDMDebtorsSearch.js" }, 
                { "src": "/Users/demo/upgrade/Huge/current/resources/javascriptEXT/frmShortCuts.js" },
                { "src": "/Users/demo/upgrade/Huge/current/resources/javascriptEXT/IframeWindow.js" }, 
                { "src": "/Users/demo/upgrade/Huge/current/resources/javascriptEXT/oasis.js" }, 
                { "src": "/Users/demo/upgrade/Huge/current/resources/javascriptEXT/oasis2.js" } 
            ]
        }
     ]
     ```
   * report `<customData>`
   * set `<customAppHtml>` to `frmDMDebtorsSearch.csp`
   * return an object with the keys `customData`, `customAppPath`, and `customAppHtml`, set to the values of `<customData>`, `<customAppPath>`, and `<customAppHtml>` respectively

2. **Invoke custom data tool**
   * call `mcp__plugin_sencha_extjs-tools__custom` (load its schema with ToolSearch first if it is deferred)
   * pass `data` as the JSON string of this hardcoded array, with one object and one property `name`:
     ```json
     [
       { "name": "Huge" }
     ]
     ```
   * report the tool's response
