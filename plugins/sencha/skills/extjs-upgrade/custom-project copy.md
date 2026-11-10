# Custom Project Steps

Used by `SKILL.md` when `<projectType>` = `custom` (Custom application).

* **Invoke custom data tool**

```json
    {
      "result": "success",
      "v8sdk": "/Users/demo/upgrade/ext-8.0.0",
      "errors": [],
      "fromversion": "4.2.6",
      "elapsed": "[00:23.0049]",
      "sourceRootName": "current",
      "defaultVersion": "4.2.6.1811",
      "sourceRoot": "/Users/demo/upgrade/Huge/hugerun/current",
      "targetV8Root": "/Users/demo/upgrade/Huge/hugerun/v8",
      "targetRoot": "/Users/demo/upgrade/Huge/hugerun/v8/current",
      "sourceWorkspaceJson": false,
      "frameworks": {
        "ext": {
          "path": "ext",
          "version": "4.2.6.1811"
        }
      },
      "sourceApps": [
        {
          "dir": "/Users/demo/upgrade/Huge/hugerun/v8/wab/aaak",
          "appPath": "",
          "httpPath": "http://localhost:1977",
          "name": "Login",
          "appName": "Login",
          "version": "4.2.6.1811",
          "available": true,
          "root": false,
          "raw": "",
          "use": "",
          "appFolder": "/Users/demo/upgrade/Huge/hugerun/v8/wab/aaak",
          "version_short": "4.2.6",
        }
      ],
      "sourcePackages": [],
      "lintFilesStrings": [
        "/Users/demo/upgrade/run/MyWorkspaceRun/v8/MyWorkspace/apps/demos/Login/app/view/Main.js",
        "/Users/demo/upgrade/run/MyWorkspaceRun/v8/MyWorkspace/apps/demos/Login/sass/example/render.js"
      ]
    }
```

    * set `<data>` to the following JSON array (keep it valid JSON):
```json
    [
      { 
        "fromVersion": "4.2.6",
        "v8sdk": "/Users/demo/upgrade/ext-8.0.0",
        "html": path.join(`<v8>`, "wab", "aaak", 
        "frmDMDebtorsSearch.html"),
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
        ],
        "sourceApps": [
          {
            "dir": "/Users/demo/upgrade/run/MyWorkspaceRun/MyWorkspace/apps/demos/Login",
            "appPath": "apps/demos/Login",
            "httpPath": "http://localhost:1977/apps/demos/Login",
            "name": "Login",
            "appName": "Login",
            "version": "4.2.6.1811",
            "available": true,
            "root": false,
            "raw": "apps/demos/Login",
            "use": "./apps/demos/Login",
            "appFolder": "/Users/demo/upgrade/run/MyWorkspaceRun/v8/MyWorkspace/apps/demos/Login",
            "version_short": "4.2.6",
            "totalFilesCount": 7,
            "totalFoldersCount": 14,
            "lintFilesCount": 2,
            "lintMessagesCount": 8
          }
        ],
      }
    ]
```

   * report `<data>` back to calling SKILL.md
