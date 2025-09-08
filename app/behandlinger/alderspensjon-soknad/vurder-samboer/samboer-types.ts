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

export interface PersongrunnlagDto {
  personGrunnlagId: number
  fnr: string
  navnTilPerson: NavnTilPerson
  tidligereGiftMedSoker: boolean | null
  bostedsadresser: Bostedsadresse[]
  fellesBarnMedSoker: boolean
  datoEldsteBarnMedSoker: string | null
}

export interface Link {
  href: string
}

export interface Links {
  self: Link
  lagreVurdering: Link
}

export interface SamboerInformasjonHolder {
  type: 'FleksibelApSakBehandlingSamboerInformasjonHolder'
  sokerPersongrunnlagListeDto: PersongrunnlagDto[]
  epsPersongrunnlagListeDto: PersongrunnlagDto[]
  _links: Links
}

export interface SamboerVurdering {
  virkFom: string | null
  tidligereEktefeller: boolean | null
  harFellesBarn: boolean | null
  vurdert: string | null
}
