import { isAfter, isValid, parseISO } from 'date-fns'
import type { ArMndDager, Kap19Periode, Kap20Periode, PeriodeData, RegistrerTrygdetidVurdering } from './types'

export type Periode = Kap19Periode | Kap20Periode

export type RedigerbarPeriode<T extends Periode> = T & { radId: string }

export type PeriodeStatus = 'UENDRET' | 'ENDRET' | 'LAGT_TIL' | 'FJERNET'

export type PeriodeFeil = Partial<Record<'land' | 'fomDato' | 'tomDato', string>>

const REDIGERBARE_FELTER = ['land', 'fomDato', 'tomDato', 'ikkeProRata', 'poengIInnAr', 'poengIUtAr'] as const

const INGEN_LENGDE: ArMndDager = { ar: 0, mnd: 0, dager: 0 }

export function tilRedigerbarePerioder<T extends Periode>(perioder: T[], prefiks: string): RedigerbarPeriode<T>[] {
  return perioder.map((periode, index) => ({
    ...periode,
    radId:
      periode.trygdetidsgrunnlagId != null ? `${prefiks}-${periode.trygdetidsgrunnlagId}` : `${prefiks}-ny-${index}`,
  }))
}

function nyPeriodeBase(radId: string): RedigerbarPeriode<Kap20Periode> {
  return {
    radId,
    trygdetidsgrunnlagId: null,
    state: 'LAGT_TIL',
    land: '',
    fomDato: null,
    tomDato: null,
    ikkeProRata: false,
    endretAv: null,
    grunnlagKildeCode: 'SAKSB',
    versjon: null,
    lengde: INGEN_LENGDE,
  }
}

export function nyKap19Periode(radId: string): RedigerbarPeriode<Kap19Periode> {
  return { ...nyPeriodeBase(radId), poengIInnAr: false, poengIUtAr: false }
}

export function nyKap20Periode(radId: string): RedigerbarPeriode<Kap20Periode> {
  return nyPeriodeBase(radId)
}

export function oppdaterPeriode<T extends Periode>(
  perioder: RedigerbarPeriode<T>[],
  radId: string,
  endring: Partial<T>,
): RedigerbarPeriode<T>[] {
  return perioder.map(periode => (periode.radId === radId ? { ...periode, ...endring } : periode))
}

export function fjernPeriode<T extends Periode>(
  perioder: RedigerbarPeriode<T>[],
  radId: string,
): RedigerbarPeriode<T>[] {
  return perioder.flatMap(periode => {
    if (periode.radId !== radId) return [periode]
    if (periode.state === 'LAGT_TIL') return []
    return [{ ...periode, state: 'FJERNET' as const }]
  })
}

export function angreFjernPeriode<T extends Periode>(
  perioder: RedigerbarPeriode<T>[],
  radId: string,
): RedigerbarPeriode<T>[] {
  return perioder.map(periode =>
    periode.radId === radId && periode.state === 'FJERNET' ? { ...periode, state: 'UENDRET' } : periode,
  )
}

export function finnPeriodeStatus<T extends Periode>(periode: T, original: T | undefined): PeriodeStatus {
  if (periode.state === 'LAGT_TIL' || periode.state === 'FJERNET') return periode.state
  if (!original) return 'UENDRET'
  const erEndret = REDIGERBARE_FELTER.some(
    felt => (periode as Partial<Kap19Periode>)[felt] !== (original as Partial<Kap19Periode>)[felt],
  )
  return erEndret ? 'ENDRET' : 'UENDRET'
}

export function validerPeriode(periode: Periode): PeriodeFeil {
  if (periode.state === 'FJERNET') return {}

  const feil: PeriodeFeil = {}
  const fom = periode.fomDato ? parseISO(periode.fomDato) : null
  const tom = periode.tomDato ? parseISO(periode.tomDato) : null

  if (!periode.land.trim()) feil.land = 'Land må fylles ut'
  if (!fom || !isValid(fom)) feil.fomDato = 'Fra og med må fylles ut'
  if (!tom || !isValid(tom)) feil.tomDato = 'Til og med må fylles ut'
  if (fom && tom && isValid(fom) && isValid(tom) && isAfter(fom, tom)) {
    feil.tomDato = 'Til og med kan ikke være før fra og med'
  }

  return feil
}

export function harFeil(perioder: Periode[]): boolean {
  return perioder.some(periode => Object.keys(validerPeriode(periode)).length > 0)
}

function utenRadId<T extends Periode>({ radId: _radId, ...periode }: RedigerbarPeriode<T>): T {
  return periode as unknown as T
}

export function leggSammenLengde(a: ArMndDager, b: ArMndDager): ArMndDager {
  return { ar: a.ar + b.ar, mnd: a.mnd + b.mnd, dager: a.dager + b.dager }
}

export function totalLengde(perioder: Periode[]): ArMndDager {
  return perioder
    .filter(periode => periode.state !== 'FJERNET')
    .reduce((sum, periode) => leggSammenLengde(sum, periode.lengde), INGEN_LENGDE)
}

function tilPeriodeData<T extends Periode>(perioder: RedigerbarPeriode<T>[]): PeriodeData<T> {
  return { perioder: perioder.map(utenRadId), lengde: totalLengde(perioder) }
}

export function tilVurderingPayload(
  kap19Perioder: RedigerbarPeriode<Kap19Periode>[],
  kap20Perioder: RedigerbarPeriode<Kap20Periode>[],
): RegistrerTrygdetidVurdering {
  const kapittel19 = tilPeriodeData(kap19Perioder)
  const kapittel20 = tilPeriodeData(kap20Perioder)
  return { kapittel19, kapittel20, lengde: leggSammenLengde(kapittel19.lengde, kapittel20.lengde) }
}

function erPeriodeData(verdi: unknown): verdi is PeriodeData<never> {
  return !!verdi && typeof verdi === 'object' && Array.isArray((verdi as PeriodeData<unknown>).perioder)
}

function tilVurdering(verdi: unknown): RegistrerTrygdetidVurdering | null {
  if (!verdi || typeof verdi !== 'object') return null
  const { kapittel19, kapittel20, lengde } = verdi as Partial<RegistrerTrygdetidVurdering>
  if (!erPeriodeData(kapittel19) || !erPeriodeData(kapittel20) || !lengde) return null
  return { kapittel19, kapittel20, lengde }
}

function parseJson(verdi: string): unknown {
  try {
    return JSON.parse(verdi)
  } catch {
    return null
  }
}

export function parseVurdering(verdi: FormDataEntryValue | null): RegistrerTrygdetidVurdering | null {
  if (typeof verdi !== 'string') return null
  return tilVurdering(parseJson(verdi))
}
