import { describe, expect, it } from 'vitest'
import { tilPensjonspoengRader } from './pensjonspoeng-rader'
import { sorterRader } from './sorter-rader'
import type { OpptjeningChangeStamp, Pensjonspoeng } from './types'

function stempel(createdDate: string, updatedDate: string | null = null): OpptjeningChangeStamp {
  return { createdBy: null, createdDate, updatedBy: null, updatedDate }
}

function lagPensjonspoeng(overrides: Partial<Pensjonspoeng>): Pensjonspoeng {
  return {
    pensjonspoengId: null,
    fnr: null,
    fnrOmsorgFor: null,
    kilde: null,
    pensjonspoengType: 'PPI',
    inntekt: null,
    omsorg: null,
    ar: 2000,
    anvendtPi: null,
    poeng: null,
    maxUforegrad: null,
    changeStamp: null,
    ...overrides,
  }
}

describe('tilPensjonspoengRader', () => {
  it('slår sammen inntekts- og omsorgspoeng til én rad per år', () => {
    const rader = tilPensjonspoengRader([
      lagPensjonspoeng({
        ar: 2010,
        pensjonspoengType: 'PPI',
        poeng: 3.2,
        inntekt: {
          inntektId: 1,
          fnr: null,
          kilde: null,
          kommune: null,
          piMerke: null,
          inntektAr: 2010,
          belop: 450000,
          changeStamp: stempel('2011-05-01'),
          inntektType: null,
        },
        changeStamp: stempel('2011-04-01'),
      }),
      lagPensjonspoeng({
        ar: 2010,
        pensjonspoengType: 'OBU6',
        poeng: 3.5,
        changeStamp: stempel('2011-01-01', '2012-02-03'),
      }),
      lagPensjonspoeng({ ar: 2011, pensjonspoengType: 'OSFE', poeng: 3.0 }),
    ])

    expect(rader).toEqual([
      {
        ar: 2010,
        pensjonsgivendeInntekt: 450000,
        pensjonspoeng: 3.2,
        omsorgspoeng: 3.5,
        sisteRegistrertDato: '2012-02-03',
      },
      {
        ar: 2011,
        pensjonsgivendeInntekt: null,
        pensjonspoeng: null,
        omsorgspoeng: 3.0,
        sisteRegistrertDato: null,
      },
    ])
  })

  it('hopper over poeng uten år', () => {
    expect(tilPensjonspoengRader([lagPensjonspoeng({ ar: null })])).toEqual([])
  })
})

describe('sorterRader', () => {
  const rader = tilPensjonspoengRader([2005, 1999, 2010].map(ar => lagPensjonspoeng({ ar })))

  it('sorterer stigende på år', () => {
    expect(sorterRader(rader, [{ columnId: 'ar', direction: 'asc' }]).map(it => it.ar)).toEqual([1999, 2005, 2010])
  })

  it('sorterer synkende på år', () => {
    expect(sorterRader(rader, [{ columnId: 'ar', direction: 'desc' }]).map(it => it.ar)).toEqual([2010, 2005, 1999])
  })

  it('beholder opprinnelig rekkefølge uten sortering', () => {
    expect(sorterRader(rader, []).map(it => it.ar)).toEqual([2005, 1999, 2010])
  })
})
