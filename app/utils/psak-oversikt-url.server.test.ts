import { describe, expect, it, vi } from 'vitest'

const TEST_KEY = 'MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE'

vi.mock('./env.server', () => ({
  env: {
    psakSakUrlTemplate: 'https://example.com/psak/sak/{sakId}',
    psakOversiktUrlTemplate: 'https://example.com/pensjonsoversikt/person',
    pidEncryptionKey: TEST_KEY,
  },
}))

describe('buildPsakOversiktUrl', () => {
  const request = new Request('https://app.intern.nav.no/path')

  it('bruker sakId som query/path-parameter når behandlingen har en sak', async () => {
    const { buildPsakOversiktUrl } = await import('./psak-oversikt-url.server')

    const url = buildPsakOversiktUrl(request, { sakId: 12345, fnr: null })

    expect(url).toBe('https://example.com/psak/sak/12345')
  })

  it('bruker kryptert pid som eget path-segment når behandlingen mangler sakId', async () => {
    const { buildPsakOversiktUrl } = await import('./psak-oversikt-url.server')

    const url = buildPsakOversiktUrl(request, { sakId: null, fnr: '12345678901' })

    expect(url).toMatch(/^https:\/\/example\.com\/pensjonsoversikt\/person\/[\w-]+\.[\w-]+$/)
  })

  it('faller tilbake til oversikts-URL-en uten pid-segment når verken sakId eller fnr finnes', async () => {
    const { buildPsakOversiktUrl } = await import('./psak-oversikt-url.server')

    const url = buildPsakOversiktUrl(request, { sakId: null, fnr: null })

    expect(url).toBe('https://example.com/pensjonsoversikt/person')
  })
})
