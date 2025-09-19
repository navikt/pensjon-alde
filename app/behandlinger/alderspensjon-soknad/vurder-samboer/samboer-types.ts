export interface NavnTilPerson {
  fornavn: string
  mellomnavn: string | null
  etternavn: string
  forkortetNavn: string
}

export interface AdresseTilleggsdata {
  angittFlyttedato: string | null
  gyldigFraOgMed: string | null
  gyldigTilOgMed: string | null
  coAdressenavn: string | null
  oppholdAnnetSted: string | null
  type: string | null
}

export interface RegoppslagAdresse {
  adresseString: string
  adresselinjer: string[]
  adresseTilleggsdata: AdresseTilleggsdata
  postnummer: string
  poststed: string
  landkode: string
  land: string
  adresseKilde: string
  type: 'RegoppslagAdresseModel'
}

export interface Vegadresse {
  matrikkelId: string | null
  adressenavn: string
  husnummer: string
  husbokstav: string | null
  postnummer: string
  poststed: string
  tilleggsnavn: string | null
  kommunenummer: string
  bruksenhetsnummer: string | null
  bydelsnummer: string | null
  koordinater: unknown | null
  adresseString: string
  adresselinjer: string[]
  adresseTilleggsdata: AdresseTilleggsdata
  id: string | null
  type: 'VegadresseModel'
}

export interface MatrikkelAdresse {
  matrikkelId: string | null
  adresseString: string
  adresselinjer: string[]
  adresseTilleggsdata: AdresseTilleggsdata
  postnummer: string
  poststed: string
  kommunenummer: string
  koordinater: unknown | null
  type: 'MatrikkeladresseModel'
}

export type Bostedsadresse = RegoppslagAdresse | Vegadresse | MatrikkelAdresse

export type Soknad = {
  datoForSamboerskap: string
  harEllerHarHattFellesBarn: boolean
  tidligereEktefelle: boolean
}
export type VurderSamboerGrunnlag = {
  sokersBostedsadresser: Bostedsadresse[]
  samboer: SamboerInformasjon
  soknad: Soknad | null
}

export type SamboerInformasjon = {
  fnr: string
  navn: NavnTilPerson
  bostedsadresser: Bostedsadresse[]
  harEllerHarHattFellesBarn: boolean
  tidligereEktefelle: boolean
}

export interface SamboerVurdering {
  samboerFra: string
  vurdering: 'SAMBOER_1_5' | 'SAMBOER_3_2' | 'IKKE_SAMBOER'
}
