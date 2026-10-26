export type UpgradeRun = {
  projectType?: string
  toolkit?: string
  theme?: string
  sourceVersion?: string
  sourceRoot?: string
  targetRoot?: string
  lintFolders?: number
  lintFilesFixed?: number
  lintFoldersFailed?: number
  serverUrl?: string
}

export type UpgradeStep = {
  id: string
  tool: string
  subject?: string
  status: 'runs' | 'done' | 'fail'
}

export type Message = {
  name?: string
  title: string
  message: string
}

declare module 'claude-code' {
  interface PluginState {
    'sencha': {
      // lines: { name: string }[];
      // history: Message[];
      // run: UpgradeRun; 
      // steps: UpgradeStep[]; 
      // messages: Message[]
      percent: number | null
      tokens: number | null
      window: number | null
      cost: number | null
    }
  }
  // The extjs-tools server is this mod's own, so it is never connected when the
  // generated MCP types are written: declare its tools by hand for $.tool.call.
  interface McpToolInputs {
    'mcp__extjs-tools__task-start': {
      name?: string
      ttlMs?: number
    }
    'mcp__extjs-tools__task-get': {
      taskId: string
    }
    'mcp__plugin_sencha_extjs-tools__test-global-set': {
      name?: string
      value?: string
    }
    'mcp__plugin_sencha_extjs-tools__test-global-get': {
      name?: string
    }
  }
}
