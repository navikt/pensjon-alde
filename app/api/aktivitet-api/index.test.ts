import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetch = vi.fn()

vi.mock('~/utils/env.server', () => ({ env: { penUrl: 'http://pen' } }))
vi.mock('../api-client', () => ({ fetcher: () => fetch }))

const { createAktivitetApi } = await import('./index')

describe('lagreVurderingOgFortsett', () => {
  beforeEach(() => {
    fetch.mockReset().mockResolvedValue({ kjoringUuidForVurdering: 'før-lagring' })
  })

  it('blir på aktiviteten med siste kjøring før lagringen fra PEN', async () => {
    const api = createAktivitetApi({
      request: new Request('http://localhost/behandling/1/aktivitet/2/alderspensjon-soknad/vurder-samboer?index'),
      behandlingId: '1',
      aktivitetId: '2',
    })

    const response = await api.lagreVurderingOgFortsett({ vurdering: 'ok' })

    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledWith('/vurdering', expect.objectContaining({ method: 'POST' }))
    expect(response.headers.get('Location')).toBe(
      '/behandling/1/aktivitet/2/alderspensjon-soknad/vurder-samboer?forrigeKjoring=f%C3%B8r-lagring',
    )
  })

  it('fjerner .data fra single fetch-forespørselen', async () => {
    const api = createAktivitetApi({
      request: new Request('http://localhost/behandling/1/aktivitet/2/alderspensjon-soknad/varig-adskilt.data'),
      behandlingId: '1',
      aktivitetId: '2',
    })

    const response = await api.lagreVurderingOgFortsett({ vurdering: 'ok' })

    expect(response.headers.get('Location')).toBe(
      '/behandling/1/aktivitet/2/alderspensjon-soknad/varig-adskilt?forrigeKjoring=f%C3%B8r-lagring',
    )
  })

  it('redirecter ikke når lagring feiler', async () => {
    fetch.mockRejectedValue(new Error('feil'))
    const api = createAktivitetApi({ request: new Request('http://localhost'), behandlingId: '1', aktivitetId: '2' })

    await expect(api.lagreVurderingOgFortsett({})).rejects.toThrow('feil')
  })
})
