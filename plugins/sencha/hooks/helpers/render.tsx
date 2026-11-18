import { renderMessage } from './index'

// Dedicated ui.render hooks for command output and tool progress. What they do not handle goes to renderMessage
// (or to the host's own drawing, via next).

// Text drawn by a Text or Code element: tabs become spaces; other control characters (carriage returns, ANSI
// escapes) would make the row malformed, so they become spaces too. Newlines stay for Code, which draws them.
const TEXT_CHARS = 20000
const plain = (text: string | undefined): string =>
  (text ?? '').replace(/\t/g, '    ').replace(/[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/g, ' ').slice(0, TEXT_CHARS)

// CommandOutput: what a command printed. Plain output draws in the code font, since commands print logs and
// aligned tables; an errored run keeps the standard row, which draws the error colour.
export async function renderCommandOutput($: any, e: any, next: any) {
  if (e.props.isErrored) return renderMessage($, e, next)
  const { Box, Text, Code } = $.ui.resolve(e)
  return (
    <Box flexDirection="column">
      <Text color="cyan" bold italic>{`${e.props.command}:`}</Text>
      <Code source={plain(e.props.text)} wrap="wrap" />
    </Box>
  )
}

// ToolProgress: the run-in-background pill under a running tool call. Its hint draws dim; other kinds are left
// to the host.
export async function renderToolProgress($: any, e: any, next: any) {
  if (e.props.kind !== 'background_hint') return next(e)
  const { Text } = $.ui.resolve(e)
  return <Text dimColor>{plain(e.props.hint)}</Text>
}
