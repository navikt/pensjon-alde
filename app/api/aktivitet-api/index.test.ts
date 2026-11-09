import { beforeEach, describe, expect, it, vi } from 'vitest'

const kall: string[] = []
const hentBehandling = vi.fn()
const fetch = vi.fn()

vi.mock('~/utils/env.server', () => ({ env: { penUrl: 'http://pen' } }))
vi.mock('~/api/behandling-api', () => ({ createBehandlingApi: () => ({ hentBehandling }) }))
vi.mock('../api-client', () => ({ fetcher: () => fetch }))

const { createAktivitetApi } = await import('./index')

describe('lagreVurderingOgFortsett', () => {
  beforeEach(() => {
    kall.length = 0
    hentBehandling.mockReset().mockImplementation(async () => {
      kall.push('hentBehandling')
      return { sisteKjoring: { uuid: 'før-lagring' } }
    })
    fetch.mockReset().mockImplementation(async (path: string) => {
      kall.push(`fetch ${path}`)
    })
  })

  it('henter siste kjøring før lagring og redirecter med den', async () => {
    const api = createAktivitetApi({ request: new Request('http://localhost'), behandlingId: '1', aktivitetId: '2' })

    const response = await api.lagreVurderingOgFortsett({ vurdering: 'ok' })

    expect(kall).toEqual(['hentBehandling', 'fetch /vurdering'])
    expect(response.headers.get('Location')).toBe('/behandling/1?forrigeKjoring=f%C3%B8r-lagring')
  })

  it('redirecter ikke når lagring feiler', async () => {
    fetch.mockRejectedValue(new Error('feil'))
    const api = createAktivitetApi({ request: new Request('http://localhost'), behandlingId: '1', aktivitetId: '2' })

    await expect(api.lagreVurderingOgFortsett({})).rejects.toThrow('feil')
  })
})
