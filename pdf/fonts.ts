import { existsSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const AKSEL_FONT_PREFIX = 'https://cdn.nav.no/aksel/fonts/'
export const AKSEL_FONT_URL_PATTERN = `${AKSEL_FONT_PREFIX}**`

const fontsDir = fileURLToPath(new URL('./fonts/', import.meta.url))

export function resolveAkselFont(url: string, dir: string = fontsDir): string | null {
  if (!url.startsWith(AKSEL_FONT_PREFIX)) return null
  const name = basename(new URL(url).pathname)
  if (!/^[\w-]+\.woff2$/.test(name)) return null
  const path = join(dir, name)
  return existsSync(path) ? path : null
}
