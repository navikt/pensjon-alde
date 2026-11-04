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

export const VURDERT_SIVILSTAND_TEKST: Record<VurdertSivilstand, string> = {
  LEVER_ADSKILT: 'Vurdert som enslig',
  LEVER_SAMMEN: 'Vurdert som gift',
}

export type AnnenEpsRolle = 'EKTEF' | 'PARTNER' | 'SAMBO'

export const ANNEN_EPS_TEKST: Record<AnnenEpsRolle, string> = {
  EKTEF: 'Gift med annen person',
  PARTNER: 'Partner med annen person',
  SAMBO: 'Samboer med annen person',
}

export type SivilstandIEktefellePartnersSak =
  | { utfall: 'INGEN_LOPENDE_YTELSE' }
  | {
      utfall: 'EKTEFELLE_PARTNER_REGISTRERT_MED_ANNEN_EPS_ENN_SØKER'
      sakstype: Sakstype
      grunnlagsrolle: AnnenEpsRolle
    }
  | { utfall: 'INGEN_EPS_REGISTRERT'; sakstype: Sakstype }
  | {
      utfall: 'VURDERT'
      sakstype: Sakstype
      grunnlagsrolle: 'EKTEF' | 'PARTNER'
      vurdering: VurdertSivilstand
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
