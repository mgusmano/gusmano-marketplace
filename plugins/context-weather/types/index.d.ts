// Context window fill, as a whole percentage (0 to 100), null until the first
// API response of the live window.
export type Fill = number | null

declare module 'claude-code' {
  interface PluginState {
    'context-weather': { percent: number | null }
  }
}
