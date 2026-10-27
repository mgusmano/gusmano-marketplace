// The title row: logo, a title, the version and the time. Each caller reads its own logo and version.
// The logo is always `logo`: SVG markup (a string, drawn by `Svg`) or a PNG (`{ png }`, drawn by `Image`).
// The desktop has `Svg` only and the terminal has `Image` only, so a caller passes both elements it has.
export function Header({ Box, Text, Svg, Image, logo, version }: { Box: any; Text: any; Svg?: any; Image?: any; logo: string | { png: string }; version: string }) {
  const mark = typeof logo === 'string'
    ? (Svg ? <Svg source={logo} width={15} height={15} alt="Sencha" /> : null)
    : (Image ? <Image source={logo} columns={2} rows={1} alt="Sencha" /> : null)
  return (
    <Box flexDirection="row">
      {mark}
      <Box marginLeft={1}><Text color="yellow" italic>Sencha Claude Code Companion</Text></Box>
      <Box marginLeft={1}><Text color="cyan" italic>{version}</Text></Box>
    </Box>
  )
}
