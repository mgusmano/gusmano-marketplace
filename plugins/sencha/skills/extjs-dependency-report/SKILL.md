---
name: extjs-dependency-report
description: Builds a dependency + AST report for an Ext JS application and writes a summary Markdown file to disk. Initializes the dependency parser, lists all classes, renders each class's dependency tree (ASCII), parses each class file, renders its AST tree, and consolidates everything into an MD report. Use when asked to produce a dependency report, class dependency trees, AST analysis, or an Ext JS project summary report.
---

# Ext JS Dependency & AST Report

Generate a Markdown report of an Ext JS application's classes: their dependency trees and their AST structure, then write a summary report file to the hard drive.

## Tools (MCP)
Always call these tools directly via MCP (never via Bash/Terminal):
- `extjs-dependency-graph_extjs-graph-init-parser` — `appDir` path to the app to analyze
- `extjs-dependency-graph_extjs-graph-list-classes` — lists every `Ext.define` class
- `extjs-dependency-graph_extjs-graph-ascii` — `className`, `maxDepth` — renders a class dependency tree as ASCII
- `extjs-dependency-graph_extjs-graph-find-class-file` — `className` — resolves a class name to its file path
- `extjs-ast-parser_extjs-ast-parse-file` — `filePath` — parses a file into an AST
- `extjs-ast-parser_extjs-ast-tree` — renders the parsed AST as a formatted tree

## 1. Initialize the parser
1. Determine the application directory (the Ext JS app root, e.g. the folder with `app.json` / `app/`). Do not guess — if it isn't obvious from context, call `extjs-ast-parser_extjs-ast-config` or ask how to locate it, or use the current project root.
2. Call `extjs-dependency-graph_extjs-graph-init-parser` with `appDir=<app directory>`.

## 2. List all classes
1. Call `extjs-dependency-graph_extjs-graph-list-classes` to get every `Ext.define` class found in the app.
2. Keep this full list; it is the master list every later loop iterates over.

## 3. Dependency trees
For **each** class returned in step 2:
1. Call `extjs-dependency-graph_extjs-graph-ascii` with `className=<class>` (and a reasonable `maxDepth`, e.g. `10`) to get its dependency tree.
2. Record the ASCII tree output for that class.
Do not skip any class. If a tool errors for a specific class, note the error and continue with the others.

## 4. AST trees
For **each** class file:
1. Resolve the class to its file path with `extjs-dependency-graph_extjs-graph-find-class-file` `className=<class>` if you do not already know the file.
2. Call `extjs-ast-parser_extjs-ast-parse-file` with `filePath=<path>` to parse it.
3. Call `extjs-ast-parser_extjs-ast-tree` to render the AST tree for that file.
4. Record the AST tree output alongside the class.

## 5. Write the summary report
1. Compile every class's dependency tree and AST tree into one document.
2. Write it to the hard drive as a Markdown file, e.g. `<app directory>/DEPENDENCY-REPORT.md` (name it with a clear timestamp/session marker if helpful).
3. Structure the report:
   - Title + the date
   - The app directory analyzed
   - Total class count
   - A table of contents / index of classes
   - Per class: name, source file, dependency tree (ASCII), AST tree
   - Any classes that failed (with the error)
4. Summary Section
   - total number of files
   - total number of class dependencies
   - total number of used properties
   - total number of events
   - total number of methods
   - total lines of code
   - all averages
5. Use the `Write`/filesystem write capability to save the file — do not merely print it.
6. Output the final absolute path of the report file.

## 6. Done
- Do not ask before writing the report; the report is the required deliverable.
- End by stating the report is complete and its absolute path.
