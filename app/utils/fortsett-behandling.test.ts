import { describe, expect, it } from 'vitest'
import type { BehandlingDTO } from '~/types/behandling'
import {
  erProsessertEtter,
  fortsettBehandling,
  fortsettBehandlingUrl,
  kunForrigeKjoringFjernet,
  medForrigeKjoring,
  utenForrigeKjoring,
  venterPaNyKjoring,
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

describe('utenForrigeKjoring', () => {
  it('fjerner forrigeKjoring og beholder andre parametere', () => {
    expect(utenForrigeKjoring('?forrigeKjoring=abc')).toBe('')
    expect(utenForrigeKjoring('?a=1&forrigeKjoring=abc&b=2')).toBe('?a=1&b=2')
  })
})

describe('kunForrigeKjoringFjernet', () => {
  const args = (current: string, next: string, formMethod?: string) =>
    ({
      currentUrl: new URL(`http://localhost${current}`),
      nextUrl: new URL(`http://localhost${next}`),
      formMethod,
      defaultShouldRevalidate: true,
    }) as Parameters<typeof kunForrigeKjoringFjernet>[0]

  it('laster ikke på nytt når bare forrigeKjoring fjernes', () => {
    expect(kunForrigeKjoringFjernet(args('/a?forrigeKjoring=abc', '/a'))).toBe(false)
    expect(kunForrigeKjoringFjernet(args('/a?x=1&forrigeKjoring=abc', '/a?x=1'))).toBe(false)
  })

  it('bruker standard ellers', () => {
    expect(kunForrigeKjoringFjernet(args('/a', '/a'))).toBe(true)
    expect(kunForrigeKjoringFjernet(args('/a?forrigeKjoring=abc', '/b'))).toBe(true)
    expect(kunForrigeKjoringFjernet(args('/a?forrigeKjoring=abc', '/a?x=1'))).toBe(true)
    expect(kunForrigeKjoringFjernet(args('/a', '/a?forrigeKjoring=abc'))).toBe(true)
    expect(kunForrigeKjoringFjernet(args('/a?forrigeKjoring=abc', '/a', 'POST'))).toBe(true)
  })
})
