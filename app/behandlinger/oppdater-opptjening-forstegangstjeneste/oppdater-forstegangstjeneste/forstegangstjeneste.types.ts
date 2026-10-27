export type LinjeStatus = 'original' | 'new' | 'modified' | 'deleted'

export type ActionErrors = { _form?: string; _server?: string[] }

export type SakValg = {
  sakId: number
  sakType?: string | null
  sakStatus?: string | null
}

export type Opptjeningstype = { code: string; description: string }

export type ForstegangstjenestePeriodeDTO = {
  periodeType: string | null
  tjenesteType: string | null
  fomDato: string | null
  tomDato: string | null
}

export type ForstegangstjenesteDTO = {
  forstegangstjenesteId?: number | null
  rapportType?: string | null
  kilde?: string | null
  tjenestestartDato?: string | null
  dimitteringDato?: string | null
  forstegangstjenestePeriodeListe?: ForstegangstjenestePeriodeDTO[]
}

export type ForstegangstjenesteGrunnlag = {
  saker?: SakValg[]
  forstegangstjeneste?: ForstegangstjenesteDTO | null
  tjenestetyper?: Opptjeningstype[]
  periodetyper?: Opptjeningstype[]
}

export type ForstegangstjenestePeriodeTilLagring = {
  periodeType: string
  tjenesteType: string
  fomDato: string
  tomDato: string
}

export type ForstegangstjenesteTilLagring = {
  tjenestestartDato: string
  dimitteringDato: string
  forstegangstjenestePeriodeListe: ForstegangstjenestePeriodeTilLagring[]
}

export type ForstegangstjenesteVurdering = {
  sakId?: number
  fnr: string
  forstegangstjenesteTilLagring?: ForstegangstjenesteTilLagring | null
  slettForstegangstjeneste?: boolean
}

export type TjenesteDTO = { tjenestestartDato: string | null; dimitteringDato: string | null }

export type TjenesteLinje = TjenesteDTO & { _id: string; _status: LinjeStatus; _original: TjenesteDTO | null }

export type PeriodeLinje = ForstegangstjenestePeriodeDTO & {
  _id: string
  _status: LinjeStatus
  _original: ForstegangstjenestePeriodeDTO | null
}
