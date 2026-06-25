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

export type FørstegangstjenesteDTO = {
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
    forstegangstjenesteListe?: FørstegangstjenesteDTO[]
  }
}

export type OppdaterOpptjeningVurdering = {
  sakId?: number
  inntektListe?: InntektDTO[]
  dagpengerListe?: DagpengerDTO[]
  omsorgListe?: OmsorgDTO[]
  forstegangstjenesteListe?: FørstegangstjenesteDTO[]
}
