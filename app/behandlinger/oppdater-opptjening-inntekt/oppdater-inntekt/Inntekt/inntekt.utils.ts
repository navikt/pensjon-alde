import type { OpptjeningTypeKode } from '~/components/Opptjening/felles/opptjening.types'
import {
  beregnStatus,
  byggEndringSummary,
  type EndringSummary,
  type LinjeStatus,
  oppsummeringForKategori,
} from '~/components/Opptjening/felles/opptjening.utils'
import { formatCurrencyNok } from '~/utils/currency'
import type {
  BelopFelt,
  ErstattInntektPerArDTO,
  InntektFeil,
  InntektFeilFelt,
  InntektFelt,
  InntektFraFilDTO,
  InntektKategori,
  InntektLinje,
  InntektsoversiktDTO,
  Inntektstyper,
  OppdaterInntektGrunnlag,
  OppdaterInntektVurdering,
  PensjonsgivendeInntektDTO,
} from './inntekt.types'

export type InntektLinjeState = InntektLinje & {
  _id: string
  _status: LinjeStatus
  _original: InntektLinje | null
}

export type InntektstyperPerKategori = Record<InntektKategori, OpptjeningTypeKode[]>

export const BELOP_FELTER: Record<InntektKategori, { felt: BelopFelt; label: string }[]> = {
  pgi: [
    { felt: 'belopLoennsinntekt', label: 'Lønn' },
    { felt: 'belopLoennsinntektBarePensjonsdel', label: 'Lønn, bare pensjonsdel' },
    { felt: 'belopNaeringsinntekt', label: 'Næring' },
    {
      felt: 'belopNaeringsinntektFraFiskeFangstEllerFamiliebarnehage',
      label: 'Næring fra fiske, fangst eller familiebarnehage',
    },
  ],
  filformat: [
    { felt: 'belopLoenn', label: 'Lønn' },
    { felt: 'belopNaering', label: 'Næring' },
    { felt: 'belopJsf', label: 'Jord-, skog- og fiskebruk' },
  ],
  annet: [{ felt: 'belop', label: 'Beløp' }],
}

export const INNTEKT_KATEGORIER: { kategori: InntektKategori; tittel: string; redigerbar: boolean }[] = [
  { kategori: 'pgi', tittel: 'Pensjonsgivende inntekt', redigerbar: true },
  { kategori: 'filformat', tittel: 'Inntekt fra fil', redigerbar: true },
  { kategori: 'annet', tittel: 'Annen inntekt', redigerbar: false },
]

export const INNTEKT_FELTER: (keyof InntektLinje)[] = [
  'kategori',
  'inntektAr',
  'inntektsType',
  ...new Set(Object.values(BELOP_FELTER).flatMap(felter => felter.map(({ felt }) => felt))),
]

const AR_REGEX = /^\d{4}$/
const BELOP_REGEX = /^-?\d+$/

export function erRedigerbar(kategori: InntektKategori): boolean {
  return kategori !== 'annet'
}

export function inntektstyperPerKategori(inntektstyper: Inntektstyper | null | undefined): InntektstyperPerKategori {
  return {
    pgi: inntektstyper?.pensjonsgivendeInntekt ?? [],
    filformat: inntektstyper?.inntektFraFil ?? [],
    annet: inntektstyper?.annenInntekt ?? [],
  }
}

export function inntektTypeLabel(typer: OpptjeningTypeKode[], kode: string): string {
  return typer.find(t => t.code === kode)?.description ?? kode
}

function parseAr(verdi: string): number | null {
  const trimmet = verdi.trim()
  return AR_REGEX.test(trimmet) ? Number(trimmet) : null
}

function parseBelop(verdi: string | undefined): number | null {
  const trimmet = (verdi ?? '').replace(/\s/g, '')
  return trimmet === '' ? null : Number(trimmet)
}

export function formaterBelop(verdi: string | undefined): string {
  const belop = parseBelop(verdi)
  if (belop === null) return ''
  return Number.isNaN(belop) ? (verdi ?? '') : formatCurrencyNok(belop)
}

function tilLinje(kategori: InntektKategori, inntektAr: number, dto: { inntektsType: string }): InntektLinje {
  const belop = dto as Partial<Record<BelopFelt, number | null>>
  const linje: InntektLinje = { kategori, inntektAr: String(inntektAr), inntektsType: dto.inntektsType }
  for (const { felt } of BELOP_FELTER[kategori]) {
    linje[felt] = belop[felt] == null ? '' : String(belop[felt])
  }
  return linje
}

function tilDto(linje: InntektLinje): { inntektsType: string } & Partial<Record<BelopFelt, number | null>> {
  const dto: { inntektsType: string } & Partial<Record<BelopFelt, number | null>> = {
    inntektsType: linje.inntektsType,
  }
  for (const { felt } of BELOP_FELTER[linje.kategori]) {
    dto[felt] = parseBelop(linje[felt])
  }
  return dto
}

