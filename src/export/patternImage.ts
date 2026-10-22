import { chartSize, drawSymbol, paintChart, type ChartColours } from '../components/chartPaint'
import type { Legend } from '../pattern/legend'
import { finishedSize } from '../pattern/size'
import type { Pattern } from '../pattern/types'

/** Everything the downloaded image shows. Kept separate from the screen, so a PDF can follow the same shape. */
export interface PatternSheet {
  pattern: Pattern
  legend: Legend
  colours: ChartColours
  fabricCount: number
  /** The style in words, as in the caption. */
  description: string
}

// The light sheet's colours (see --sheet tokens in index.css).
const PAPER = '#fbf3ec'
const INK = '#5f051c'
const MUTED = '#76615c'
const RULE = 'rgb(95 5 28 / 0.18)'

const HEADING = "'Fraunces', Georgia, serif"
const UI = "'IBM Plex Sans', system-ui, sans-serif"
const MONO = "'IBM Plex Mono', ui-monospace, monospace"

/** Image pixels per layout pixel: sharp when printed or zoomed. */
const SCALE = 2
const PAD = 56
const CELL = 14
const GUTTER = 28
const MIN_CONTENT = 640
const ROW = 40
const SWATCH = 24

async function loadFonts() {
  await Promise.all([
    document.fonts.load(`600 40px ${HEADING}`),
    document.fonts.load(`400 16px ${UI}`),
    document.fonts.load(`500 14px ${MONO}`),
    document.fonts.load(`600 14px ${MONO}`),
  ])
}

