import { formatCurrencyNok } from '~/utils/currency'
import { typeLabel } from '../opptjeningstyper.utils'
import type {
  DagpengerBackendDTO,
  DagpengerDTO,
  Endringstype,
  ForstegangstjenesteBackendDTO,
  ForstegangstjenesteDTO,
  InntektBackendDTO,
  InntektDTO,
  OmsorgBackendDTO,
  OmsorgDTO,
  OppdaterOpptjeningGrunnlag,
  OppdaterOpptjeningVurdering,
  OpptjeningstyperResponse,
} from './oppdater-grunnlag-types'

const KILDE = 'PEN'

export const REQUIRED_KOMMUNE: Partial<Record<string, string>> = {
  DIP_JSF: '0301',
  DIP_LON: '0301',
  DIP_SEL: '0301',
  SJO_JSF: '2312',
  SJO_LON: '2312',
  SJO_SEL: '2312',
  SVA_JSF: '2100',
  SVA_LON: '2100',
  SVA_SEL: '2100',
  SVA_PGI_LOENN: '2100',
  SVA_PGI_LOENN_PD: '2100',
  SVA_PGI_NAERING: '2100',
  SVA_PGI_NAERING_FFF: '2100',
  UTE_JSF: '2101',
  UTE_LON: '2101',
  UTE_SEL: '2101',
}

export type LinjeStatus = 'original' | 'new' | 'modified' | 'deleted'

export type InntektLinjeState = InntektDTO & { _id: string; _status: LinjeStatus; _original: InntektDTO | null }
export type DagpengerLinjeState = DagpengerDTO & { _id: string; _status: LinjeStatus; _original: DagpengerDTO | null }
export type OmsorgLinjeState = OmsorgDTO & { _id: string; _status: LinjeStatus; _original: OmsorgDTO | null }
export type ForstegangstjenesteLinjeState = ForstegangstjenesteDTO & {
  _id: string
  _status: LinjeStatus
  _original: ForstegangstjenesteDTO | null
}

export type EndringSummaryItem = {
  id: string
  kategori: string
  label: string
  endringer?: string[]
}

export type EndringSummary = {
  nye: EndringSummaryItem[]
  endrede: EndringSummaryItem[]
  slettede: EndringSummaryItem[]
}

export function tilLinjeState<T extends object>(dto: T): T & { _id: string; _status: LinjeStatus; _original: T } {
  return { ...dto, _id: crypto.randomUUID(), _status: 'original' as LinjeStatus, _original: { ...dto } as T }
}

export function beregnStatus<T extends object>(
  linje: T & { _status: LinjeStatus; _original: T | null },
  felter: (keyof T)[],
): LinjeStatus {
  if (linje._status === 'new' || linje._status === 'deleted') return linje._status
  if (!linje._original) return 'new'
  const orig = linje._original
  const endret = felter.some(k => (linje[k] ?? null) !== (orig[k] ?? null))
  return endret ? 'modified' : 'original'
}

export const INNTEKT_FELTER: (keyof InntektDTO)[] = ['inntektType', 'inntektAr', 'belop', 'kommune']
export const DAGPENGER_FELTER: (keyof DagpengerDTO)[] = [
  'dagpengerType',
  'ar',
  'uavkortetDagpengegrunnlag',
  'utbetalteDagpenger',
  'ferietillegg',
  'barnetillegg',
]
export const FORSTEGANGSTJENESTE_FELTER: (keyof ForstegangstjenesteDTO)[] = [
  'tjenesteType',
  'periodeType',
  'fomDato',
  'tomDato',
]

export function nyInntektLinje(defaultType: string): InntektLinjeState {
  return {
    _id: crypto.randomUUID(),
    _status: 'new',
    _original: null,
    inntektType: defaultType,
    inntektAr: new Date().getFullYear(),
    belop: null,
    kommune: REQUIRED_KOMMUNE[defaultType] ?? null,
  }
}

