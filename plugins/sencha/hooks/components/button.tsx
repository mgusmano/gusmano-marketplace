import type { ClientModule } from 'claude-code'

export type ButtonProps = { id: string; label: string; dim: boolean }

// A header button that also tells the hooks module when the pointer is over it, which a Button
// alone doesn't, so the header can say what the button does. A Client only gets the terminal
// element table, so the chrome is a bordered Box around the Button.
const HeaderButton: ClientModule<ButtonProps, { over: boolean }> = (props, surface) => {
  const { Box, Button } = surface.elements
  surface.onPointer(e => {
    const over = e.type !== 'leave'
    if (over === Boolean(surface.state?.over)) return
    surface.setState({ over })
    surface.post({ over })
  })
  return (
    <Box borderStyle="single" paddingX={1} paddingY={0}>
      <Button key={props.id} dimColor={props.dim} label={props.label} onPress={() => surface.post({ press: true })} />
    </Box>
  )
}

export default HeaderButton