/** Draws the chart, thread key and finished size on one light sheet. */
export async function renderPatternSheet(sheet: PatternSheet): Promise<HTMLCanvasElement> {
  await loadFonts()
  const { pattern, legend, colours, fabricCount } = sheet
  const chart = chartSize(pattern, { cell: CELL, gutter: GUTTER })
  const content = Math.max(MIN_CONTENT, chart.width)
  const keyRows = legend.rows.length + 1
  const height = PAD + 44 + 30 + 36 + chart.height + 48 + 24 + keyRows * ROW + 24 + 28 + 48 + 64 + PAD

  const canvas = document.createElement('canvas')
  canvas.width = (content + PAD * 2) * SCALE
  canvas.height = height * SCALE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')
  ctx.scale(SCALE, SCALE)
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, content + PAD * 2, height)
  ctx.textBaseline = 'alphabetic'

  const left = PAD
  const right = PAD + content
  let y = PAD

  // The phrase as stitched, shrunk if a long one would run off the sheet.
  const title = pattern.meta.lines.join(' ')
  let titleSize = 40
  ctx.font = `600 ${titleSize}px ${HEADING}`
  while (ctx.measureText(title).width > content && titleSize > 20) {
    titleSize -= 2
    ctx.font = `600 ${titleSize}px ${HEADING}`
  }
  ctx.fillStyle = INK
  y += 40
  ctx.fillText(title, left, y)

  y += 30
  ctx.font = `400 16px ${UI}`
  ctx.fillStyle = MUTED
  ctx.fillText(`${sheet.description} · ${pattern.width} × ${pattern.height} stitches`, left, y)

  // The chart, centred when the sheet is wider than it.
  y += 36
  const chartLeft = left + Math.round((content - chart.width) / 2)
  ctx.save()
  ctx.translate(chartLeft, y)
  paintChart(ctx, pattern, { cell: CELL, gutter: GUTTER, colours, dpr: SCALE, numberColour: MUTED, monoFont: MONO })
  ctx.restore()
  y += chart.height + 48

  eyebrow(ctx, 'Thread key', left, y)
  eyebrow(ctx, 'Stitches', right, y, 'right')
  y += 24

  const keyRow = (swatch: (x: number, top: number) => void, code: string, name: string, use: string, count: string) => {
    const top = y + (ROW - SWATCH) / 2
    swatch(left, top)
    const mid = y + ROW / 2 + 5
    ctx.textAlign = 'left'
    ctx.fillStyle = INK
    ctx.font = `600 14px ${MONO}`
    const codeWidth = code ? ctx.measureText(code).width + 10 : 0
    if (code) ctx.fillText(code, left + SWATCH + 14, mid)
    ctx.font = `400 15px ${UI}`
    ctx.fillText(name, left + SWATCH + 14 + codeWidth, mid)
    ctx.fillStyle = MUTED
    ctx.fillText(use, left + content * 0.55, mid)
    ctx.textAlign = 'right'
    ctx.fillStyle = INK
    ctx.font = `500 14px ${MONO}`
    ctx.fillText(count, right, mid)
    ctx.textAlign = 'left'
    rule(ctx, left, right, y + ROW)
    y += ROW
  }

  rule(ctx, left, right, y)
  for (const row of legend.rows) {
    keyRow(
      (x, top) => {
        ctx.fillStyle = row.thread.hex
        ctx.fillRect(x, top, SWATCH, SWATCH)
        drawSymbol(ctx, row.index, x, top, SWATCH, row.thread.hex)
      },
      row.thread.code,
      row.thread.name,
      row.use,
      row.stitches.toLocaleString('en-GB'),
    )
  }
  keyRow(
    (x, top) => {
      ctx.fillStyle = legend.fabric.hex
      ctx.fillRect(x, top, SWATCH, SWATCH)
      ctx.strokeStyle = RULE
      ctx.lineWidth = 1
      ctx.strokeRect(x + 0.5, top + 0.5, SWATCH - 1, SWATCH - 1)
    },
    '',
    `${legend.fabric.name} fabric`,
    'Background',
    '–',
  )

  y += 24
  ctx.font = `500 14px ${MONO}`
  ctx.fillStyle = INK
  ctx.fillText(`Total ${legend.total.toLocaleString('en-GB')} stitches`, left, y)
  const size = finishedSize(pattern.width, pattern.height, fabricCount)
  y += 28
  ctx.font = `400 15px ${UI}`
  ctx.fillText(
    `Finished design: ${size.cm.width.toFixed(1)} × ${size.cm.height.toFixed(1)} cm ` +
      `(${size.inches.width.toFixed(1)} × ${size.inches.height.toFixed(1)} in) on ${fabricCount}-count Aida`,
    left,
    y,
  )

  y += 48
  rule(ctx, left, right, y)
  y += 32
  ctx.font = `600 18px ${HEADING}`
  ctx.fillStyle = INK
  ctx.fillText('Say It With Stitches', left, y)
  ctx.font = `400 12px ${UI}`
  ctx.fillStyle = MUTED
  ctx.fillText('Screen colors are approximate. Check against your physical thread card.', left, y + 22)
  ctx.fillText('Color data: craft-color-codes by MakeBead, CC BY 4.0.', left, y + 40)

  return canvas
}

function eyebrow(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, align: CanvasTextAlign = 'left') {
  ctx.font = `500 11px ${MONO}`
  ctx.fillStyle = MUTED
  ctx.textAlign = align
  ctx.letterSpacing = '1.5px'
  ctx.fillText(text.toUpperCase(), x, y)
  ctx.letterSpacing = '0px'
  ctx.textAlign = 'left'
}

function rule(ctx: CanvasRenderingContext2D, from: number, to: number, y: number) {
  ctx.strokeStyle = RULE
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(from, y + 0.5)
  ctx.lineTo(to, y + 0.5)
  ctx.stroke()
}

/** say-it-with-stitches-hello-sunshine.png */
export function sheetFileName(pattern: Pattern): string {
  const slug = pattern.meta.text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `say-it-with-stitches${slug ? `-${slug}` : ''}.png`
}

/** Renders the sheet and hands it to the browser as a PNG download. */
export async function downloadPatternSheet(sheet: PatternSheet): Promise<void> {
  const canvas = await renderPatternSheet(sheet)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Could not make the image')
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = sheetFileName(sheet.pattern)
  document.body.append(link)
  link.click()
  link.remove()
  // Give the browser a moment to start the download before letting go of the file.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
