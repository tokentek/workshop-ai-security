// security-advisor art: the "YOU'VE BEEN PWNED!" screen as animated pixel art (SVG) and as ASCII frames.
//
// Same rules as the mods-marketplace art: dependency-free, every SVG string a complete document, pixel art as
// `<rect>` runs on an integer grid with crisp edges, animation in SMIL only (no scripts, no event attributes,
// no external references). Desktop and VS Code draw the SVG through `Svg`; the terminal draws the ASCII frames.
// The look is loud on purpose: hazard tape, a grinning skull with glowing eyes, rainbow glitch letters.

type Pal = Readonly<Record<string, string>>

const XMLNS = 'xmlns="http://www.w3.org/2000/svg"'
const CRISP = 'shape-rendering="crispEdges"'

export const RAINBOW = ['#ff2d55', '#ff9500', '#ffd60a', '#30d158', '#64d2ff', '#5e5ce6', '#bf5af2']

/** Pixel map → rects grouped in a `<g fill>` per colour, one rect per horizontal run. '.' is transparent. */
function pixels(rows: readonly string[], pal: Pal, ox = 0, oy = 0, scale = 1): string {
  const out: Record<string, string[]> = {}
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row.charAt(x)
      let end = x + 1
      while (end < row.length && row.charAt(end) === ch) end++
      const color = pal[ch]
      if (color !== undefined) {
        ;(out[color] ??= []).push(
          `<rect x="${ox + x * scale}" y="${oy + y * scale}" width="${(end - x) * scale}" height="${scale}"/>`,
        )
      }
      x = end
    }
  })
  return Object.entries(out)
    .map(([color, rects]) => `<g fill="${color}">${rects.join('')}</g>`)
    .join('')
}

/** Two drawings shown alternately (a hard 2-frame swap, like a sprite sheet). */
function flicker(a: string, b: string, dur: string): string {
  const swap = (values: string) =>
    `<animate attributeName="opacity" values="${values}" keyTimes="0;0.5" calcMode="discrete" dur="${dur}" repeatCount="indefinite"/>`
  return `<g>${a}${swap('1;0')}</g><g>${b}${swap('0;1')}</g>`
}

// ---------------------------------------------------------------------------------------------------------------
// A 5×7 pixel font, only the letters the screen needs.

