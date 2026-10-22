import { describe, expect, it } from 'vitest'
import { feltfeilFraFeilmeldinger, gjeldendeFeilmeldinger, lesFeltverdi } from './use-aktivitet-feil'

const tidspunkt = '2026-10-20T10:15:00.000'
const feilmeldinger = [
  { melding: 'Fom-dato mangler', felt: 'fom', tidspunkt },
  { melding: 'Fom-dato er ugyldig', felt: 'fom', tidspunkt },
  { melding: 'Beløp mangler', felt: 'belop', tidspunkt },
  { melding: 'Hele vurderingen er ugyldig', felt: null, tidspunkt },
]

describe('feltfeilFraFeilmeldinger', () => {
  it('gir første melding per felt og hopper over meldinger uten felt', () => {
    expect(feltfeilFraFeilmeldinger(feilmeldinger)).toEqual({ fom: 'Fom-dato mangler', belop: 'Beløp mangler' })
  })

  it('gir tomt objekt uten feilmeldinger', () => {
    expect(feltfeilFraFeilmeldinger(undefined)).toEqual({})
  })
})

describe('gjeldendeFeilmeldinger', () => {
  it('fjerner meldinger for felt brukeren har endret', () => {
    expect(gjeldendeFeilmeldinger(feilmeldinger, new Set(['fom'])).map(f => f.melding)).toEqual([
      'Beløp mangler',
      'Hele vurderingen er ugyldig',
    ])
  })

  it('beholder meldinger uten felt', () => {
    expect(gjeldendeFeilmeldinger(feilmeldinger, new Set(['fom', 'belop'])).map(f => f.melding)).toEqual([
      'Hele vurderingen er ugyldig',
    ])
  })

  it('gir tom liste uten feilmeldinger', () => {
    expect(gjeldendeFeilmeldinger(undefined, new Set())).toEqual([])
  })
})

describe('lesFeltverdi', () => {
  const dokument = (elementer: Record<string, object[]>) => ({
    getElementsByName: (navn: string) => (elementer[navn] ?? []) as unknown as NodeListOf<HTMLElement>,
  })

  it('leser verdien til vanlige felt', () => {
    expect(lesFeltverdi('fom', dokument({ fom: [{ type: 'text', value: '01.06.2025' }] }))).toBe('01.06.2025')
  })

  it('leser bare valgte radioknapper', () => {
    const radio = [
      { type: 'radio', value: 'A', checked: false },
      { type: 'radio', value: 'B', checked: true },
    ]
    expect(lesFeltverdi('valg', dokument({ valg: radio }))).toBe('|B')
  })

  it('gir tom streng når feltet ikke finnes', () => {
    expect(lesFeltverdi('mangler', dokument({}))).toBe('')
  })
})
