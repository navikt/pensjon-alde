import type { VurderingBase } from '~/types/vurdering'
import type { Bostedsadresse, NavnTilPerson } from '../vurder-samboer/samboer-types'

export type SivilstandType = 'ENKE' | 'GIFT' | 'GJPA' | 'NULL' | 'REPA' | 'SEPA' | 'SEPR' | 'SKIL' | 'SKPA' | 'UGIF'

export const SIVILSTAND_TEKST: Record<SivilstandType, string> = {
  ENKE: 'Enke/-mann',
  GIFT: 'Gift',
  GJPA: 'Gjenlevende partner',
  NULL: 'Uoppgitt',
  REPA: 'Registrert partner',
  SEPA: 'Separert partner',
  SEPR: 'Separert',
  SKIL: 'Skilt',
  SKPA: 'Skilt partner',
  UGIF: 'Ugift',
}

export type EktefellePartnerInformasjon = {
  fnr: string
  navn: NavnTilPerson | null
  bostedsadresser: Bostedsadresse[] | null
  sivilstand: SivilstandType | null
  sivilstandISak: SivilstandIEktefellePartnersSak
}

export type Sakstype = 'ALDER' | 'UFOREP'

export const SAKSTYPE_TEKST: Record<Sakstype, string> = {
  ALDER: 'Alderspensjon',
  UFOREP: 'Uføretrygd',
}

export type BorMedType =
  | 'GLAD_EKT'
  | 'GLAD_PART'
  | 'N_GIFT'
  | 'N_GIFT_P'
  | 'J_EKTEF'
  | 'J_PARTNER'
  | 'SAMBOER1_5'
  | 'SAMBOER3_2'

export const BOR_MED_TEKST: Record<BorMedType, string> = {
  GLAD_EKT: 'Gift, lever varig adskilt',
  GLAD_PART: 'Partner, lever varig adskilt',
  N_GIFT: 'Gift, lever sammen',
  N_GIFT_P: 'Partner, lever sammen',
  J_EKTEF: 'Gift, lever sammen',
  J_PARTNER: 'Partner, lever sammen',
  SAMBOER1_5: 'Samboer §1-5',
  SAMBOER3_2: 'Samboer §3-2',
}

export const erVarigAdskilt = (borMed: BorMedType) => borMed === 'GLAD_EKT' || borMed === 'GLAD_PART'

export type SivilstandIEktefellePartnersSak =
  | { utfall: 'INGEN_LOPENDE_YTELSE' }
  | { utfall: 'SOKER_IKKE_REGISTRERT_SOM_EPS'; sakstype: Sakstype }
  | {
      utfall: 'VURDERT'
      sakstype: Sakstype
      grunnlagsrolle: 'EKTEF' | 'PARTNER' | 'SAMBO'
      borMed: BorMedType
      sivilstand: SivilstandType
      fom: string
    }

export type VarigAdskiltGrunnlag = {
  sokersBostedsadresser: Bostedsadresse[]
  sokerSivilstand: SivilstandType | null
  ektefellePartner: EktefellePartnerInformasjon | null
}

export type VurdertSivilstand = 'LEVER_ADSKILT' | 'LEVER_SAMMEN'

export type VarigAdskiltVurdering = VurderingBase & {
  ektefellePartnerFnr?: string | null
  fom: string | null
  tom: string | null
  vurdertSivilstand?: VurdertSivilstand | null
}
