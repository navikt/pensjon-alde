import type { VurderingBase } from '~/types/vurdering'

export interface UtenlandsoppholdChangeStamp {
  createdDate: string | null // LocalDate
  createdBy: string | null
  updatedDate: string | null // LocalDate
  updatedBy: string | null
}

export interface Utenlandsopphold {
  utenlandsoppholdId: number | null
  fom: string | null // LocalDate
  tom: string | null // LocalDate
  land: string | null // LandKode (enum-navn, f.eks. "SWE")
  pensjonsordning: string | null
  bodd: boolean | null
  arbeidet: boolean | null
  persongrunnlagId: number | null
  version: number | null
  changeStamp: UtenlandsoppholdChangeStamp | null
}

export interface UtenlandsoppholdGrunnlag {
  utenlandsopphold: Utenlandsopphold[]
}

export type UtenlandsoppholdVurdering = VurderingBase
