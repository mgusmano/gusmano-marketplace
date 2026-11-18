import type { ClientModule } from 'claude-code'

// A list of `count` rows, drawing the `height` rows from `offset` down. The hook owns the offset and moves it
// with the previous and next buttons; this module only draws what it is given, so it keeps no state.

export type ListProps = { count: number; height: number; offset: number }

const ListModule: ClientModule<ListProps, unknown> = (props, surface) => {
  const { Box, Text } = surface.elements
  const height = Math.max(1, props.height)
  const offset = Math.max(0, Math.min(props.offset, Math.max(0, props.count - height)))

  return (
    <Box flexDirection="column" height={height}>
      {Array.from({ length: height }, (_, r) => {
        const index = offset + r
        return (
          <Box key={String(r)} height={1}>
            <Text wrap="truncate-end">{index < props.count ? `item ${index + 1}` : ' '}</Text>
          </Box>
        )
      })}
    </Box>
  )
}

export default ListModule
