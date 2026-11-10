# Custom Project Steps

Used by `SKILL.md` when `<projectType>` = `custom` (Custom application).

* **set data**
  * set `<data>` to the following JSON array (keep it valid JSON):
```json
[
  { 
    "fromVersion": "4.2.6",
    "v8sdk": "/Users/demo/upgrade/ext-8.0.0",
    "appRoot": path.join(`<v8>`, "wab", "aaak"),
    "html": "frmDMDebtorsSearch.html"
  }
]
```
  * report `<data>` back to calling SKILL.md
