import { describe, expect, it } from 'vitest'
import { sorterRader } from '~/utils/sorter-rader'
import { tilBeholdningRader } from './beholdning-rader'
import type { Beholdning } from './types'

function lagBeholdning(overrides: Partial<Beholdning>): Beholdning {
  return {
    beholdningId: null,
    fnr: null,
    status: null,
    beholdningType: 'PEN_B',
    belop: null,
    vedtakId: null,
    fomDato: null,
    tomDato: null,
    beholdningGrunnlag: null,
    beholdningGrunnlagAvkortet: null,
    beholdningInnskudd: null,
    beholdningInnskuddUtenOmsorg: null,
    oppdateringArsak: null,
    lonnsvekstregulering: null,
    inntektOpptjeningBelop: null,
    omsorgOpptjeningBelop: null,
    dagpengerOpptjeningBelop: null,
    forstegangstjenesteOpptjeningBelop: null,
    uforeOpptjeningBelop: null,
    changeStamp: null,
    ...overrides,
  }
}

describe('tilBeholdningRader', () => {
  it('lager én rad per beholdning med år og dato fra fomDato, nyeste først', () => {
    const rader = tilBeholdningRader([
      lagBeholdning({ beholdningId: 1, fomDato: '2020-01-01', belop: 1000 }),
      lagBeholdning({ beholdningId: 2, fomDato: '2021-05-01', belop: 1300 }),
      lagBeholdning({ beholdningId: 3, fomDato: '2021-01-01', belop: 1200 }),
    ])

    expect(rader).toEqual([
      { id: '2', ar: 2021, dato: '2021-05-01', pensjonsbeholdning: 1300 },
      { id: '3', ar: 2021, dato: '2021-01-01', pensjonsbeholdning: 1200 },
      { id: '1', ar: 2020, dato: '2020-01-01', pensjonsbeholdning: 1000 },
    ])
  })

  it('håndterer beholdning uten fomDato og id', () => {
    expect(tilBeholdningRader([lagBeholdning({ belop: 5 })])).toEqual([
      { id: 'ukjent-0', ar: null, dato: null, pensjonsbeholdning: 5 },
    ])
  })

  it('beholder datorekkefølgen innen samme år ved sortering på år', () => {
    const rader = tilBeholdningRader([
      lagBeholdning({ beholdningId: 1, fomDato: '2021-01-01' }),
      lagBeholdning({ beholdningId: 2, fomDato: '2020-01-01' }),
      lagBeholdning({ beholdningId: 3, fomDato: '2021-05-01' }),
    ])

    expect(sorterRader(rader, [{ columnId: 'ar', direction: 'asc' }]).map(it => it.dato)).toEqual([
      '2020-01-01',
      '2021-05-01',
      '2021-01-01',
    ])
  })
})
