export type OpptjeningTypeKode = {
  code: string
  description: string
}

export type OpptjeningstyperKategori = {
  typer: OpptjeningTypeKode[]
  subTyper: OpptjeningTypeKode[]
}

export type OpptjeningstyperResponse = {
  inntekt: OpptjeningstyperKategori
  omsorg: OpptjeningstyperKategori
  dagpenger: OpptjeningstyperKategori
  forstegangstjeneste: OpptjeningstyperKategori
}

export type InntektDTO = {
  inntektId?: number | null
  kilde?: string | null
  kommune?: string | null
  inntektAr: number
  belop?: number | null
  inntektType: string
}

export type DagpengerDTO = {
  opptjeningId?: number | null
  kilde?: string | null
  inntektAr: number
  inntektType: string
  uavkortetDagpengegrunnlag?: number | null
  utbetalteDagpenger?: number | null
  ferietillegg?: number | null
  barnetillegg?: number | null
}

export type OmsorgDTO = {
  opptjeningId?: number | null
  kilde?: string | null
  inntektAr: number
  inntektType: string
  belop?: number | null
}

export type ForstegangstjenesteDTO = {
  opptjeningId?: number | null
  kilde?: string | null
  inntektType: string
  periodeType?: string | null
  fom: string
  tom: string
}

export type OppdaterPgiSakValg = {
  sakId: number
  sakType?: string | null
  sakStatus?: string | null
}

export type OppdaterOpptjeningGrunnlag = {
  saker?: OppdaterPgiSakValg[]
  kanOppretteGenerellSak?: boolean
  opptjeningsGrunnlagDto?: {
    fnr: string
    inntektListe?: InntektDTO[]
    dagpengerListe?: DagpengerDTO[]
    omsorgListe?: OmsorgDTO[]
    forstegangstjenesteListe?: ForstegangstjenesteDTO[]
  }
}

export type OppdaterOpptjeningVurdering = {
  sakId?: number
  fnr?: string
  inntektEndringer?: { endringstype: Endringstype; inntektListe: InntektBackendDTO[] }[]
  dagpengerEndringer?: { endringstype: Endringstype; dagpengerListe: DagpengerBackendDTO[] }[]
  omsorgEndringer?: { endringstype: Endringstype; omsorgListe: OmsorgBackendDTO[] }[]
  forstegangstjenesteEndringer?: { endringstype: Endringstype; forstegangstjeneste: ForstegangstjenesteBackendDTO }[]
}

export type HentetVurdering = {
  sakId?: number
  inntektListe?: InntektDTO[]
  dagpengerListe?: DagpengerDTO[]
  omsorgListe?: OmsorgDTO[]
  forstegangstjenesteListe?: ForstegangstjenesteDTO[]
}

export type Endringstype = 'OPPRETT' | 'OPPDATER' | 'SLETT'

export type InntektBackendDTO = {
  inntektId?: number | null
  fnr: string
  kilde?: string | null
  kommune?: string | null
  piMerke?: string | null
  inntektAr: number
  belop?: string | null
  inntektType: string
}

export type DagpengerBackendDTO = {
  dagpengerId?: number | null
  fnr: string
  dagpengerType: string
  rapportType?: string | null
  kilde?: string | null
  ar: number
  utbetalteDagpenger?: string | null
  uavkortetDagpengegrunnlag?: string | null
  ferietillegg?: string | null
  barnetillegg?: string | null
}

export type OmsorgBackendDTO = {
  omsorgId?: number | null
  fnr: string
  fnrOmsorgFor?: string | null
  omsorgType: string
  kilde?: string | null
  ar: number
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
    fomDato: string
    tomDato: string
  }[]
}
