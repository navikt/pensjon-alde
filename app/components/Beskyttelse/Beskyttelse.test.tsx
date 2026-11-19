import { describe, expect, it } from 'vitest'
import { beskyttelsesmarkeringer } from './Beskyttelse'

describe('beskyttelsesmarkeringer', () => {
  it('gir ingen markeringer når feltene mangler', () => {
    expect(beskyttelsesmarkeringer({})).toEqual([])
  })

  it('markerer bruker og EPS hver for seg', () => {
    const markeringer = beskyttelsesmarkeringer({
      beskyttelse: ['STRENGT_FORTROLIG', 'EGEN_ANSATT'],
      epsBeskyttelse: ['FORTROLIG'],
    })

    expect(markeringer.map(m => m.tekst)).toEqual([
      'Strengt fortrolig adresse',
      'Egen ansatt',
      'EPS: Fortrolig adresse',
    ])
    expect(markeringer.map(m => m.farge)).toEqual(['danger', 'warning', 'warning'])
  })

  it('ignorerer ukjente verdier fra backend', () => {
    expect(beskyttelsesmarkeringer({ beskyttelse: ['NY_VERDI' as never] })).toEqual([])
  })
})
