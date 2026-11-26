import { REXT_LOGO } from './reext-logo.js'

// Christmas Eve drawn as a glyph mosaic: every pixel is a small square tile with a
// character stamped in it, over a dotted grid, with blocky drop shadows.
// Pure vector. All motion is SMIL (<animate>, <animateTransform>) set to repeat
// indefinitely; nothing runs as script.
//
// Two layers so it fits any window:
//   - the sky fills the window (slice), and
//   - the picture (moon, house, trees, sleigh, snow) always fits whole (meet),
//     anchored to the bottom, with snow, grid and ground running past its edges.

// Every animation's period divides this evenly (sleigh 26s, snow 17.33s or
// 26s, lights 1.3s, stars 2.6s, glow 3.25s, bob 1s, legs 0.5s, nose 1s), so
// at each multiple of it the whole scene is back where it started. The mod
// reloads the backdrop on that beat, which unfreezes it without a visible jump.
export const LOOP_SECONDS = 52

const T = 10 // tile pitch
const S = 9 // tile size

// key: [tile fill, glyph ink]
const PALETTE = {
  w: ['#f2f6ff', '#b4c4de'], // snow
  l: ['#c4d4ee', '#8ea4c8'], // snow in shade
  r: ['#e2485c', '#9e2236'], // red
  n: ['#b02f45', '#721729'], // roof crimson
  y: ['#f4d36a', '#b08f2a'], // gold
  o: ['#f0a64a', '#b06a1e'], // window frame glow
  m: ['#c98a5a', '#8c5832'], // walls
  c: ['#a24a3c', '#6a2a20'], // chimney brick
  g: ['#4caf6e', '#24703f'], // green
  d: ['#2d7a4a', '#164a2a'], // deep green
  b: ['#a86b3c', '#6a3f1c'], // reindeer
  k: ['#5e3a1c', '#2f1c0a'], // antler, eye
  s: ['#f2c6a4', '#b8865e'], // skin
  z: ['#ff3d3d', '#a81414'], // red nose
  q: ['#fff1c2', '#d2bd78'], // moon
  h: ['#ecd394', '#b39a55'], // moon crater
  t: ['#7a4a2a', '#46280f'], // trunk
  f: ['#ffffff', '#c9d6ec'], // snowflake
}
const GLYPHS = ['$', 't', '%', 'X']
const FLAKE_GLYPHS = ['*', '+', ':', '*']

const SYMBOLS = Object.entries(PALETTE)
  .map(([key, [fill, ink]]) =>
    (key === 'f' ? FLAKE_GLYPHS : GLYPHS)
      .map(
        (g, i) =>
          `<g id="${key}${i}"><rect width="${S}" height="${S}" rx="1" fill="${fill}" stroke="${ink}" stroke-width="0.8"/><text x="4.5" y="7" fill="${ink}">${g}</text></g>`,
      )
      .join(''),
  )
  .join('')

const BULB = { r: '#ff4d5e', y: '#ffd84a', g: '#53e08a', u: '#5ab4ff', p: '#ff8ad0' }
const BULB_SYMBOLS = Object.entries(BULB)
  .map(
    ([k, c]) =>
      `<g id="L${k}"><rect width="6" height="6" rx="1.5" fill="${c}"/><rect x="1" y="1" width="2" height="2" fill="#ffffff" opacity="0.75"/></g>`,
  )
  .join('')

// ---------- SMIL helpers: every animation repeats forever ----------

// Opacity that holds each value in turn (pixel-style on/off).
const blink = (values, dur, begin = 0) =>
  `<animate attributeName="opacity" values="${values}" dur="${dur}s" begin="${begin}s" calcMode="discrete" repeatCount="indefinite"/>`
// Opacity that eases between values.
const fade = (values, dur, begin = 0) =>
  `<animate attributeName="opacity" values="${values}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>`
// A translation along a list of points.
const move = (values, dur, begin = 0, discrete = false) =>
  `<animateTransform attributeName="transform" type="translate" values="${values}" dur="${dur}s" begin="${begin}s"${discrete ? ' calcMode="discrete"' : ''} repeatCount="indefinite"/>`

// Lay a pixel map out as tiles. Each map character is a palette key; '.' is empty.
function tiles(rows, ox = 0, oy = 0, salt = 0) {
  let out = ''
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = row[x]
      if (!(c in PALETTE)) continue
      const v = (x * 7 + y * 13 + salt) % 4
      out += `<use href="#${c}${v}" x="${(ox + x) * T}" y="${(oy + y) * T}"/>`
    }
  })
  return out
}

