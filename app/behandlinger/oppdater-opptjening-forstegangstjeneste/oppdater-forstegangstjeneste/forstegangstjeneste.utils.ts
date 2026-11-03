import type {
  ForstegangstjenesteGrunnlag,
  ForstegangstjenestePeriodeDTO,
  ForstegangstjenesteVurdering,
  LinjeStatus,
  Opptjeningstype,
  PeriodeLinje,
  TjenesteDTO,
  TjenesteLinje,
} from './forstegangstjeneste.types'
import { beregnStatus, byggEndringSummary, type EndringSummary } from './opptjening.utils'

export const TJENESTE_ID = 'forstegangstjeneste'

export const TJENESTE_FELTER = [
  ['tjenestestartDato', 'Tjenestestart'],
  ['dimitteringDato', 'Dimittering'],
] as const

export const PERIODE_FELTER = [
  ['periodeType', 'Periodetype'],
  ['tjenesteType', 'Tjenestetype'],
  ['fomDato', 'Fra og med'],
  ['tomDato', 'Til og med'],
] as const

export type TjenesteFeilFelt = (typeof TJENESTE_FELTER)[number][0]
export type PeriodeFeilFelt = (typeof PERIODE_FELTER)[number][0]
export type TjenesteFeil = Partial<Record<TjenesteFeilFelt, string>>
export type PeriodeFeil = Partial<Record<PeriodeFeilFelt, string>>

export type ForstegangstjenesteFeil = {
  tjeneste: TjenesteFeil
  perioder: Record<string, PeriodeFeil>
  manglerPeriode?: string
}

export const INGEN_FEIL: ForstegangstjenesteFeil = { tjeneste: {}, perioder: {} }

export const tjenesteNokler = TJENESTE_FELTER.map(([felt]) => felt)
export const periodeNokler = PERIODE_FELTER.map(([felt]) => felt)

const ISO_DATO = /^(\d{4})-(\d{2})-(\d{2})$/

export function erGyldigDato(verdi: string | null | undefined): verdi is string {
  const treff = verdi ? ISO_DATO.exec(verdi) : null
  if (!treff) return false
  const [ar, maned, dag] = treff.slice(1).map(Number)
  const dato = new Date(Date.UTC(ar, maned - 1, dag))
  return dato.getUTCFullYear() === ar && dato.getUTCMonth() === maned - 1 && dato.getUTCDate() === dag
}

export const formaterDato = (verdi: string | null | undefined) =>
  erGyldigDato(verdi) ? verdi.split('-').reverse().join('.') : (verdi ?? '')

export const typeLabel = (typer: Opptjeningstype[], kode: string | null | undefined) =>
  typer.find(type => type.code === kode)?.description ?? kode ?? ''

const periodeDto = (periode: ForstegangstjenestePeriodeDTO): ForstegangstjenestePeriodeDTO => ({
  periodeType: periode.periodeType ?? null,
  tjenesteType: periode.tjenesteType ?? null,
  fomDato: periode.fomDato ?? null,
  tomDato: periode.tomDato ?? null,
})

const samme = (venstre: ForstegangstjenestePeriodeDTO, hoyre: ForstegangstjenestePeriodeDTO) =>
  periodeNokler.every(felt => (venstre[felt] ?? null) === (hoyre[felt] ?? null))

export function tjenesteLinjerFraVurdering(
  grunnlag: ForstegangstjenesteGrunnlag | null | undefined,
  vurdering: ForstegangstjenesteVurdering | null | undefined,
): TjenesteLinje[] {
  const fgt = grunnlag?.forstegangstjeneste
  const original: TjenesteDTO | null = fgt
    ? { tjenestestartDato: fgt.tjenestestartDato ?? null, dimitteringDato: fgt.dimitteringDato ?? null }
    : null
  const lagret = vurdering?.forstegangstjenesteTilLagring
  if (vurdering?.slettForstegangstjeneste) {
    const verdier = original ?? { tjenestestartDato: null, dimitteringDato: null }
    return [{ ...verdier, _id: TJENESTE_ID, _status: 'deleted', _original: original }]
  }
  if (lagret) {
    const dto = { tjenestestartDato: lagret.tjenestestartDato, dimitteringDato: lagret.dimitteringDato }
    const linje: TjenesteLinje = { ...dto, _id: TJENESTE_ID, _status: 'original', _original: original }
    return [{ ...linje, _status: beregnStatus(linje, tjenesteNokler) }]
  }
  return original ? [{ ...original, _id: TJENESTE_ID, _status: 'original', _original: original }] : []
}

