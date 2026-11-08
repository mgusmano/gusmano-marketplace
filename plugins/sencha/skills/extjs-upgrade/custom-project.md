# Custom Project Steps

Used by `SKILL.md` when `<projectType>` = `custom` (Custom application).

* **Invoke custom data tool**

    * set `<data>` to the following JSON array (keep it valid JSON):
    ```json
    [
      { 
        "v8sdk": "/Users/demo/upgrade/ext-8.0.0",
        "html": path.join(`<v8>`, "wab", "aaak", "frmDMDebtorsSearch.html"),
        "files" : [
            "../resources/javascriptEXT/AcckComboBox.js",
            "../resources/javascriptEXT/AcckComboBox2.js",
            "../resources/javascriptEXT/AcckCustomFieldPanel.js",
            "../resources/javascriptEXT/AcckCustomFieldSearchPanel.js",                          
            "../resources/javascriptEXT/AcckProxyStore.js",
            "../resources/javascriptEXT/frmDMDebtorsSearch.js",
            "../resources/javascriptEXT/frmShortCuts.js",
            "../resources/javascriptEXT/IframeWindow.js",
            "../resources/javascriptEXT/oasis.js",
            "../resources/javascriptEXT/oasis2.js"
        ]
      }
    ]
    ```

   * report `<data>` back to calling SKILL.md
