import type { VurderingBase } from '~/types/vurdering'

export type PeriodeState = 'UENDRET' | 'LAGT_TIL' | 'FJERNET'

export interface ArMndDager {
  ar: number
  mnd: number
  dager: number
}

interface TrygdetidPeriodeBase {
  trygdetidsgrunnlagId: number | null
  state: PeriodeState
  land: string
  fomDato: string | null
  tomDato: string | null
  ikkeProRata: boolean
  endretAv: string | null
  grunnlagKildeCode: string | null
  versjon: number | null
  lengde: ArMndDager
}

export interface Kap19Periode extends TrygdetidPeriodeBase {
  poengIInnAr: boolean
  poengIUtAr: boolean
}

export type Kap20Periode = TrygdetidPeriodeBase

export interface PeriodeData<T> {
  perioder: T[]
  lengde: ArMndDager
}

export interface RegistrerTrygdetidGrunnlag {
  dato16år: string
  dato66årsutgang: string
  kapittel19: PeriodeData<Kap19Periode>
  kapittel20: PeriodeData<Kap20Periode>
  lengde: ArMndDager
}

export interface RegistrerTrygdetidVurdering extends VurderingBase {
  kapittel19: PeriodeData<Kap19Periode>
  kapittel20: PeriodeData<Kap20Periode>
  lengde: ArMndDager
}
