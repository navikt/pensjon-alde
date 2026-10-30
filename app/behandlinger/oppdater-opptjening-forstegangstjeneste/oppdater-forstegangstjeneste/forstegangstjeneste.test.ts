import { describe, expect, it } from 'vitest'
import type { ForstegangstjenesteGrunnlag, PeriodeLinje } from './forstegangstjeneste.types'
import {
  byggForstegangstjenestePayload,
  byggForstegangstjenesteSummary,
  erGyldigDato,
  finnForstegangstjenesteFeil,
  nyPeriodeLinje,
  nyTjenesteLinje,
  perioderFraVurdering,
  synligePerioder,
  tilbakestill,
  tjenesteLinjerFraVurdering,
} from './forstegangstjeneste.utils'

const ordinar = { periodeType: 'NORMAL', tjenesteType: 'MIL', fomDato: '1982-01-04', tomDato: '1982-05-31' }
const permisjon = { periodeType: 'PERM', tjenesteType: 'MIL', fomDato: '1982-06-01', tomDato: '1982-06-14' }
const resten = { periodeType: 'NORMAL', tjenesteType: 'MIL', fomDato: '1982-06-15', tomDato: '1982-12-17' }
const grunnlag: ForstegangstjenesteGrunnlag = {
  forstegangstjeneste: {
    kilde: 'POPP',
    rapportType: 'FORST',
    tjenestestartDato: '1982-01-04',
    dimitteringDato: '1982-12-17',
    forstegangstjenestePeriodeListe: [ordinar, permisjon, resten],
  },
  periodetyper: [
    { code: 'NORMAL', description: 'Ordinær tjeneste' },
    { code: 'PERM', description: 'Permisjon' },
  ],
  tjenestetyper: [{ code: 'MIL', description: 'Militær tjeneste' }],
}

const start = () => ({
  tjeneste: tjenesteLinjerFraVurdering(grunnlag, null)[0],
  perioder: perioderFraVurdering(grunnlag, null),
})

describe('førstegangstjeneste', () => {
  it('replays a saved replacement as unchanged, modified, new and deleted periods', () => {
    const vurdering = {
      forstegangstjenesteTilLagring: {
        tjenestestartDato: '1982-01-04',
        dimitteringDato: '1982-12-20',
        forstegangstjenestePeriodeListe: [
          ordinar,
          { ...resten, tomDato: '1982-12-20' },
          { ...permisjon, fomDato: '1982-06-03' },
        ],
      },
    }
    const [tjeneste] = tjenesteLinjerFraVurdering(grunnlag, vurdering)
    expect(tjeneste._status).toBe('modified')
    expect(tjeneste._original?.dimitteringDato).toBe('1982-12-17')
    const perioder = perioderFraVurdering(grunnlag, vurdering)
    expect(perioder.map(periode => [periode.fomDato, periode._status])).toEqual([
      ['1982-01-04', 'original'],
      ['1982-06-01', 'deleted'],
      ['1982-06-15', 'modified'],
      ['1982-06-03', 'new'],
    ])
    expect(perioder[2]._original?.tomDato).toBe('1982-12-17')
  })

  it('replays deletion of the whole førstegangstjeneste', () => {
    const vurdering = { slettForstegangstjeneste: true }
    const [tjeneste] = tjenesteLinjerFraVurdering(grunnlag, vurdering)
    expect(tjeneste._status).toBe('deleted')
    const perioder = synligePerioder(tjeneste, perioderFraVurdering(grunnlag, vurdering))
    expect(perioder.every(periode => periode._status === 'deleted')).toBe(true)
    const summary = byggForstegangstjenesteSummary(tjeneste, perioder, [], [])
    expect(summary.slettede.map(item => item.label)[0]).toBe('Førstegangstjeneste (04.01.1982–17.12.1982)')
    expect(summary.slettede).toHaveLength(4)
  })

  it('sends nothing when nothing has changed', () => {
    const { tjeneste, perioder } = start()
    expect(byggForstegangstjenestePayload(tjeneste, perioder)).toEqual({})
    expect(finnForstegangstjenesteFeil(tjeneste, perioder)).toEqual({ tjeneste: {}, perioder: {} })
  })

  it('sends the whole førstegangstjeneste without backend-owned fields when a period changes', () => {
    const { tjeneste, perioder } = start()
    const endret: PeriodeLinje[] = [
      perioder[0],
      { ...perioder[1], _status: 'deleted' },
      { ...perioder[2], tomDato: '1982-12-20', _status: 'modified' },
    ]
    expect(byggForstegangstjenestePayload(tjeneste, endret)).toEqual({
      forstegangstjenesteTilLagring: {
        tjenestestartDato: '1982-01-04',
        dimitteringDato: '1982-12-17',
        forstegangstjenestePeriodeListe: [ordinar, { ...resten, tomDato: '1982-12-20' }],
      },
    })
  })

  it('asks for deletion only when an existing førstegangstjeneste is deleted', () => {
    const { tjeneste, perioder } = start()
    expect(byggForstegangstjenestePayload({ ...tjeneste, _status: 'deleted' }, perioder)).toEqual({
      slettForstegangstjeneste: true,
    })
  })

  it('restores the original values', () => {
    const { perioder } = start()
    const endret = { ...perioder[2], tomDato: '1982-12-20', _status: 'modified' as const }
    expect(tilbakestill(endret).tomDato).toBe('1982-12-17')
  })

  it('reports errors on the exact fields that are wrong', () => {
    const tjeneste = { ...nyTjenesteLinje(), tjenestestartDato: '1982-12-20', dimitteringDato: '1982-01-04' }
    const tom = nyPeriodeLinje(null, 'MIL')
    const baklengs = { ...nyPeriodeLinje('NORMAL', 'MIL'), fomDato: '1982-06-20', tomDato: '1982-06-10' }
    const feil = finnForstegangstjenesteFeil(tjeneste, [tom, baklengs])
    expect(feil.tjeneste).toEqual({
      tjenestestartDato: 'Dimittering kan ikke være før tjenestestart.',
      dimitteringDato: 'Dimittering kan ikke være før tjenestestart.',
    })
    expect(Object.keys(feil.perioder[tom._id])).toEqual(['periodeType', 'fomDato', 'tomDato'])
    expect(feil.perioder[baklengs._id]).toEqual({
      fomDato: 'Fra og med-dato kan ikke være etter til og med-dato.',
      tomDato: 'Fra og med-dato kan ikke være etter til og med-dato.',
    })
    expect(feil.manglerPeriode).toBeUndefined()
  })

  it('requires at least one period unless the whole førstegangstjeneste is deleted', () => {
    const { tjeneste, perioder } = start()
    const alleSlettet = perioder.map(periode => ({ ...periode, _status: 'deleted' as const }))
    expect(finnForstegangstjenesteFeil(tjeneste, alleSlettet).manglerPeriode).toContain('minst én periode')
    expect(finnForstegangstjenesteFeil({ ...tjeneste, _status: 'deleted' }, perioder).manglerPeriode).toBeUndefined()
  })

  it('accepts only real ISO dates', () => {
    expect(erGyldigDato('1982-02-28')).toBe(true)
    expect(erGyldigDato('1982-02-30')).toBe(false)
    expect(erGyldigDato('28.02.1982')).toBe(false)
    expect(erGyldigDato(null)).toBe(false)
  })
})
