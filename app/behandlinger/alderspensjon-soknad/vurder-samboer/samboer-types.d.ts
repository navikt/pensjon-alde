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
  type: 'RegoppslagAdresse'
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
  type: 'Vegadresse'
}

export type Bostedsadresse = RegoppslagAdresse | Vegadresse

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

export type Vurdering = 'VURDERT' | 'VENTER' | 'AVBRUTT'

export interface SamboerVurdering {
  virkFom: string | null // ISO-dato (LocalDate)
  tidligereEktefeller: boolean
  harFellesBarn: boolean
  vurdert: Vurdering
}
