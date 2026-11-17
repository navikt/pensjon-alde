import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { resolveAkselFont } from './fonts.ts'

const require = createRequire(import.meta.url)
const dsCss = readFileSync(require.resolve('@navikt/ds-css'), 'utf-8')
const akselFontUrls = [...new Set(dsCss.match(/https:\/\/cdn\.nav\.no\/aksel\/fonts\/[^"')]+/g) ?? [])]
const fontsDir = fileURLToPath(new URL('./fonts/', import.meta.url))

describe('resolveAkselFont', () => {
  it('finner Aksel-fontene i ds-css', () => {
    expect(akselFontUrls.length).toBeGreaterThan(0)
  })

  it.each(akselFontUrls)('har lokal fil for %s', url => {
    const path = resolveAkselFont(url)
    expect(path).not.toBeNull()
    expect(
      readFileSync(path as string)
        .subarray(0, 4)
        .toString('latin1'),
    ).toBe('wOF2')
  })

  it('har ingen lokale fonter som ds-css ikke bruker', () => {
    const used = akselFontUrls.map(url => url.split('/').pop())
    expect(readdirSync(fontsDir).sort()).toEqual(used.sort())
  })

  it('returnerer null for URL-er utenfor Aksel-fontene', () => {
    expect(resolveAkselFont('https://cdn.nav.no/annet/SourceSans3-normal.woff2')).toBeNull()
    expect(resolveAkselFont('https://example.com/aksel/fonts/SourceSans3-normal.woff2')).toBeNull()
  })

  it('returnerer null for ukjente filer', () => {
    expect(resolveAkselFont('https://cdn.nav.no/aksel/fonts/Finnes-ikke.woff2')).toBeNull()
  })

  it('godtar ikke stier utenfor fontmappen', () => {
    expect(resolveAkselFont('https://cdn.nav.no/aksel/fonts/..%2F..%2Fpackage.json')).toBeNull()
    expect(resolveAkselFont('https://cdn.nav.no/aksel/fonts/../../server.ts')).toBeNull()
  })
})
