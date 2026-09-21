import { describe, expect, it } from 'vitest'
import type { SamboerVurdering } from './samboer-types'
import { normaliserSamboerVurdering, tilSamboerVurderingPayload } from './samboer-vurdering'

describe('normaliserSamboerVurdering', () => {
  it('leser samboerType når API-et svarer med nytt feltnavn', () => {
    const resultat = normaliserSamboerVurdering({ samboerFra: '2020-06-01', samboerType: 'SAMBOER_3_2' })

    expect(resultat).toEqual({ samboerFra: '2020-06-01', samboerType: 'SAMBOER_3_2' })
  })

  it('faller tilbake til vurdering når API-et svarer med gammelt feltnavn', () => {
    const resultat = normaliserSamboerVurdering({ samboerFra: '2020-06-01', vurdering: 'SAMBOER_1_5' })

    expect(resultat).toEqual({ samboerFra: '2020-06-01', samboerType: 'SAMBOER_1_5' })
  })

  it('lar samboerType vinne når begge feltnavn er til stede', () => {
    const resultat = normaliserSamboerVurdering({
      samboerFra: '2020-06-01',
      samboerType: 'IKKE_SAMBOER',
      vurdering: 'SAMBOER_3_2',
    })

    expect(resultat?.samboerType).toBe('IKKE_SAMBOER')
  })

  it('fjerner det gamle vurdering-feltet fra resultatet', () => {
    const resultat = normaliserSamboerVurdering({ samboerFra: '2020-06-01', vurdering: 'SAMBOER_1_5' })

    expect(resultat).not.toHaveProperty('vurdering')
  })

  it('beholder begrunnelse', () => {
    const resultat = normaliserSamboerVurdering({
      samboerFra: '2020-06-01',
      vurdering: 'SAMBOER_1_5',
      begrunnelse: 'En begrunnelse',
    })

    expect(resultat?.begrunnelse).toBe('En begrunnelse')
  })

  it('beholder samboerFnr', () => {
    const resultat = normaliserSamboerVurdering({
      samboerFnr: '01019012345',
      samboerFra: '2020-06-01',
      vurdering: 'SAMBOER_1_5',
    })

    expect(resultat?.samboerFnr).toBe('01019012345')
  })

  it('returnerer null for manglende vurdering', () => {
    expect(normaliserSamboerVurdering(null)).toBeNull()
    expect(normaliserSamboerVurdering(undefined)).toBeNull()
  })

  it('gir samboerType undefined når ingen av feltene finnes', () => {
    const resultat = normaliserSamboerVurdering({ samboerFra: '2020-06-01' })

    expect(resultat?.samboerType).toBeUndefined()
  })
})

describe('tilSamboerVurderingPayload', () => {
  it('sender både samboerType og vurdering med samme verdi', () => {
    const vurdering: SamboerVurdering = {
      samboerFnr: '01019012345',
      samboerFra: '2020-06-01',
      samboerType: 'SAMBOER_3_2',
    }

    expect(tilSamboerVurderingPayload(vurdering)).toEqual({
      samboerFnr: '01019012345',
      samboerFra: '2020-06-01',
      samboerType: 'SAMBOER_3_2',
      vurdering: 'SAMBOER_3_2',
    })
  })

  it('beholder begrunnelse i payloaden', () => {
    const vurdering: SamboerVurdering = {
      samboerFnr: '01019012345',
      samboerFra: '2020-06-01',
      samboerType: 'IKKE_SAMBOER',
      begrunnelse: 'En begrunnelse',
    }

    expect(tilSamboerVurderingPayload(vurdering).begrunnelse).toBe('En begrunnelse')
  })
})
