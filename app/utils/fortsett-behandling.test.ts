import { describe, expect, it } from 'vitest'
import type { BehandlingDTO } from '~/types/behandling'
import {
  erProsessertEtter,
  fortsettBehandling,
  fortsettBehandlingUrl,
  medForrigeKjoring,
  venterPaNyKjoring,
  venterPaValideringPaAktivitet,
} from './fortsett-behandling'

const behandling = (uuid: string | null) => ({ sisteKjoring: uuid === null ? null : { uuid } }) as BehandlingDTO

describe('fortsettBehandling', () => {
  it('bygger URL til behandlingen med siste kjøring før innsending', () => {
    expect(fortsettBehandlingUrl({ behandlingId: '123', forrigeKjoring: 'abc' })).toBe(
      '/behandling/123?forrigeKjoring=abc',
    )
  })

  it('bruker tom verdi når det ikke fantes noen kjøring', () => {
    expect(fortsettBehandlingUrl({ behandlingId: '123', forrigeKjoring: null })).toBe('/behandling/123?forrigeKjoring=')
  })

  it('returnerer redirect', () => {
    const response = fortsettBehandling({ behandlingId: '123', forrigeKjoring: 'abc' })
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe('/behandling/123?forrigeKjoring=abc')
  })
})

describe('erProsessertEtter', () => {
  it('er false så lenge siste kjøring er uendret', () => {
    expect(erProsessertEtter(behandling('abc'), 'abc')).toBe(false)
  })

  it('er true når det har kommet en ny kjøring', () => {
    expect(erProsessertEtter(behandling('def'), 'abc')).toBe(true)
  })

  it('er true når første kjøring kommer og det ikke fantes noen før', () => {
    expect(erProsessertEtter(behandling('def'), '')).toBe(true)
    expect(erProsessertEtter(behandling(null), '')).toBe(false)
  })
})

describe('venterPaNyKjoring', () => {
  it('venter ikke uten søkeparameter', () => {
    expect(venterPaNyKjoring(behandling('abc'), null)).toBe(false)
  })

  it('venter når kjøringen er den samme som før innsending', () => {
    expect(venterPaNyKjoring(behandling('abc'), 'abc')).toBe(true)
  })
})

describe('medForrigeKjoring', () => {
  it('legger siste kjøring før innsending på en vilkårlig sti', () => {
    expect(medForrigeKjoring('/behandling/123/aktivitet/456/a/b', 'abc')).toBe(
      '/behandling/123/aktivitet/456/a/b?forrigeKjoring=abc',
    )
  })
})

describe('venterPaValideringPaAktivitet', () => {
  it('venter på aktiviteten når søkeparameteren er satt', () => {
    expect(venterPaValideringPaAktivitet('456', new URLSearchParams('forrigeKjoring=abc'))).toBe(true)
    expect(venterPaValideringPaAktivitet('456', new URLSearchParams('forrigeKjoring='))).toBe(true)
  })

  it('venter ikke uten søkeparameter', () => {
    expect(venterPaValideringPaAktivitet('456', new URLSearchParams())).toBe(false)
  })

  it('venter ikke på aktiviteten utenfor en aktivitetsrute', () => {
    expect(venterPaValideringPaAktivitet(undefined, new URLSearchParams('forrigeKjoring=abc'))).toBe(false)
  })
})