// PEN lagrer hele førstegangstjenesten, så endringene utledes ved å matche perioder: først helt like, så samme fra og med-dato
export function perioderFraVurdering(
  grunnlag: ForstegangstjenesteGrunnlag | null | undefined,
  vurdering: ForstegangstjenesteVurdering | null | undefined,
): PeriodeLinje[] {
  const originaler = (grunnlag?.forstegangstjeneste?.forstegangstjenestePeriodeListe ?? []).map(periodeDto)
  const linjer: PeriodeLinje[] = originaler.map((dto, indeks) => ({
    ...dto,
    _id: `periode-${indeks}`,
    _status: 'original',
    _original: { ...dto },
  }))
  const lagrede = vurdering?.forstegangstjenesteTilLagring?.forstegangstjenestePeriodeListe
  if (!lagrede) return linjer

  const ledige = new Set(originaler.keys())
  const finnLedig = (treff: (original: ForstegangstjenestePeriodeDTO) => boolean) => {
    const indeks = [...ledige].find(i => treff(originaler[i]))
    if (indeks !== undefined) ledige.delete(indeks)
    return indeks
  }
  const uten = lagrede.map(periodeDto).filter(periode => finnLedig(original => samme(original, periode)) === undefined)
  const nye: PeriodeLinje[] = []
  for (const periode of uten) {
    const indeks = finnLedig(original => original.fomDato === periode.fomDato)
    if (indeks === undefined) nye.push({ ...periode, _id: `periode-ny-${nye.length}`, _status: 'new', _original: null })
    else linjer[indeks] = { ...linjer[indeks], ...periode, _status: 'modified' }
  }
  for (const indeks of ledige) linjer[indeks] = { ...linjer[indeks], _status: 'deleted' }
  return [...linjer, ...nye]
}

export const nyTjenesteLinje = (): TjenesteLinje => ({
  _id: TJENESTE_ID,
  _status: 'new',
  _original: null,
  tjenestestartDato: null,
  dimitteringDato: null,
})

export const nyPeriodeLinje = (periodeType: string | null, tjenesteType: string | null): PeriodeLinje => ({
  _id: crypto.randomUUID(),
  _status: 'new',
  _original: null,
  periodeType,
  tjenesteType,
  fomDato: null,
  tomDato: null,
})

export function tilbakestill<T extends { _original: object | null }>(linje: T): T {
  return linje._original ? { ...linje, ...linje._original } : linje
}

export const erTjenesteSlettet = (tjeneste: TjenesteLinje | undefined) => tjeneste?._status === 'deleted'

// Når hele tjenesten slettes vises periodene fra POPP som slettet, mens utkastene beholdes til tjenesten gjenopprettes
export function synligePerioder(tjeneste: TjenesteLinje | undefined, perioder: PeriodeLinje[]): PeriodeLinje[] {
  if (!erTjenesteSlettet(tjeneste)) return perioder
  return perioder.flatMap(periode =>
    periode._original ? [{ ...periode, ...periode._original, _status: 'deleted' as const }] : [],
  )
}

export const aktivePerioder = (perioder: PeriodeLinje[]) => perioder.filter(periode => periode._status !== 'deleted')

const harEndring = (tjeneste: TjenesteLinje, perioder: PeriodeLinje[]) =>
  tjeneste._status !== 'original' || perioder.some(periode => periode._status !== 'original')

const skalLagres = (tjeneste: TjenesteLinje | undefined, perioder: PeriodeLinje[]): tjeneste is TjenesteLinje =>
  !!tjeneste && !erTjenesteSlettet(tjeneste) && harEndring(tjeneste, perioder)

export function finnForstegangstjenesteFeil(
  tjeneste: TjenesteLinje | undefined,
  perioder: PeriodeLinje[],
): ForstegangstjenesteFeil {
  if (!skalLagres(tjeneste, perioder)) return INGEN_FEIL

  const tjenesteFeil: TjenesteFeil = {}
  if (!erGyldigDato(tjeneste.tjenestestartDato))
    tjenesteFeil.tjenestestartDato = 'Oppgi en gyldig dato for tjenestestart.'
  if (!erGyldigDato(tjeneste.dimitteringDato)) tjenesteFeil.dimitteringDato = 'Oppgi en gyldig dato for dimittering.'
  if (!tjenesteFeil.tjenestestartDato && !tjenesteFeil.dimitteringDato) {
    if ((tjeneste.tjenestestartDato as string) > (tjeneste.dimitteringDato as string)) {
      tjenesteFeil.tjenestestartDato = 'Dimittering kan ikke være før tjenestestart.'
      tjenesteFeil.dimitteringDato = tjenesteFeil.tjenestestartDato
    }
  }

  const periodeFeil: Record<string, PeriodeFeil> = {}
  const aktive = aktivePerioder(perioder)
  for (const periode of aktive) {
    const feil: PeriodeFeil = {}
    if (!periode.periodeType) feil.periodeType = 'Velg periodetype.'
    if (!periode.tjenesteType) feil.tjenesteType = 'Velg tjenestetype.'
    if (!erGyldigDato(periode.fomDato)) feil.fomDato = 'Oppgi en gyldig fra og med-dato.'
    if (!erGyldigDato(periode.tomDato)) feil.tomDato = 'Oppgi en gyldig til og med-dato.'
    if (!feil.fomDato && !feil.tomDato && (periode.fomDato as string) > (periode.tomDato as string)) {
      feil.fomDato = 'Fra og med-dato kan ikke være etter til og med-dato.'
      feil.tomDato = feil.fomDato
    }
    if (Object.keys(feil).length > 0) periodeFeil[periode._id] = feil
  }

  return {
    tjeneste: tjenesteFeil,
    perioder: periodeFeil,
    ...(aktive.length === 0
      ? { manglerPeriode: 'Legg til minst én periode, eller slett hele førstegangstjenesten.' }
      : {}),
  }
}

