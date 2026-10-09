import { paletteById, patternColours } from '../data/palettes'
import { renderRecipe } from '../pattern/generate'
import { recipeFor, type Recipe } from '../pattern/recipe'

/**
 * Dev only: renders forced styles side by side as one image, for reviewing a
 * new alphabet in the browser console. Not used by the app.
 */
export type SheetSpec = [lines: string[], width: number, palette: string, recipe: Partial<Recipe>]

export async function contactSheet(specs: SheetSpec[], cell = 6, cols = 3) {
  const base = recipeFor('sheet', 0, undefined, { motif: 'none', letterCase: 'upper' })
  const rendered = []
  for (const [lines, width, palette, recipe] of specs) {
    const full: Recipe = {
      ...base,
      effect: 'none',
      icon: null,
      letterGap: 1,
      lineGap: 2,
      capitalsFrom: null,
      ...recipe,
    }
    rendered.push({ lines, width, palette, recipe: full, result: await renderRecipe(lines, width, full, 'sheet') })
  }
  const tileW = Math.max(...rendered.map((r) => r.result.pattern.width)) * cell + 30
  const tileH = Math.max(...rendered.map((r) => r.result.pattern.height)) * cell + 34
  const canvas = document.createElement('canvas')
  canvas.width = cols * tileW
  canvas.height = Math.ceil(rendered.length / cols) * tileH
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fbf3ec'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const info: string[] = []
  rendered.forEach(({ lines, width, palette, recipe, result }, i) => {
    const p = result.pattern
    const c = patternColours(paletteById(palette))
    const ox = (i % cols) * tileW + 10
    const oy = Math.floor(i / cols) * tileH + 24
    ctx.fillStyle = '#333'
    ctx.font = '13px sans-serif'
    ctx.fillText(`${recipe.alphabet ?? recipe.font} · ${lines.join(' ')} @${width}${result.check.ok ? '' : ' ✗'}`, ox, oy - 8)
    ctx.strokeStyle = 'rgba(0,0,0,0.07)'
    for (let y = 0; y < p.height; y++) {
      for (let x = 0; x < p.width; x++) {
        ctx.strokeRect(ox + x * cell + 0.5, oy + y * cell + 0.5, cell, cell)
        const v = p.cells[y * p.width + x]
        if (!v) continue
        ctx.fillStyle = v === 1 ? c.lettering.hex : c.accent.hex
        ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell)
      }
    }
    info.push(
      `${recipe.alphabet ?? recipe.font} ${lines.join(' ')}: ${p.width}×${p.height} ${result.check.ok ? 'ok' : result.check.reasons.join('; ')}`,
    )
  })
  document.getElementById('contact')?.remove()
  const img = document.createElement('img')
  img.src = canvas.toDataURL()
  img.id = 'contact'
  img.style.cssText = 'position:fixed;left:0;top:0;z-index:99;width:100vw;background:#fbf3ec'
  document.body.append(img)
  return info.join('\n')
}