// A sprite's blocky drop shadow as one plain path: each row's run of tiles
// becomes one rectangle. No filter, so it costs nothing to redraw.
function shadowPath(rows, ox = 0, oy = 0) {
  let d = ''
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      if (!(row[x] in PALETTE)) {
        x++
        continue
      }
      let e = x
      while (e < row.length && row[e] in PALETTE) e++
      const w = (e - x) * T - 1
      d += `M${(ox + x) * T} ${(oy + y) * T}h${w}v${S}h${-w}z`
      x = e
    }
  })
  return d
}
const SHADOW = (d) => `<path d="${d}" fill="#040a1e" fill-opacity="0.6"/>`

// ---------- Pixel maps ----------

const MOON = [
  '...qqqqq...',
  '..qqqqqqq..',
  '.qqqhqqqqq.',
  'qqqhhqqqqqq',
  'qqqqqqqqhqq',
  'qqqqqqqqqqq',
  'qhqqqqqqqqq',
  'qqqqqqhhqqq',
  '.qqqqqhqqq.',
  '..qqqqqqq..',
  '...qqqqq...',
]

const TREE = [
  '......y......',
  '.....yyy.....',
  '......y......',
  '......g......',
  '.....wgd.....',
  '....gggdd....',
  '...wgrggdd...',
  '.....ggd.....',
  '....wgggd....',
  '...gggyggd...',
  '..wggggggdd..',
  '....gggdd....',
  '...wgggrgd...',
  '..gggggggdd..',
  '.wggyggggrdd.',
  'gggggggggggdd',
  '.....ttt.....',
  '.....ttt.....',
]

const HOUSE = [
  '...............ww',
  '...............cc',
  '..........w....cc',
  '.........www...cc',
  '........wwnww..cc',
  '.......wwnnnww.cc',
  '......wwnnnnnwwcc',
  '.....ww' + 'n'.repeat(7) + 'ww',
  '....ww' + 'n'.repeat(9) + 'ww',
  '...ww' + 'n'.repeat(11) + 'ww',
  '..ww' + 'n'.repeat(13) + 'ww',
  '.' + 'w'.repeat(19),
  '..' + 'm'.repeat(17),
  '..' + 'm'.repeat(17),
  '..mmooommmmmmmooomm',
  '..mmoyommrrrmmoyomm',
  '..mmooommrgrmmooomm',
  '..mmmmmmmrrrmmmmmmm',
  '..mmmmmmmrrymmmmmmm',
  '..mmmmmmmrrrmmmmmmm',
  'w'.repeat(21),
]

const SLEIGH = [
  '...........rw......',
  '..........rrr......',
  '.........wwww......',
  '....gg....sss......',
  '...gggg...www.....n',
  '...gggg..rrrrr....n',
  'nyyyyyyyyyyyyyyyy.n',
  'nnrrrrrrrrrrrrrrrnn',
  '.nrrrrrryrrrrrrrrn.',
  '..nnnnnnnnnnnnnnn..',
  '..y....y.....y..y..',
  '.yyyyyyyyyyyyyyyyyy',
]

const DEER = [
  '.....k.k..',
  '......kk..',
  '......bkb.',
  '......bbbk',
  'wbbbbbbbb.',
  '.bbbbbbbb.',
  '.bbbbbbb..',
]
const LEGS_A = ['.b.b..b.b.', 'b..b.b..b.']
const LEGS_B = ['..bb...bb.', '..bb...bb.']

// ---------- Placement, in tiles, on a 160 x 100 tile picture ----------

const GROUND = 94 // row the ground sits on (four rows lower than before; the house and trees move with it)
const HX = 118, HY = GROUND - 20 // house
const MX = 136, MY = 6 // moon
const TREES = [[6, GROUND - 17], [141, GROUND - 17]]
const DEER_X = [21, 32, 43] // reindeer offsets in the team; the last one leads

let teamBody = tiles(SLEIGH, 0, 3, 1)
DEER_X.forEach((dx, i) => {
  teamBody += tiles(DEER, dx, 3, i)
})
teamBody += tiles(['yy'], 19, 8) + tiles(['y'], 31, 8) + tiles(['y'], 42, 8)
const teamShadow = SHADOW(shadowPath(SLEIGH, 1, 5) + DEER_X.map(dx => shadowPath(DEER, dx + 1, 5)).join(''))
const legsA = DEER_X.map((dx, i) => tiles(LEGS_A, dx, 10, i)).join('')
const legsB = DEER_X.map((dx, i) => tiles(LEGS_B, dx, 10, i)).join('')
const nose = `<use href="#z0" x="${(43 + 9) * T}" y="${6 * T}">${blink('1;0.18', 1)}</use>`

