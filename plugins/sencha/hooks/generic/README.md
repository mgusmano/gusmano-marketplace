# Generic hooks

One handler script, `handler.mjs`, works in Claude Code, Codex and OpenCode. Each host's config only maps its own event names to the normalized ones the handler understands.

| Normalized | Claude Code | Codex | OpenCode |
| --- | --- | --- | --- |
| `session.start` | SessionStart | SessionStart | `event`: `session.created` |
| `session.end` | SessionEnd | (none) | `event`: `session.deleted` |
| `turn.start` | UserPromptSubmit | UserPromptSubmit | (none documented) |
| `turn.end` | Stop | Stop | `event`: `session.idle` |
| `tool.before` | PreToolUse | PreToolUse | `tool.execute.before` |
| `tool.after` | PostToolUse | PostToolUse | `tool.execute.after` |

## Files

- `handler.mjs`: the shared logic. Reads the event JSON from stdin and runs the handler lists for the event named in argv. Exit 0 allows the event. Exit 2 blocks it and sends the stderr reason back to the host.
- `claude-hooks.json`: Claude Code. Uses `${CLAUDE_PLUGIN_ROOT}`, so it works from inside a plugin.
- `codex-config.toml`: Codex. Paste into `config.toml` and replace `/ABSOLUTE/PATH`.
- `opencode-plugin.ts`: OpenCode. Copy into `.opencode/plugins/`. It calls `handler.mjs` with `spawnSync`, so the handler is shared.

## Adding a hook

Write a function that takes the input and returns `{ block: 'reason' }` to stop the event, or nothing. Add it to the list for that event in `handlers`. Lists run in order and stop at the first block.

## Caveats

- The OpenCode event names come from third-party guides that disagree with each other. Check them against the installed `@opencode-ai/plugin` types. OpenCode has no documented `turn.start` event, so that one is not mapped.
- The Codex event list and config shape come from the Codex hooks docs. Codex has no SessionEnd event, so `session.end` is not mapped there.
- The handler assumes the host sends `session_id`, `cwd`, `tool_name` and `tool_input` (Claude Code's field names). The OpenCode adapter maps its own fields to these names.
- The log goes to `GENERIC_HOOK_LOG`, or `.hook-events.jsonl` in the session's `cwd`.
