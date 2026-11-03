import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)

const FONT_CSS_FILES = ['400.css', '400-italic.css', '600.css', '600-italic.css', '700.css', '700-italic.css']
const SUBSETS = /-latin(-ext)?-\d+-(normal|italic)\.woff2/

export function stripRemoteFontFaces(css: string): string {
  return css.replace(/@font-face\s*\{[^}]*cdn\.nav\.no[^}]*\}/g, '')
}

export function localFontFaces(): string {
  const pkgDir = dirname(require.resolve('@fontsource/source-sans-3/package.json'))
  const faces: string[] = []
  for (const cssFile of FONT_CSS_FILES) {
    const css = readFileSync(join(pkgDir, cssFile), 'utf-8')
    for (const block of css.match(/@font-face\s*\{[^}]*\}/g) ?? []) {
      const woff2 = block.match(/url\(\.\/(files\/[^)]+\.woff2)\)/)?.[1]
      if (!woff2 || !SUBSETS.test(woff2)) continue
      const data = readFileSync(join(pkgDir, woff2)).toString('base64')
      faces.push(block.replace(/src:[^;]+;/, `src: url(data:font/woff2;base64,${data}) format('woff2');`))
    }
  }
  return faces.join('\n')
}
