// The title row: logo, a title, the version and the time. Each caller reads its own logo and version.
export function Header({ Box, Text, Svg, logo, version }: { Box: any; Text: any; Svg: any; logo: any; version: string }) {
  return (
    <Box flexDirection="row">
      <Svg source={logo} width={15} height={15} alt="Sencha" />
      <Box marginLeft={1}><Text color="yellow" italic>Sencha AI Upgrade</Text></Box>
      <Box marginLeft={1}><Text color="cyan" italic>{version}</Text></Box>
      {/* <Box marginLeft={1}><Text color="yellow" italic>{new Date().toLocaleString()}</Text></Box> */}
    </Box>
  )
}