export const harFeil = (feil: ForstegangstjenesteFeil) =>
  Object.keys(feil.tjeneste).length > 0 || Object.keys(feil.perioder).length > 0 || !!feil.manglerPeriode

export function byggForstegangstjenestePayload(
  tjeneste: TjenesteLinje | undefined,
  perioder: PeriodeLinje[],
): ForstegangstjenesteVurdering {
  if (erTjenesteSlettet(tjeneste)) return tjeneste?._original ? { slettForstegangstjeneste: true } : {}
  if (!skalLagres(tjeneste, perioder)) return {}
  return {
    forstegangstjenesteTilLagring: {
      tjenestestartDato: tjeneste.tjenestestartDato as string,
      dimitteringDato: tjeneste.dimitteringDato as string,
      forstegangstjenestePeriodeListe: aktivePerioder(perioder).map(periode => ({
        periodeType: periode.periodeType as string,
        tjenesteType: periode.tjenesteType as string,
        fomDato: periode.fomDato as string,
        tomDato: periode.tomDato as string,
      })),
    },
  }
}

export const tidsrom = (fra: string | null | undefined, til: string | null | undefined) =>
  fra || til ? `${formaterDato(fra) || '–'}–${formaterDato(til) || '–'}` : ''

export function visteVerdier<L extends { _status: LinjeStatus; _original: object | null }>(linje: L): L {
  return linje._status === 'deleted' && linje._original ? { ...linje, ...linje._original } : linje
}

export function byggForstegangstjenesteSummary(
  tjeneste: TjenesteLinje | undefined,
  perioder: PeriodeLinje[],
  periodetyper: Opptjeningstype[],
  tjenestetyper: Opptjeningstype[],
): EndringSummary {
  const tjenesteSummary = byggEndringSummary(tjeneste ? [visteVerdier(tjeneste)] : [], {
    label: linje => {
      const tid = tidsrom(linje.tjenestestartDato, linje.dimitteringDato)
      return tid ? `Førstegangstjeneste (${tid})` : 'Førstegangstjeneste'
    },
    endringer: linje =>
      TJENESTE_FELTER.filter(([felt]) => linje._original && linje[felt] !== linje._original[felt]).map(
        ([felt, label]) =>
          `${label}: ${formaterDato(linje._original?.[felt]) || '–'} → ${formaterDato(linje[felt]) || '–'}`,
      ),
  })
  const verdi = (periode: ForstegangstjenestePeriodeDTO, felt: PeriodeFeilFelt) => {
    if (felt === 'periodeType') return typeLabel(periodetyper, periode.periodeType)
    if (felt === 'tjenesteType') return typeLabel(tjenestetyper, periode.tjenesteType)
    return formaterDato(periode[felt])
  }
  const periodeSummary = byggEndringSummary(synligePerioder(tjeneste, perioder).map(visteVerdier), {
    label: periode => {
      const tid = tidsrom(periode.fomDato, periode.tomDato)
      return `${tid ? `Periode ${tid}` : 'Periode uten datoer'}: ${verdi(periode, 'periodeType')}, ${verdi(periode, 'tjenesteType')}`
    },
    endringer: periode =>
      PERIODE_FELTER.filter(([felt]) => periode._original && periode[felt] !== periode._original[felt]).map(
        ([felt, label]) =>
          `${label}: ${(periode._original && verdi(periode._original, felt)) || '–'} → ${verdi(periode, felt) || '–'}`,
      ),
  })
  return {
    nye: [...tjenesteSummary.nye, ...periodeSummary.nye],
    endrede: [...tjenesteSummary.endrede, ...periodeSummary.endrede],
    slettede: [...tjenesteSummary.slettede, ...periodeSummary.slettede],
  }
}
