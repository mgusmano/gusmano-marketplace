// The line that shows the hint of the button under the pointer, in the spot a place gives it. Blank
// when no button has a hint, so the line keeps its height and nothing below it moves.
export function HoverHint({ Box, Text, hint }: { Box: any; Text: any; hint?: string }) {
  return (
    <Box>
      <Text color="#fb923c" size="caption">{hint ? hint : ' '}</Text>
    </Box>
  )
}
