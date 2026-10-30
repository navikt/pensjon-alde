import { describe, expect, it } from 'vitest'
import {
  angreFjernPeriode,
  finnPeriodeStatus,
  fjernPeriode,
  harFeil,
  nyKap19Periode,
  nyKap20Periode,
  oppdaterPeriode,
  parseVurdering,
  type RedigerbarPeriode,
  tilRedigerbarePerioder,
  tilVurderingPayload,
  totalLengde,
  validerPeriode,
} from './trygdetid-perioder'
import type { Kap20Periode } from './types'

const eksisterende: Kap20Periode = {
  trygdetidsgrunnlagId: 1,
  state: 'UENDRET',
  land: 'NOR',
  fomDato: '2000-01-01',
  tomDato: '2010-12-31',
  ikkeProRata: false,
  endretAv: 'Z999999',
  grunnlagKildeCode: 'PEN',
  versjon: 1,
  lengde: { ar: 11, mnd: 0, dager: 0 },
}

describe('trygdetid-perioder', () => {
  it('lager radId basert på trygdetidsgrunnlagId', () => {
    expect(tilRedigerbarePerioder([eksisterende], 'kap20')[0].radId).toBe('kap20-1')
  })

  it('oppdaterer kun riktig rad', () => {
    const perioder = [...tilRedigerbarePerioder([eksisterende], 'kap20'), nyKap20Periode('ny-1')]
    const oppdatert = oppdaterPeriode(perioder, 'ny-1', { land: 'SWE' })
    expect(oppdatert[0].land).toBe('NOR')
    expect(oppdatert[1].land).toBe('SWE')
  })

  it('fjerner nye rader helt og markerer eksisterende som FJERNET', () => {
    const perioder = [...tilRedigerbarePerioder([eksisterende], 'kap20'), nyKap20Periode('ny-1')]
    const etterFjerning = fjernPeriode(fjernPeriode(perioder, 'ny-1'), 'kap20-1')
    expect(etterFjerning).toHaveLength(1)
    expect(etterFjerning[0].state).toBe('FJERNET')
    expect(angreFjernPeriode(etterFjerning, 'kap20-1')[0].state).toBe('UENDRET')
  })

  it('finner status for perioder', () => {
    const [periode] = tilRedigerbarePerioder([eksisterende], 'kap20')
    expect(finnPeriodeStatus(periode, eksisterende)).toBe('UENDRET')
    expect(finnPeriodeStatus({ ...periode, land: 'SWE' }, eksisterende)).toBe('ENDRET')
    expect(finnPeriodeStatus(nyKap19Periode('ny-1'), undefined)).toBe('LAGT_TIL')
  })

  it('validerer påkrevde felter og datorekkefølge', () => {
    expect(validerPeriode(nyKap20Periode('ny-1'))).toEqual({
      land: 'Land må fylles ut',
      fomDato: 'Fra og med må fylles ut',
      tomDato: 'Til og med må fylles ut',
    })
    expect(validerPeriode({ ...eksisterende, fomDato: '2011-01-01' })).toEqual({
      tomDato: 'Til og med kan ikke være før fra og med',
    })
    expect(validerPeriode({ ...nyKap20Periode('ny-1'), state: 'FJERNET' })).toEqual({})
    expect(harFeil([eksisterende])).toBe(false)
  })

  it('fjerner radId fra payload og parser den tilbake', () => {
    const kap20: RedigerbarPeriode<Kap20Periode>[] = tilRedigerbarePerioder([eksisterende], 'kap20')
    const payload = tilVurderingPayload([], kap20)
    expect(payload.kapittel20.perioder[0]).not.toHaveProperty('radId')
    expect(payload.kapittel20.lengde).toEqual({ ar: 11, mnd: 0, dager: 0 })
    expect(payload.lengde).toEqual({ ar: 11, mnd: 0, dager: 0 })
    expect(parseVurdering(JSON.stringify(payload))).toEqual(payload)
    expect(parseVurdering('ugyldig')).toBeNull()
    expect(parseVurdering(null)).toBeNull()
  })

  it('summerer lengde og hopper over fjernede perioder', () => {
    const fjernet: Kap20Periode = { ...eksisterende, trygdetidsgrunnlagId: 2, state: 'FJERNET' }
    const annen: Kap20Periode = { ...eksisterende, trygdetidsgrunnlagId: 3, lengde: { ar: 1, mnd: 2, dager: 3 } }
    expect(totalLengde([eksisterende, fjernet, annen])).toEqual({ ar: 12, mnd: 2, dager: 3 })
  })
})