const GLYPHS: Record<string, readonly string[]> = {
  Y: ['X...X', 'X...X', '.X.X.', '..X..', '..X..', '..X..', '..X..'],
  O: ['.XXX.', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.'],
  U: ['X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.'],
  "'": ['X', 'X', '.', '.', '.', '.', '.'],
  V: ['X...X', 'X...X', 'X...X', 'X...X', '.X.X.', '.X.X.', '..X..'],
  E: ['XXXXX', 'X....', 'X....', 'XXXX.', 'X....', 'X....', 'XXXXX'],
  B: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X...X', 'X...X', 'XXXX.'],
  N: ['X...X', 'XX..X', 'X.X.X', 'X..XX', 'X...X', 'X...X', 'X...X'],
  P: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X....', 'X....', 'X....'],
  W: ['X...X', 'X...X', 'X...X', 'X.X.X', 'X.X.X', 'XX.XX', 'X...X'],
  D: ['XXXX.', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'XXXX.'],
  '!': ['X', 'X', 'X', 'X', 'X', '.', 'X'],
  ' ': ['..', '..', '..', '..', '..', '..', '..'],
}

const glyphWidth = (ch: string): number => (GLYPHS[ch]?.[0]?.length ?? 0) + 1

export const textWidth = (text: string, scale: number): number =>
  ([...text].reduce((w, ch) => w + glyphWidth(ch), 0) - 1) * scale

/** Each letter its own group whose fill runs through the rainbow, a step behind the letter before: a wave. */
function rainbowText(text: string, ox: number, oy: number, scale: number, dur = 1.4): string {
  let x = ox
  return [...text]
    .map((ch, i) => {
      const rows = GLYPHS[ch]
      if (rows === undefined) return ''
      const drawn = pixels(rows, { X: 'currentColor' }, x, oy, scale)
      x += glyphWidth(ch) * scale
      if (ch === ' ') return ''
      const values = [...RAINBOW, RAINBOW[0]].join(';')
      return `<g color="${RAINBOW[0]}"><animate attributeName="color" values="${values}" dur="${dur}s" begin="-${(i * 0.12).toFixed(2)}s" repeatCount="indefinite"/>${drawn}</g>`
    })
    .join('')
}

/** One flat colour, for the glitch shadows behind the rainbow letters. */
function solidText(text: string, ox: number, oy: number, scale: number, color: string): string {
  let x = ox
  return [...text]
    .map(ch => {
      const rows = GLYPHS[ch]
      if (rows === undefined) return ''
      const drawn = pixels(rows, { X: color }, x, oy, scale)
      x += glyphWidth(ch) * scale
      return drawn
    })
    .join('')
}

// ---------------------------------------------------------------------------------------------------------------
// The skull — 16×16. W bone, S bone shadow, K holes, R glowing eyes. Frame B drops the jaw: it cackles.

const SKULL_TOP = [
  '....WWWWWWWW....',
  '..WWWWWWWWWWWW..',
  '.WWWWWWWWWWWWWS.',
  'WWWWWWWWWWWWWWWS',
  'WWWKKKWWWWKKKWWS',
  'WWKKKKKWWKKKKKWS',
  'WWKKRKKWWKKRKKWS',
  'WWWKKKWWWWKKKWWS',
  '.WWWWWWKKWWWWWS.',
  '..WWWWKKKKWWWS..',
]

const JAW = ['...WWWWWWWWWS...', '...WKWKWKWKWS...', '...WWWWWWWWWS...', '....WKWKWKWS....', '.....WWWWWS.....']

const SKULL_CLOSED = [...SKULL_TOP, ...JAW, '................']
const SKULL_OPEN = [...SKULL_TOP, '...KKKKKKKKKK...', ...JAW]

const SKULL_PAL: Pal = { W: '#f5f0e6', S: '#b8b0a0', K: '#140a0a' }

function skull(ox: number, oy: number, scale: number): string {
  // The eyes glow red to yellow on their own, over whichever jaw frame shows.
  const eyes = `<g fill="#ff2d2d"><animate attributeName="fill" values="#ff2d2d;#ffd60a;#ff2d2d" dur="0.8s" repeatCount="indefinite"/>${[4, 11]
    .map(x => `<rect x="${ox + x * scale}" y="${oy + 6 * scale}" width="${scale}" height="${scale}"/>`)
    .join('')}</g>`
  const bob = `<animateTransform attributeName="transform" type="translate" values="0 0;0 -${scale};0 0" dur="0.6s" calcMode="discrete" repeatCount="indefinite"/>`
  return `<g>${bob}${flicker(pixels(SKULL_CLOSED, SKULL_PAL, ox, oy, scale), pixels(SKULL_OPEN, SKULL_PAL, ox, oy, scale), '0.6s')}${eyes}</g>`
}

// ---------------------------------------------------------------------------------------------------------------
// Hazard tape: yellow and black diagonal stripes that crawl sideways.

function hazardTape(y: number, width: number, height: number, reverse = false): string {
  const period = 8
  const rects: string[] = []
  for (let row = 0; row < height; row++) {
    for (let x = -period; x < width + period; x += period) {
      rects.push(`<rect x="${x + row}" y="${y + row}" width="${period / 2}" height="1"/>`)
    }
  }
  const to = reverse ? period : -period
  return (
    `<rect x="0" y="${y}" width="${width}" height="${height}" fill="#ffd60a"/>` +
    `<g fill="#111"><animateTransform attributeName="transform" type="translate" values="0 0;${to} 0" dur="0.5s" repeatCount="indefinite"/>${rects.join('')}</g>`
  )
}

/** A warning triangle with a "!", 11 px wide, blinking. */
function warning(ox: number, oy: number, scale: number): string {
  const tri = [
    '.....R.....',
    '....RYR....',
    '....RYR....',
    '...RYKYR...',
    '...RYKYR...',
    '..RYYKYYR..',
    '..RYYKYYR..',
    '.RYYYYYYYR.',
    '.RYYYKYYYR.',
    'RYYYYYYYYYR',
    'RRRRRRRRRRR',
  ]
  return `<g>${pixels(tri, { R: '#ff2d2d', Y: '#ffd60a', K: '#111' }, ox, oy, scale)}<animate attributeName="opacity" values="1;0.15;1" dur="0.7s" calcMode="discrete" repeatCount="indefinite"/></g>`
}

// ---------------------------------------------------------------------------------------------------------------
// The whole screen.

const W = 240
const H = 100

export function pwnedSvg(): string {
  const top = "YOU'VE BEEN"
  const big = 'PWNED!'
  const topScale = 2
  const bigScale = 3
  const topX = Math.round((W - textWidth(top, topScale)) / 2)
  const bigX = Math.round((W - textWidth(big, bigScale)) / 2)
  const topY = 16
  const bigY = 38

  // Glitch: a red and a cyan copy of PWNED jump off the letters now and then.
  const jitter = (dx: string) =>
    `<animateTransform attributeName="transform" type="translate" values="${dx}" dur="1.1s" calcMode="discrete" repeatCount="indefinite"/>`
  const glitch =
    `<g opacity="0.85">${jitter('0 0;-3 0;0 0;0 0;2 1;0 0')}${solidText(big, bigX, bigY, bigScale, '#ff0040')}</g>` +
    `<g opacity="0.85">${jitter('0 0;3 0;0 0;0 0;-2 -1;0 0')}${solidText(big, bigX, bigY, bigScale, '#00e5ff')}</g>`

  // The background pulses dark red, like an alarm light.
  const bg = `<rect width="${W}" height="${H}" fill="#0a0000"><animate attributeName="fill" values="#0a0000;#3a0000;#0a0000" dur="1s" repeatCount="indefinite"/></rect>`

  return (
    `<svg ${XMLNS} viewBox="0 0 ${W} ${H}" width="${W * 4}" height="${H * 4}" ${CRISP}>` +
    bg +
    hazardTape(0, W, 7) +
    hazardTape(H - 7, W, 7, true) +
    skull(8, 20, 3) +
    skull(W - 8 - 48, 20, 3) +
    rainbowText(top, topX, topY, topScale) +
    glitch +
    rainbowText(big, bigX, bigY, bigScale, 1) +
    warning(60, 66, 2) +
    warning(W / 2 - 11, 66, 2) +
    warning(W - 82, 66, 2) +
    `</svg>`
  )
}

// ---------------------------------------------------------------------------------------------------------------
// The terminal frames.

export const SKULL_ASCII: readonly (readonly string[])[] = [
  ['   _____   ', '  /     \\  ', ' | () () | ', '  \\  ^  /  ', '   |||||   ', '   |||||   '],
  ['   _____   ', '  /     \\  ', ' | @   @ | ', '  \\  ^  /  ', '   |||||   ', "   '''''   "],
]

export const BANNER = [
  '██████╗ ██╗    ██╗███╗   ██╗███████╗██████╗ ██╗',
  '██╔══██╗██║    ██║████╗  ██║██╔════╝██╔══██╗██║',
  '██████╔╝██║ █╗ ██║██╔██╗ ██║█████╗  ██║  ██║██║',
  '██╔═══╝ ██║███╗██║██║╚██╗██║██╔══╝  ██║  ██║╚═╝',
  '██║     ╚███╔███╔╝██║ ╚████║███████╗██████╔╝██╗',
  '╚═╝      ╚══╝╚══╝ ╚═╝  ╚═══╝╚══════╝╚═════╝ ╚═╝',
]

export const BANNER_W = BANNER[0]!.length

/** A strip of hazard tape `width` cells wide, shifted by the frame so it crawls. */
export function tapeAscii(width: number, frame: number): string {
  const unit = '▚▚▚▚    '
  const shift = frame % unit.length
  return unit.repeat(Math.ceil(width / unit.length) + 1).slice(shift, shift + width)
}
