import type { VurderingBase } from '~/types/vurdering'
import type { Bostedsadresse, NavnTilPerson, SamboerType } from '../vurder-samboer/samboer-types'

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
  navn: NavnTilPerson
  bostedsadresser: Bostedsadresse[]
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

export const VURDERT_SIVILSTAND_KORT_TEKST: Record<VurdertSivilstand, string> = {
  LEVER_ADSKILT: 'Enslig',
  LEVER_SAMMEN: 'Gift',
}

// Gjenbruker begrepene fra samboervurderingen (vurder-samboer). Faglig tekst er ikke endelig avklart.
export const SAMBOERSKAP_VURDERING_TEKST: Record<SamboerType, string> = {
  SAMBOER_1_5: '§ 1-5 samboer',
  SAMBOER_3_2: '§ 3-2 samboer',
  IKKE_SAMBOER: 'Ikke samboer',
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
  | {
      utfall: 'SAMBOERSKAP_VURDERT'
      sakstype: Sakstype
      vurdering: SamboerType
      fom: string
    }

export type SokerInformasjon = {
  fnr: string
  navn: NavnTilPerson
}

export type VarigAdskiltGrunnlag = {
  soker: SokerInformasjon
  sokersBostedsadresser: Bostedsadresse[]
  sokerSivilstand: SivilstandType
  ektefellePartner: EktefellePartnerInformasjon
}

export type VurdertSivilstand = 'LEVER_ADSKILT' | 'LEVER_SAMMEN'

export type VarigAdskiltVurdering = VurderingBase & {
  fom: string | null
  vurdertSivilstand: VurdertSivilstand
}