// The sleigh's flight: from off the left to off the right, climbing, in
// 20-pixel hops so it moves like a sprite.
// Where the team rests if the app draws the scene without animation: a point
// on its flight path, heading up toward the moon. The animation overrides it.
const REST_X = 760
const REST_TEAM = `${REST_X} ${Math.round(420 - (270 * (REST_X + 1000)) / 3100)}`
const FLY_STEPS = 155
const flyPath = Array.from({ length: FLY_STEPS + 1 }, (_, i) => {
  const t = i / FLY_STEPS
  return `${Math.round(-1000 + 3100 * t)} ${Math.round(420 - 270 * t)}`
}).join(';')

// Lights along both roof slopes and the eave, chasing in four phases.
const BULB_KEYS = ['r', 'y', 'g', 'u', 'p']
const bulbPts = []
for (let r = 3; r <= 10; r++) bulbPts.push([(HX + 12 - r) * T - 2, (HY + r) * T + 5])
for (let c = 1; c <= 19; c++) bulbPts.push([(HX + c) * T + 2, (HY + 11) * T + 7])
for (let r = 10; r >= 3; r--) bulbPts.push([(HX + 8 + r) * T + S - 4, (HY + r) * T + 5])
const BULBS = bulbPts
  .map(
    ([x, y], i) =>
      `<use href="#L${BULB_KEYS[i % 5]}" x="${x}" y="${y}">${blink('1;0.15;0.15;0.15', 1.3, -((i % 4) * 0.325).toFixed(3))}</use>`,
  )
  .join('')

// Snowdrifts: a top row of tiles per column, and a tiled fill beneath it,
// running well past both edges so a wide window never sees the end.
let groundTop = ''
const groundPts = []
// The ground is level under the house and trees (and a little either side),
// so they stand on the snow instead of over a dip.
const FLAT = [[HX - 2, HX + 23], ...TREES.map(([x]) => [x - 2, x + 15])]
for (let c = -80; c < 240; c++) {
  const flat = FLAT.some(([a, b]) => c >= a && c <= b)
  const top = flat ? GROUND : GROUND - Math.round(1.2 + 1.2 * Math.sin(c * 0.31) + 0.8 * Math.sin(c * 0.11 + 1))
  groundTop += `<use href="#w${(((c * 7) % 4) + 4) % 4}" x="${c * T}" y="${top * T}"/>`
  groundPts.push(`${c * T},${(top + 1) * T}`, `${(c + 1) * T},${(top + 1) * T}`)
}
const groundFill = `<polygon points="${groundPts.join(' ')} ${240 * T},1000 ${-80 * T},1000" fill="url(#snowPat)"/>`

// Falling snow: single tiles and five-tile crosses, from far above the picture
// so a tall window is snowing all the way up.
// Seeded random numbers, so the snow looks random but the file never changes.
let seed = 20251224
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// Each flake gets its own spot across the width (one per slice, jittered so
// none bunch up), its own speed, its own start time and its own sideways drift.
const FLAKES = 46
const SNOW_LEFT = -400, SNOW_WIDTH = 2400
let snow = ''
for (let i = 0; i < FLAKES; i++) {
  const col = Math.round((SNOW_LEFT + ((i + rand()) / FLAKES) * SNOW_WIDTH) / T)
  // Two fall speeds, both dividing LOOP_SECONDS evenly (see the note there).
  const dur = rand() < 0.5 ? +(LOOP_SECONDS / 3).toFixed(4) : LOOP_SECONDS / 2
  const begin = -(rand() * dur).toFixed(1)
  const drift = Math.round((rand() - 0.5) * 140)
  const path = `0 -1200;${drift} 1000`
  const flake =
    rand() < 0.14
      ? [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]
          .map(([x, y]) => `<use href="#f${(x + y) % 4}" x="${(col + x) * T}" y="${y * T}"/>`)
          .join('')
      : `<use href="#f${Math.floor(rand() * 4)}" x="${col * T}" y="0"/>`
  // Resting spot, shown only if the app draws the scene without animation:
  // spread evenly down the visible sky (golden-ratio steps), along its drift.
  const restY = Math.round(-40 + 940 * ((i * 0.618034 + 0.3) % 1))
  const restX = Math.round((drift * (restY + 1200)) / 2200)
  snow += `<g transform="translate(${restX} ${restY})">${move(path, dur, begin)}${flake}</g>`
}