export function initialInntektLinjer(
  inntektListe: InntektBackendDTO[] | undefined,
  readOnly: boolean,
  defaultInntektType: string,
): InntektLinjeState[] {
  const fraGrunnlag = (inntektListe ?? []).map(inntektGrunnlagTilViewModel).map(tilLinjeState)
  if (fraGrunnlag.length > 0) return fraGrunnlag
  if (readOnly) return []
  return [nyInntektLinje(defaultInntektType)]
}

export function nyDagpengerLinje(): DagpengerLinjeState {
  return {
    _id: crypto.randomUUID(),
    _status: 'new',
    _original: null,
    dagpengerType: 'DP',
    ar: new Date().getFullYear(),
    uavkortetDagpengegrunnlag: null,
    utbetalteDagpenger: null,
    ferietillegg: null,
    barnetillegg: null,
  }
}

export function nyForstegangstjenesteLinje(): ForstegangstjenesteLinjeState {
  return {
    _id: crypto.randomUUID(),
    _status: 'new',
    _original: null,
    tjenesteType: 'MIL',
    periodeType: null,
    fomDato: '',
    tomDato: '',
  }
}

export function oversettKoderIMelding(melding: string, opptjeningstyper: OpptjeningstyperResponse): string {
  const alle = [
    ...opptjeningstyper.inntekt.typer,
    ...opptjeningstyper.omsorg.typer,
    ...opptjeningstyper.dagpenger.typer,
    ...opptjeningstyper.forstegangstjeneste.typer,
    ...opptjeningstyper.forstegangstjeneste.subTyper,
  ].sort((a, b) => b.code.length - a.code.length)

  return alle.reduce((tekst, type) => {
    const escaped = type.code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\b${escaped}\\b`, 'g')
    return tekst.replace(regex, `${type.description} (${type.code})`)
  }, melding)
}

export function inntektEndringer(linje: InntektLinjeState, opptjeningstyper: OpptjeningstyperResponse): string[] {
  if (!linje._original) return []
  const orig = linje._original
  const felter: string[] = []
  if (linje.inntektType !== orig.inntektType) {
    felter.push(
      `Inntektstype: ${typeLabel(opptjeningstyper, orig.inntektType)} → ${typeLabel(opptjeningstyper, linje.inntektType)}`,
    )
  }
  if (linje.inntektAr !== orig.inntektAr) {
    felter.push(`År: ${orig.inntektAr} → ${linje.inntektAr}`)
  }
  if ((linje.belop ?? null) !== (orig.belop ?? null)) {
    const fra = orig.belop != null ? formatCurrencyNok(orig.belop) : '–'
    const til = linje.belop != null ? formatCurrencyNok(linje.belop) : '–'
    felter.push(`Beløp: ${fra} → ${til}`)
  }
  if ((linje.kommune ?? null) !== (orig.kommune ?? null)) {
    felter.push(`Skattekommune: ${orig.kommune ?? '–'} → ${linje.kommune ?? '–'}`)
  }
  return felter
}

export function dagpengerEndringer(linje: DagpengerLinjeState, opptjeningstyper: OpptjeningstyperResponse): string[] {
  if (!linje._original) return []
  const orig = linje._original
  const felter: string[] = []
  if (linje.dagpengerType !== orig.dagpengerType) {
    felter.push(
      `Type: ${typeLabel(opptjeningstyper, orig.dagpengerType)} → ${typeLabel(opptjeningstyper, linje.dagpengerType)}`,
    )
  }
  if (linje.ar !== orig.ar) {
    felter.push(`År: ${orig.ar} → ${linje.ar}`)
  }
  if (
    (linje.uavkortetDagpengegrunnlag ?? null) !== (orig.uavkortetDagpengegrunnlag ?? null) &&
    linje.dagpengerType !== 'DP_FF'
  ) {
    const fra = orig.uavkortetDagpengegrunnlag != null ? formatCurrencyNok(orig.uavkortetDagpengegrunnlag) : '–'
    const til = linje.uavkortetDagpengegrunnlag != null ? formatCurrencyNok(linje.uavkortetDagpengegrunnlag) : '–'
    felter.push(`Uavkortet grunnlag: ${fra} → ${til}`)
  }
  if ((linje.utbetalteDagpenger ?? null) !== (orig.utbetalteDagpenger ?? null)) {
    const fra = orig.utbetalteDagpenger != null ? formatCurrencyNok(orig.utbetalteDagpenger) : '–'
    const til = linje.utbetalteDagpenger != null ? formatCurrencyNok(linje.utbetalteDagpenger) : '–'
    felter.push(`Utbetalte dagpenger: ${fra} → ${til}`)
  }
  if ((linje.ferietillegg ?? null) !== (orig.ferietillegg ?? null) && linje.dagpengerType !== 'DP_FF') {
    const fra = orig.ferietillegg != null ? formatCurrencyNok(orig.ferietillegg) : '–'
    const til = linje.ferietillegg != null ? formatCurrencyNok(linje.ferietillegg) : '–'
    felter.push(`Ferietillegg: ${fra} → ${til}`)
  }
  if ((linje.barnetillegg ?? null) !== (orig.barnetillegg ?? null)) {
    const fra = orig.barnetillegg != null ? formatCurrencyNok(orig.barnetillegg) : '–'
    const til = linje.barnetillegg != null ? formatCurrencyNok(linje.barnetillegg) : '–'
    felter.push(`Barnetillegg: ${fra} → ${til}`)
  }
  return felter
}

export function forstegangstjenesteEndringer(
  linje: ForstegangstjenesteLinjeState,
  opptjeningstyper: OpptjeningstyperResponse,
): string[] {
  if (!linje._original) return []
  const orig = linje._original
  const felter: string[] = []
  if (linje.tjenesteType !== orig.tjenesteType) {
    felter.push(
      `Type: ${typeLabel(opptjeningstyper, orig.tjenesteType)} → ${typeLabel(opptjeningstyper, linje.tjenesteType)}`,
    )
  }
  if ((linje.periodeType ?? null) !== (orig.periodeType ?? null)) {
    const fra = orig.periodeType ? typeLabel(opptjeningstyper, orig.periodeType) : '–'
    const til = linje.periodeType ? typeLabel(opptjeningstyper, linje.periodeType) : '–'
    felter.push(`Periodetype: ${fra} → ${til}`)
  }
  if (linje.fomDato !== orig.fomDato) {
    felter.push(`FOM: ${orig.fomDato || '–'} → ${linje.fomDato || '–'}`)
  }
  if (linje.tomDato !== orig.tomDato) {
    felter.push(`TOM: ${orig.tomDato || '–'} → ${linje.tomDato || '–'}`)
  }
  return felter
}

export function inntektLabel(l: InntektDTO, opptjeningstyper: OpptjeningstyperResponse): string {
  const belop = l.belop != null ? ` – ${formatCurrencyNok(l.belop)}` : ''
  return `${inntektKortLabel(l, opptjeningstyper)}${belop}`
}

export function inntektKortLabel(l: InntektDTO, opptjeningstyper: OpptjeningstyperResponse): string {
  return `${typeLabel(opptjeningstyper, l.inntektType)} (${l.inntektAr})`
}

export function dagpengerLabel(l: DagpengerDTO, opptjeningstyper: OpptjeningstyperResponse): string {
  const erFerietillegg = l.dagpengerType === 'DP_FF'
  return [
    dagpengerKortLabel(l, opptjeningstyper),
    !erFerietillegg &&
      l.uavkortetDagpengegrunnlag != null &&
      `grunnlag: ${formatCurrencyNok(l.uavkortetDagpengegrunnlag)}`,
    l.utbetalteDagpenger != null && `utbetalt: ${formatCurrencyNok(l.utbetalteDagpenger)}`,
    !erFerietillegg && l.ferietillegg != null && `ferie: ${formatCurrencyNok(l.ferietillegg)}`,
    l.barnetillegg != null && `barn: ${formatCurrencyNok(l.barnetillegg)}`,
  ]
    .filter(Boolean)
    .join(' – ')
}

export function dagpengerKortLabel(l: DagpengerDTO, opptjeningstyper: OpptjeningstyperResponse): string {
  return `${typeLabel(opptjeningstyper, l.dagpengerType)} (${l.ar})`
}

export function omsorgLabel(l: OmsorgDTO, opptjeningstyper: OpptjeningstyperResponse): string {
  const omsorgFor = l.fnrOmsorgFor ? ` – omsorg for ${l.fnrOmsorgFor}` : ''
  return `${typeLabel(opptjeningstyper, l.omsorgType)} (${l.ar})${omsorgFor}`
}

export function forstegangstjenesteLabel(
  l: ForstegangstjenesteDTO,
  opptjeningstyper: OpptjeningstyperResponse,
): string {
  const periode = l.periodeType ? ` / ${typeLabel(opptjeningstyper, l.periodeType)}` : ''
  return `${typeLabel(opptjeningstyper, l.tjenesteType)}${periode} – ${l.fomDato || '?'} til ${l.tomDato || '?'}`
}

export function forstegangstjenesteKortLabel(
  l: ForstegangstjenesteDTO,
  opptjeningstyper: OpptjeningstyperResponse,
): string {
  return `${typeLabel(opptjeningstyper, l.tjenesteType)} (${l.fomDato?.slice(0, 4) ?? '?'})`
}

export function oppsummeringForKategori<T extends { _id: string; _status: LinjeStatus }>(
  kategori: string,
  linjer: T[],
  format: {
    label: (linje: T) => string
    kortLabel?: (linje: T) => string
    endringer?: (linje: T) => string[]
  },
): (status: LinjeStatus) => EndringSummaryItem[] {
  return status =>
    linjer
      .filter(linje => linje._status === status)
      .map(linje => ({
        id: linje._id,
        kategori,
        label: (status === 'modified' && format.kortLabel ? format.kortLabel : format.label)(linje),
        endringer: status === 'modified' ? format.endringer?.(linje) : undefined,
      }))
}

export function byggEndringSummary(
  linjer: {
    inntekt: InntektLinjeState[]
    dagpenger: DagpengerLinjeState[]
    omsorg: OmsorgLinjeState[]
    forstegangstjeneste: ForstegangstjenesteLinjeState[]
  },
  opptjeningstyper: OpptjeningstyperResponse,
): EndringSummary {
  // Omsorgslinjer kan kun slettes, derfor ingen kortLabel/endringer.
  const kategorier = [
    oppsummeringForKategori('Inntekt', linjer.inntekt, {
      label: l => inntektLabel(l, opptjeningstyper),
      kortLabel: l => inntektKortLabel(l, opptjeningstyper),
      endringer: l => inntektEndringer(l, opptjeningstyper),
    }),
    oppsummeringForKategori('Dagpenger', linjer.dagpenger, {
      label: l => dagpengerLabel(l, opptjeningstyper),
      kortLabel: l => dagpengerKortLabel(l, opptjeningstyper),
      endringer: l => dagpengerEndringer(l, opptjeningstyper),
    }),
    oppsummeringForKategori('Omsorg', linjer.omsorg, {
      label: l => omsorgLabel(l, opptjeningstyper),
    }),
    oppsummeringForKategori('Førstegangstjeneste', linjer.forstegangstjeneste, {
      label: l => forstegangstjenesteLabel(l, opptjeningstyper),
      kortLabel: l => forstegangstjenesteKortLabel(l, opptjeningstyper),
      endringer: l => forstegangstjenesteEndringer(l, opptjeningstyper),
    }),
  ]

  return {
    nye: kategorier.flatMap(oppsummer => oppsummer('new')),
    endrede: kategorier.flatMap(oppsummer => oppsummer('modified')),
    slettede: kategorier.flatMap(oppsummer => oppsummer('deleted')),
  }
}

const STATUS_FRA_ENDRINGSTYPE: Record<Endringstype, LinjeStatus> = {
  OPPRETT: 'new',
  OPPDATER: 'modified',
  SLETT: 'deleted',
}

/**
 * Bygger samme oppsummering som redigeringsskjemaet, men fra en lagret vurdering.
 * `grunnlag` er opptjeningsgrunnlaget slik det var før endringene, og brukes til å
 * finne «fra»-verdiene for endrede linjer. Uten grunnlag vises kun «til»-verdiene.
 */
export function endringSummaryFraVurdering(
  vurdering: OppdaterOpptjeningVurdering | null | undefined,
  grunnlag: OppdaterOpptjeningGrunnlag['opptjeningsGrunnlagDto'] | null | undefined,
  opptjeningstyper: OpptjeningstyperResponse,
): EndringSummary {
  const originaleInntekter = new Map<number, InntektDTO>()
  for (const i of grunnlag?.inntektListe ?? []) {
    if (i.inntektId != null) originaleInntekter.set(i.inntektId, inntektGrunnlagTilViewModel(i))
  }

  const originaleDagpenger = new Map<number, DagpengerDTO>()
  for (const d of grunnlag?.dagpengerListe ?? []) {
    if (d.dagpengerId != null) originaleDagpenger.set(d.dagpengerId, dagpengerGrunnlagTilViewModel(d))
  }

  const originaleForstegangstjenester = forstegangstjenesteGrunnlagTilViewModel(grunnlag?.forstegangstjeneste)

  const inntekt: InntektLinjeState[] = (vurdering?.inntektEndringer ?? []).flatMap((endring, ei) =>
    endring.inntektListe.map((dto, li) => {
      const linje = inntektGrunnlagTilViewModel(dto)
      return {
        ...linje,
        _id: `inntekt-${ei}-${li}`,
        _status: STATUS_FRA_ENDRINGSTYPE[endring.endringstype],
        _original: linje.inntektId != null ? (originaleInntekter.get(linje.inntektId) ?? null) : null,
      }
    }),
  )

  const dagpenger: DagpengerLinjeState[] = (vurdering?.dagpengerEndringer ?? []).flatMap((endring, ei) =>
    endring.dagpengerListe.map((dto, li) => {
      const linje = dagpengerGrunnlagTilViewModel(dto)
      return {
        ...linje,
        _id: `dagpenger-${ei}-${li}`,
        _status: STATUS_FRA_ENDRINGSTYPE[endring.endringstype],
        _original: linje.dagpengerId != null ? (originaleDagpenger.get(linje.dagpengerId) ?? null) : null,
      }
    }),
  )

  const omsorg: OmsorgLinjeState[] = (vurdering?.omsorgEndringer ?? []).flatMap((endring, ei) =>
    endring.omsorgListe.map((dto, li) => ({
      ...omsorgGrunnlagTilViewModel(dto),
      _id: `omsorg-${ei}-${li}`,
      _status: STATUS_FRA_ENDRINGSTYPE[endring.endringstype],
      _original: null,
    })),
  )

  const forstegangstjeneste: ForstegangstjenesteLinjeState[] = (vurdering?.forstegangstjenesteEndringer ?? []).flatMap(
    (endring, ei) =>
      forstegangstjenesteGrunnlagTilViewModel(endring.forstegangstjeneste).map((linje, li) => {
        const kandidater = originaleForstegangstjenester.filter(
          o => o.forstegangstjenesteId != null && o.forstegangstjenesteId === linje.forstegangstjenesteId,
        )
        return {
          ...linje,
          _id: `forstegangstjeneste-${ei}-${li}`,
          _status: STATUS_FRA_ENDRINGSTYPE[endring.endringstype],
          _original: kandidater.length === 1 ? kandidater[0] : null,
        }
      }),
  )

  return byggEndringSummary({ inntekt, dagpenger, omsorg, forstegangstjeneste }, opptjeningstyper)
}

export function toInntektBackend(l: InntektLinjeState, fnr: string): InntektBackendDTO {
  return {
    inntektId: l.inntektId ?? null,
    fnr,
    kilde: KILDE,
    kommune: l.kommune ?? null,
    piMerke: null,
    inntektAr: Number(l.inntektAr),
    belop: l.belop != null ? String(Number(l.belop)) : null,
    inntektType: l.inntektType,
  }
}

export function toDagpengerBackend(l: DagpengerLinjeState, fnr: string): DagpengerBackendDTO {
  const isFF = l.dagpengerType === 'DP_FF'
  return {
    dagpengerId: l.dagpengerId ?? null,
    fnr,
    dagpengerType: l.dagpengerType,
    kilde: KILDE,
    ar: Number(l.ar),
    utbetalteDagpenger: l.utbetalteDagpenger != null ? Number(l.utbetalteDagpenger) : null,
    uavkortetDagpengegrunnlag: isFF
      ? null
      : l.uavkortetDagpengegrunnlag != null
        ? Number(l.uavkortetDagpengegrunnlag)
        : null,
    ferietillegg: isFF ? null : l.ferietillegg != null ? Number(l.ferietillegg) : null,
    barnetillegg: l.barnetillegg != null ? Number(l.barnetillegg) : null,
  }
}

export function toOmsorgBackend(l: OmsorgLinjeState, fnr: string): OmsorgBackendDTO {
  return {
    omsorgId: l.omsorgId ?? null,
    fnr,
    fnrOmsorgFor: l.fnrOmsorgFor ?? null,
    omsorgType: l.omsorgType,
    kilde: KILDE,
    ar: Number(l.ar),
  }
}

export function toForstegangstjenesteBackend(
  l: ForstegangstjenesteLinjeState,
  fnr: string,
): ForstegangstjenesteBackendDTO {
  return {
    forstegangstjenesteId: l.forstegangstjenesteId ?? null,
    fnr,
    kilde: KILDE,
    tjenestestartDato: l.fomDato || null,
    dimitteringDato: l.tomDato || null,
    forstegangstjenestePeriodeListe: [
      {
        forstegangstjenestePeriodeId: null,
        periodeType: l.periodeType ?? null,
        tjenesteType: l.tjenesteType,
        fomDato: l.fomDato || null,
        tomDato: l.tomDato || null,
      },
    ],
  }
}

export function inntektGrunnlagTilViewModel(dto: InntektBackendDTO): InntektDTO {
  return {
    inntektId: dto.inntektId ?? null,
    kommune: dto.kommune ?? null,
    inntektAr: dto.inntektAr ?? 0,
    belop: dto.belop != null ? Number(dto.belop) : null,
    inntektType: dto.inntektType ?? '',
  }
}

export function dagpengerGrunnlagTilViewModel(dto: DagpengerBackendDTO): DagpengerDTO {
  return {
    dagpengerId: dto.dagpengerId ?? null,
    ar: dto.ar ?? 0,
    dagpengerType: dto.dagpengerType ?? '',
    uavkortetDagpengegrunnlag: dto.uavkortetDagpengegrunnlag ?? null,
    utbetalteDagpenger: dto.utbetalteDagpenger ?? null,
    ferietillegg: dto.ferietillegg ?? null,
    barnetillegg: dto.barnetillegg ?? null,
  }
}

export function omsorgGrunnlagTilViewModel(dto: OmsorgBackendDTO): OmsorgDTO {
  return {
    omsorgId: dto.omsorgId ?? null,
    ar: dto.ar ?? 0,
    omsorgType: dto.omsorgType ?? '',
    fnrOmsorgFor: dto.fnrOmsorgFor ?? null,
  }
}

export function forstegangstjenesteGrunnlagTilViewModel(
  dto: ForstegangstjenesteBackendDTO | null | undefined,
): ForstegangstjenesteDTO[] {
  if (!dto) return []
  return (dto.forstegangstjenestePeriodeListe ?? []).map(periode => ({
    forstegangstjenesteId: dto.forstegangstjenesteId ?? null,
    tjenesteType: periode.tjenesteType ?? '',
    periodeType: periode.periodeType ?? null,
    fomDato: periode.fomDato ?? '',
    tomDato: periode.tomDato ?? '',
  }))
}

export function parseIsoDate(iso: string): Date | undefined {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d)
}

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