function linjerFraOversikt(oversikt: InntektsoversiktDTO | null | undefined): InntektLinje[] {
  return (oversikt?.inntekterPerAr ?? []).flatMap(ar => [
    ...(ar.inntekterPgi ?? []).map(dto => tilLinje('pgi', ar.inntektAr, dto)),
    ...(ar.inntekterFilformat ?? []).map(dto => tilLinje('filformat', ar.inntektAr, dto)),
    ...(ar.inntekterAnnet ?? []).map(dto => tilLinje('annet', ar.inntektAr, dto)),
  ])
}

function linjerFraErstatning(ar: ErstattInntektPerArDTO): InntektLinje[] {
  return [
    ...(ar.inntekterPgi ?? []).map(dto => tilLinje('pgi', ar.inntektAr, dto)),
    ...(ar.inntekterFilformat ?? []).map(dto => tilLinje('filformat', ar.inntektAr, dto)),
  ]
}

/**
 * Bygger inntektslinjene fra inntektsoversikten. Når en lagret vurdering finnes, erstattes årene i vurderingen:
 * linjer med samme kategori og type regnes som endret, linjer som mangler som slettet og resten som nye.
 */
export function inntektLinjerFraVurdering(
  grunnlag: OppdaterInntektGrunnlag | null | undefined,
  vurdering: OppdaterInntektVurdering | null | undefined,
): InntektLinjeState[] {
  const erstattet = new Map((vurdering?.inntekterPerAr ?? []).map(ar => [ar.inntektAr, linjerFraErstatning(ar)]))

  const fraGrunnlag = linjerFraOversikt(grunnlag?.inntektsoversikt).map((original, i): InntektLinjeState => {
    const felles = { _id: `inntekt-${i}`, _original: original }
    const nyeForAr = erRedigerbar(original.kategori) ? erstattet.get(Number(original.inntektAr)) : undefined
    if (!nyeForAr) return { ...original, ...felles, _status: 'original' }

    const treff = nyeForAr.findIndex(
      linje => linje.kategori === original.kategori && linje.inntektsType === original.inntektsType,
    )
    if (treff === -1) return { ...original, ...felles, _status: 'deleted' }

    const [ny] = nyeForAr.splice(treff, 1)
    const linje: InntektLinjeState = { ...ny, ...felles, _status: 'original' }
    return { ...linje, _status: beregnStatus(linje, INNTEKT_FELTER) }
  })

  const nye = [...erstattet.values()]
    .flat()
    .map((linje, i): InntektLinjeState => ({ ...linje, _id: `inntekt-ny-${i}`, _status: 'new', _original: null }))

  return [...fraGrunnlag, ...nye]
}

export function nyInntektLinje(kategori: InntektKategori, inntektsType: string): InntektLinjeState {
  const linje: InntektLinje = { kategori, inntektAr: '', inntektsType }
  for (const { felt } of BELOP_FELTER[kategori]) {
    linje[felt] = ''
  }
  return { ...linje, _id: crypto.randomUUID(), _status: 'new', _original: null }
}

export function endreInntektFelt(linje: InntektLinjeState, felt: InntektFelt, verdi: string): InntektLinjeState {
  return { ...linje, [felt]: verdi }
}

export function tilbakestillInntektLinje(linje: InntektLinjeState): InntektLinjeState {
  return linje._original ? { ...linje, ...linje._original } : linje
}

/** Sorterer eksisterende linjer på opprinnelig år og type, slik at rader ikke flytter seg mens de redigeres. */
export function sorterInntektLinjer(linjer: InntektLinjeState[]): InntektLinjeState[] {
  const eksisterende = linjer
    .filter(linje => linje._original)
    .sort((a, b) => {
      const arA = Number(a._original?.inntektAr)
      const arB = Number(b._original?.inntektAr)
      return arA - arB || (a._original?.inntektsType ?? '').localeCompare(b._original?.inntektsType ?? '')
    })
  return [...eksisterende, ...linjer.filter(linje => !linje._original)]
}

export function finnInntektFeil(linjer: InntektLinjeState[]): Record<string, InntektFeil> {
  const feil: Record<string, InntektFeil> = {}
  const settFeil = (id: string, felt: InntektFeilFelt, melding: string) => {
    feil[id] = { ...feil[id], [felt]: melding }
  }

  const aktive = linjer.filter(linje => erRedigerbar(linje.kategori) && linje._status !== 'deleted')

  for (const linje of aktive) {
    if (linje._status === 'original') continue

    if (parseAr(linje.inntektAr) === null) settFeil(linje._id, 'inntektAr', 'År må ha fire siffer')
    if (!linje.inntektsType) settFeil(linje._id, 'inntektsType', 'Velg inntektstype')

    const felter = BELOP_FELTER[linje.kategori]
    for (const { felt, label } of felter) {
      const verdi = (linje[felt] ?? '').replace(/\s/g, '')
      if (verdi && !BELOP_REGEX.test(verdi)) settFeil(linje._id, felt, `${label} må være et helt kronebeløp`)
    }
    if (felter.every(({ felt }) => parseBelop(linje[felt]) === null)) {
      settFeil(linje._id, '_belop', 'Fyll ut minst ett beløp')
    }
  }

  const grupper = new Map<string, InntektLinjeState[]>()
  for (const linje of aktive) {
    const inntektAr = parseAr(linje.inntektAr)
    if (inntektAr === null || !linje.inntektsType) continue
    const nokkel = `${linje.kategori}|${inntektAr}|${linje.inntektsType}`
    grupper.set(nokkel, [...(grupper.get(nokkel) ?? []), linje])
  }
  for (const gruppe of grupper.values()) {
    if (gruppe.length < 2) continue
    for (const linje of gruppe) {
      if (linje._status !== 'original') {
        settFeil(linje._id, '_duplikat', 'Inntektstypen er allerede registrert for dette året')
      }
    }
  }

  return feil
}

