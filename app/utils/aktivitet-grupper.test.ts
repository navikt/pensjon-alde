import { describe, expect, it } from 'vitest'
import { grupperAktiviteter } from './aktivitet-grupper'

describe('grupperAktiviteter', () => {
  it('grupperer aktiviteter og beholder rekkefølgen', () => {
    const resultat = grupperAktiviteter([
      { id: 1, gruppe: 'KLARGJORING' },
      { id: 2, gruppe: 'GRUNNLAGSVURDERNG' },
      { id: 3, gruppe: 'KLARGJORING' },
      { id: 4, gruppe: 'GRUNNLAGSVURDERNG' },
    ])

    expect(resultat.map(it => it.navn)).toEqual(['Klargjøring', 'Grunnlagsvurdering'])
    expect(resultat.map(it => it.aktiviteter.map(a => a.id))).toEqual([
      [1, 3],
      [2, 4],
    ])
  })

  it('legger aktiviteter uten gruppe i USORTET', () => {
    const resultat = grupperAktiviteter([{ id: 1 }, { id: 2, gruppe: null }])

    expect(resultat).toHaveLength(1)
    expect(resultat[0].gruppe).toBe('USORTET')
    expect(resultat[0].aktiviteter).toHaveLength(2)
  })
})
