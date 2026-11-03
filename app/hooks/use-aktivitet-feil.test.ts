import { describe, expect, it } from 'vitest'
import {
  feilmeldingerNokkel,
  feltfeilFraFeilmeldinger,
  feltnavnFraNokkel,
  finnFeltId,
  gjeldendeFeilmeldinger,
  lesFeltverdi,
} from './use-aktivitet-feil'

const feilmeldinger = [
  { melding: 'Fom-dato mangler', felt: 'fom' },
  { melding: 'Fom-dato er ugyldig', felt: 'fom' },
  { melding: 'Beløp mangler', felt: 'belop' },
  { melding: 'Hele vurderingen er ugyldig', felt: null },
]
const vurdertTidspunkt = '2026-10-20T10:15:00'

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
    expect(gjeldendeFeilmeldinger(feilmeldinger, { endrede: ['fom'], feltIder: {} }).map(f => f.melding)).toEqual([
      'Beløp mangler',
      'Hele vurderingen er ugyldig',
    ])
  })

  it('beholder meldinger uten felt', () => {
    expect(
      gjeldendeFeilmeldinger(feilmeldinger, { endrede: ['fom', 'belop'], feltIder: {} }).map(f => f.melding),
    ).toEqual(['Hele vurderingen er ugyldig'])
  })

  it('legger på id-en til feltet meldingen kan lenke til', () => {
    expect(
      gjeldendeFeilmeldinger(feilmeldinger, { endrede: [], feltIder: { fom: 'fom-input' } }).map(f => f.feltId),
    ).toEqual(['fom-input', 'fom-input', undefined, undefined])
  })

  it('gir tom liste uten feilmeldinger', () => {
    expect(gjeldendeFeilmeldinger(undefined, { endrede: [], feltIder: {} })).toEqual([])
  })
})

describe('lesFeltverdi', () => {
  const rot = (elementer: Record<string, object[]>) => ({
    querySelectorAll: (selector: string) => elementer[/name="(.*)"/.exec(selector)?.[1] ?? ''] ?? [],
  })

  it('leser verdien til vanlige felt', () => {
    expect(lesFeltverdi('fom', rot({ fom: [{ type: 'text', value: '01.06.2025' }] }))).toBe('01.06.2025')
  })

  it('leser bare valgte radioknapper', () => {
    const radio = [
      { type: 'radio', value: 'A', checked: false },
      { type: 'radio', value: 'B', checked: true },
    ]
    expect(lesFeltverdi('valg', rot({ valg: radio }))).toBe('|B')
  })

  it('gir tom streng når feltet ikke finnes', () => {
    expect(lesFeltverdi('mangler', rot({}))).toBe('')
  })

  it('leser bare felt innenfor aktiviteten, ikke felt med samme navn andre steder på siden', () => {
    const aktivitet = rot({ begrunnelse: [{ value: 'Vurderingens begrunnelse' }] })
    const avbrytDialog = rot({ begrunnelse: [{ value: 'Tilbakemelding ved avbrudd' }] })

    const start = lesFeltverdi('begrunnelse', aktivitet)
    lesFeltverdi('begrunnelse', avbrytDialog)

    expect(lesFeltverdi('begrunnelse', aktivitet)).toBe(start)
  })
})

describe('finnFeltId', () => {
  const element = ({
    id = '',
    tabIndex = 0,
    synlig = true,
    ...rest
  }: {
    id?: string
    name?: string
    disabled?: boolean
    tabIndex?: number
    synlig?: boolean
  }) => ({
    ...rest,
    id,
    tabIndex,
    getClientRects: () => (synlig ? [{}] : []),
  })
  const rot = (...elementer: object[]) => ({ querySelectorAll: () => elementer })

  it('gir id-en til feltet med samme name, også når id-en er generert', () => {
    expect(finnFeltId('begrunnelse', rot(element({ name: 'begrunnelse', id: 'textarea-r1' })))).toBe('textarea-r1')
  })

  it('gir id-en til elementet med samme id', () => {
    expect(finnFeltId('fom', rot(element({ id: 'fom' })))).toBe('fom')
  })

  it('hopper over felt som ikke kan få fokus', () => {
    const skjult = element({ name: 'samboerFnr', id: 'a', synlig: false })
    const deaktivert = element({ name: 'samboerFnr', id: 'b', disabled: true })
    const utenforTabRekkefolgen = element({ name: 'samboerFnr', id: 'c', tabIndex: -1 })
    const utenId = element({ name: 'samboerFnr' })

    expect(finnFeltId('samboerFnr', rot(skjult, deaktivert, utenforTabRekkefolgen, utenId))).toBeUndefined()
    expect(finnFeltId('samboerFnr', rot(skjult, element({ name: 'samboerFnr', id: 'd' })))).toBe('d')
  })

  it('gir undefined når feltet ikke finnes', () => {
    expect(finnFeltId('fom', rot(element({ name: 'tom', id: 'tom' })))).toBeUndefined()
  })
})

describe('feilmeldingerNokkel', () => {
  it('er lik når samme valideringsresultat hentes på nytt', () => {
    const hentetPaNytt = feilmeldinger.map(feil => ({ ...feil }))
    expect(feilmeldingerNokkel(1, vurdertTidspunkt, hentetPaNytt)).toBe(
      feilmeldingerNokkel(1, vurdertTidspunkt, feilmeldinger),
    )
  })

  it('endres når aktiviteten endres eller vurderingen sendes inn på nytt med samme feil', () => {
    const forrige = feilmeldingerNokkel(1, vurdertTidspunkt, feilmeldinger)
    expect(feilmeldingerNokkel(2, vurdertTidspunkt, feilmeldinger)).not.toBe(forrige)
    expect(feilmeldingerNokkel(1, '2026-10-21T08:00:00', feilmeldinger)).not.toBe(forrige)
  })
})

describe('feltnavnFraNokkel', () => {
  it('gir unike feltnavn og hopper over meldinger uten felt', () => {
    expect(feltnavnFraNokkel(feilmeldingerNokkel(1, vurdertTidspunkt, feilmeldinger))).toEqual(['fom', 'belop'])
  })
})