/**
 * POPP erstatter alle inntekter fra fil og PGI for et år. Derfor sendes hele året for alle år som er berørt
 * av en endring – inkludert det opprinnelige året når en linje er flyttet til et annet år.
 */
export function byggInntektPayload(linjer: InntektLinjeState[], fnr: string): OppdaterInntektVurdering {
  const redigerbare = linjer.filter(linje => erRedigerbar(linje.kategori))

  const berorteAr = new Set<number>()
  for (const linje of redigerbare) {
    if (linje._status === 'original') continue
    const opprinneligAr = linje._original ? parseAr(linje._original.inntektAr) : null
    const gjeldendeAr = linje._status === 'deleted' ? null : parseAr(linje.inntektAr)
    if (opprinneligAr !== null) berorteAr.add(opprinneligAr)
    if (gjeldendeAr !== null) berorteAr.add(gjeldendeAr)
  }

  const inntekterPerAr = [...berorteAr]
    .sort((a, b) => a - b)
    .map((inntektAr): ErstattInntektPerArDTO => {
      const aktive = redigerbare.filter(linje => linje._status !== 'deleted' && parseAr(linje.inntektAr) === inntektAr)
      return {
        inntektAr,
        inntekterFilformat: aktive.filter(linje => linje.kategori === 'filformat').map(tilDto) as InntektFraFilDTO[],
        inntekterPgi: aktive.filter(linje => linje.kategori === 'pgi').map(tilDto) as PensjonsgivendeInntektDTO[],
      }
    })

  return { fnr, inntekterPerAr }
}

export function harInntektEndringer(payload: unknown): boolean {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) return false
  const { inntekterPerAr } = payload as Partial<OppdaterInntektVurdering>
  return Array.isArray(inntekterPerAr) && inntekterPerAr.length > 0
}

function belopOppsummering(linje: InntektLinje): string {
  return BELOP_FELTER[linje.kategori]
    .filter(({ felt }) => parseBelop(linje[felt]) !== null)
    .map(({ felt, label }) => `${label}: ${formaterBelop(linje[felt])}`)
    .join(', ')
}

export function inntektKortLabel(linje: InntektLinje, typer: InntektstyperPerKategori): string {
  return `${inntektTypeLabel(typer[linje.kategori], linje.inntektsType)} (${linje.inntektAr.trim() || 'uten år'})`
}

export function inntektLabel(linje: InntektLinje, typer: InntektstyperPerKategori): string {
  const belop = belopOppsummering(linje)
  return `${inntektKortLabel(linje, typer)}${belop ? ` – ${belop}` : ''}`
}

export function inntektEndringer(linje: InntektLinjeState, typer: InntektstyperPerKategori): string[] {
  const original = linje._original
  if (!original) return []
  const endringer: string[] = []
  if (linje.inntektAr !== original.inntektAr) {
    endringer.push(`År: ${original.inntektAr} → ${linje.inntektAr}`)
  }
  if (linje.inntektsType !== original.inntektsType) {
    const kategoriTyper = typer[linje.kategori]
    endringer.push(
      `Type: ${inntektTypeLabel(kategoriTyper, original.inntektsType)} → ${inntektTypeLabel(kategoriTyper, linje.inntektsType)}`,
    )
  }
  for (const { felt, label } of BELOP_FELTER[linje.kategori]) {
    if ((linje[felt] ?? '') !== (original[felt] ?? '')) {
      endringer.push(`${label}: ${formaterBelop(original[felt]) || '–'} → ${formaterBelop(linje[felt]) || '–'}`)
    }
  }
  return endringer
}

export function byggInntektEndringSummary(
  linjer: InntektLinjeState[],
  typer: InntektstyperPerKategori,
): EndringSummary {
  return byggEndringSummary(
    INNTEKT_KATEGORIER.filter(({ redigerbar }) => redigerbar).map(({ kategori, tittel }) =>
      oppsummeringForKategori(
        tittel,
        linjer.filter(linje => linje.kategori === kategori),
        {
          label: linje => inntektLabel(linje, typer),
          kortLabel: linje => inntektKortLabel(linje, typer),
          endringer: linje => inntektEndringer(linje, typer),
        },
      ),
    ),
  )
}
