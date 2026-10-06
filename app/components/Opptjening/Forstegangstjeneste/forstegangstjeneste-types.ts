export type ForstegangstjenesteDTO = {
  forstegangstjenesteId?: number | null
  tjenesteType: string
  periodeType?: string | null
  fomDato: string
  tomDato: string
}

export type ForstegangstjenesteBackendDTO = {
  forstegangstjenesteId?: number | null
  fnr: string
  kilde?: string | null
  rapportType?: string | null
  tjenestestartDato?: string | null
  dimitteringDato?: string | null
  forstegangstjenestePeriodeListe: {
    forstegangstjenestePeriodeId?: number | null
    periodeType?: string | null
    tjenesteType: string
    fomDato?: string | null
    tomDato?: string | null
  }[]
}