// Stars live on the sky layer, which fills the window.
const STARS = [[6, 3], [17, 8], [28, 2], [39, 6], [52, 3], [61, 9], [70, 4], [82, 7], [12, 14], [47, 13], [99, 17], [33, 18], [75, 15], [103, 5], [90, 24], [20, 26]]
  .map(
    ([c, r], i) =>
      `<rect x="${c * 15 + 4}" y="${r * 15 + 4}" width="4" height="4" fill="#fff6d0">${blink('1;0.18', 2.6, -((i % 5) * 0.6).toFixed(1))}</rect>`,
  )
  .join('')

const mx = (MX + 5.5) * T
const my = (MY + 5.5) * T
const winY = (HY + 15) * T + 4.5

export const SCENE = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060d22"/><stop offset="0.55" stop-color="#0d1d47"/><stop offset="1" stop-color="#1c3a78"/></linearGradient>
<pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="1.5" height="1.5" fill="#a9c2ff"/></pattern>
<radialGradient id="mglow"><stop offset="0" stop-color="#fff2c4" stop-opacity="0.45"/><stop offset="1" stop-color="#fff2c4" stop-opacity="0"/></radialGradient>
<radialGradient id="wglow"><stop offset="0" stop-color="#ffb84a" stop-opacity="0.9"/><stop offset="1" stop-color="#ffb84a" stop-opacity="0"/></radialGradient>
<style>
text{font:700 6px monospace;text-anchor:middle}
</style>
${SYMBOLS}${BULB_SYMBOLS}
<pattern id="snowPat" width="20" height="20" patternUnits="userSpaceOnUse"><use href="#l0"/><use href="#w1" x="10"/><use href="#w2" y="10"/><use href="#l3" x="10" y="10"/></pattern>
<g id="moon">${tiles(MOON)}</g>
<g id="tree">${tiles(TREE)}</g>
<g id="house">${tiles(HOUSE)}</g>
<g id="team">${teamBody}</g>
</defs>
<svg width="100%" height="100%" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
<rect width="1600" height="1000" fill="url(#sky)"/>
${STARS}
</svg>
<svg width="100%" height="100%" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid meet">
<g opacity="0.2" transform="translate(201 237.5)">${REXT_LOGO}</g>
</svg>
<svg width="100%" height="100%" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMax meet" overflow="visible">
<rect x="-2000" y="-2000" width="5600" height="3000" fill="url(#grid)" opacity="0.12"/>
<circle cx="${mx}" cy="${my}" r="170" fill="url(#mglow)"/>
${SHADOW(shadowPath(MOON, MX + 1, MY + 2))}
<use href="#moon" x="${MX * T}" y="${MY * T}"/>
${groundFill}
${groundTop}
${SHADOW(TREES.map(([x, y]) => shadowPath(TREE.slice(0, -1), x + 2, y)).join('') + shadowPath(HOUSE.slice(0, -1), HX + 2, HY))}
${TREES.map(([x, y]) => `<use href="#tree" x="${x * T}" y="${y * T}"/>`).join('')}
<use href="#house" x="${HX * T}" y="${HY * T}"/>
${TREES.map(([x]) => tiles(['w'.repeat(17)], x - 2, GROUND, 3)).join('')}
${tiles(['w'.repeat(25)], HX - 2, GROUND, 5)}
<circle cx="${(HX + 5) * T + 4.5}" cy="${winY}" r="38" fill="url(#wglow)" opacity="0.35">${fade('0.35;0.6;0.35', 3.25)}</circle>
<circle cx="${(HX + 15) * T + 4.5}" cy="${winY}" r="38" fill="url(#wglow)" opacity="0.35">${fade('0.35;0.6;0.35', 3.25, -1.625)}</circle>
${BULBS}
<g class="sleigh" transform="translate(${REST_TEAM})">${move(flyPath, 26, -2, true)}<g>${move('0 0;0 -6', 1, 0, true)}
${teamShadow}
<use href="#team"/>
<g>${blink('1;0', 0.5)}${legsA}</g><g opacity="0">${blink('0;1', 0.5)}${legsB}</g>
${nose}
</g></g>
<g class="snow">${snow}</g>
</svg>
</svg>`
