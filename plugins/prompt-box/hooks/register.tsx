import type { Register } from 'claude-code'

const TEXT = 'Sample box above the prompt.'

export const register: Register = on => {
  on('ui.render', { component: 'AbovePrompt' }, ($, e, next) => {
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box borderStyle="round" paddingX={1}>
        <Text>{TEXT}</Text>
      </Box>
    )
  })
}
