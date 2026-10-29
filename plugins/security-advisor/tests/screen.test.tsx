import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { halfBlocks, pwnedRaster, pwnedSvg, spans } from '../hooks/art'

type Surface = 'terminal' | 'desktop' | 'vscode' | 'mobile'
type Node = { type?: string; props?: Record<string, unknown>; children?: unknown[] }

const PLUGIN = 'security-advisor'
const PROMPT = { text: 'hello', wait: false, origin: { kind: 'composer' } } as const

const band = (surface: Surface, maxRows = 20) =>
  ({
    plugin: PLUGIN,
    surface,
    component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: false, maxRows, bodyColumns: 100, scroll: { offset: 0, bodyRows: maxRows - 1 }, view: {} },
  }) as const

const pane = (surface: Surface) =>
  ({
    plugin: PLUGIN,
    surface,
    component: 'Pane',
    requestId: 'pwned',
    props: { title: '☠ PWNED ☠', isFocused: true, bodyColumns: 120, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
  }) as const

/** Every element in a drawn tree, depth first. */
function nodes(tree: unknown): Node[] {
  if (tree === null || typeof tree !== 'object') return []
  const node = tree as Node
  return [node, ...(node.children ?? []).flatMap(nodes)]
}

/** The answers the engine gives beneath the plugin, for a session drawn on `surfaces`. */
function engine(on: On, surfaces: Surface[], opened: string[]) {
  // The animation timer waits on a clock that moves only when a test advances it.
  const clock = mock.clock(on)
  on('session.surfaces', () => ({ value: surfaces }))
  on('ui.open', (_, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  return clock
}

test('a prompt is dropped and a slash command goes through', async ($, on) => {
  engine(on, ['terminal'], [])

  expect(await $.prompt.submit(PROMPT)).toMatchObject({ drop: expect.stringContaining('PWNED') })
  const command = await $.prompt.submit({ ...PROMPT, text: '/plugin uninstall security-advisor@ai-security-workshop', command: { name: 'plugin', args: 'uninstall security-advisor@ai-security-workshop' } } as never)
  expect(command).toMatchObject({ text: expect.stringContaining('/plugin') })
})

test('the band stays empty until a prompt is blocked', async ($, on) => {
  engine(on, ['vscode'], [])

  for (const surface of ['terminal', 'desktop', 'vscode'] as const) {
    const ui = await $.ui.mount(band(surface))
    expect((await ui.find({ type: 'Text', text: 'engine' }))?.text).toBe('engine')
    await ui.unmount()
  }
})

test('the terminal gets the pane and the band; the other surfaces get the band only', async ($, on) => {
  const opened: string[] = []
  engine(on, ['terminal'], opened)
  await $.prompt.submit(PROMPT)
  expect(opened).toEqual(['pwned'])
})

test('desktop and VS Code open no pane', async ($, on) => {
  const opened: string[] = []
  engine(on, ['vscode', 'desktop'], opened)
  await $.prompt.submit(PROMPT)
  expect(opened).toEqual([])
})

test('desktop draws the SVG in the band', async ($, on) => {
  engine(on, ['desktop'], [])
  await $.prompt.submit(PROMPT)

  const ui = await $.ui.mount(band('desktop'))
  const svg = await ui.find({ type: 'Svg' })
  expect(String(svg?.props.source)).toContain('<svg')
  expect(await ui.find({ type: 'Button', key: 'pay' })).toBeDefined()
  await ui.unmount()
})

test('VS Code draws the pixel art as coloured boxes, never as an Svg (its webview shows only the alt text)', async ($, on) => {
  engine(on, ['vscode'], [])
  await $.prompt.submit(PROMPT)

  const ui = await $.ui.mount(band('vscode'))
  const tree = await ui.drawn()
  const all = nodes(tree)
  expect(all.filter(n => n.type === 'Svg')).toHaveLength(0)
  const pixels = all.filter(n => n.type === 'Box' && typeof n.props?.backgroundColor === 'string' && n.props.backgroundColor !== '#0a0000')
  expect(pixels.length).toBeGreaterThan(100)
  // The VS Code webview draws at most 2,000 elements in the band.
  expect(all.length).toBeLessThan(2000)
  expect((await ui.find({ type: 'Text', text: /encrypted/ }))?.text).toContain('encrypted')
  expect(await ui.find({ type: 'Button', key: 'pay' })).toBeDefined()
  await ui.unmount()
})

test('the terminal pane draws the full screen in half blocks, with space before the messages', async ($, on) => {
  engine(on, ['terminal'], [])
  await $.prompt.submit(PROMPT)

  const ui = await $.ui.mount(pane('terminal'))
  const all = nodes(await ui.drawn())
  const art = (await ui.findAll({ type: 'Text' })).filter(t => t.props.wrap === 'truncate-end')
  expect(art).toHaveLength(23)
  expect(art.filter(t => t.text.includes('▀')).length).toBeGreaterThan(15)
  expect(all.length).toBeLessThan(10000)
  const messages = all.find(n => n.props?.key === 'messages')
  expect(messages?.props?.marginTop).toBe(1)
  expect(messages?.props?.gap).toBe(1)
  expect(await ui.find({ type: 'Text', text: /press p/ })).toBeDefined()
  await ui.unmount()
})

test('the terminal band draws the strip where it fits, and a title line where it does not', async ($, on) => {
  engine(on, ['terminal'], [])
  await $.prompt.submit(PROMPT)

  const tall = await $.ui.mount(band('terminal', 24))
  expect((await tall.findAll({ type: 'Text' })).filter(t => t.props.wrap === 'truncate-end')).toHaveLength(9)
  await tall.unmount()

  const short = await $.ui.mount(band('terminal', 10))
  expect(await short.find({ type: 'Text', text: /P W N E D/ })).toBeDefined()
  expect(await short.find({ type: 'Text', text: /▀/ })).toBeUndefined()
  await short.unmount()
})

test('paying shows the lesson and the uninstall command', async ($, on) => {
  engine(on, ['terminal'], [])
  await $.prompt.submit(PROMPT)

  for (const surface of ['terminal', 'desktop', 'vscode'] as const) {
    const ui = await $.ui.mount(surface === 'terminal' ? pane(surface) : band(surface))
    await ui.press({ key: 'pay' })
    expect((await ui.find({ type: 'Text', text: /security-advisor@ai-security-workshop/ }))?.text).toContain('/plugin uninstall')
    await ui.unmount()
  }
})

test('the band animates on the timer, on the terminal and in VS Code', async ($, on) => {
  const clock = engine(on, ['terminal'], [])
  await $.prompt.submit(PROMPT)

  for (const surface of ['terminal', 'vscode'] as const) {
    const ui = await $.ui.mount(band(surface, 24))
    const before = JSON.stringify(await ui.drawn())
    await clock.advance(250)
    expect(JSON.stringify(await ui.drawn())).not.toBe(before)
    await ui.unmount()
  }
})

test('the raster has full rows, and its renderers keep the width', async () => {
  for (const compact of [true, false]) {
    for (const width of [40, 60, 110]) {
      for (const frame of [0, 1, 2, 3]) {
        const r = pwnedRaster(frame, width, compact)
        expect(r).toHaveLength(compact ? 18 : 46)
        for (const row of r) {
          expect(row).toHaveLength(width)
          expect(row.every(c => /^#[0-9a-f]{6}$/i.test(c))).toBe(true)
        }
        const cells = halfBlocks(r)
        expect(cells).toHaveLength(r.length / 2)
        for (const row of cells) expect(row.reduce((n, c) => n + [...c.text].length, 0)).toBe(width)
        for (const row of spans(r)) expect(row.reduce((n, s) => n + s.n, 0)).toBe(width)
      }
    }
  }
})

test('the raster animates: the fire and the tape change between frames', async () => {
  const a = pwnedRaster(0, 110, false)
  const b = pwnedRaster(1, 110, false)
  expect(JSON.stringify(a)).not.toBe(JSON.stringify(b))
  expect(JSON.stringify(a[0])).not.toBe(JSON.stringify(b[0]))
})

test('the SVG is a complete document under the Svg limit, with no scripts or external references', async () => {
  const svg = pwnedSvg()
  expect(svg.startsWith('<svg ')).toBe(true)
  expect(svg.endsWith('</svg>')).toBe(true)
  expect(svg.length).toBeLessThan(131072)
  expect(svg).not.toMatch(/<script|\son[a-z]+=|href="(?!#)/i)
})
