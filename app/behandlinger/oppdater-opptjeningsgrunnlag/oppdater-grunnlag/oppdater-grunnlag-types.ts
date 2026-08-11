export type { OpptjeningstyperKategori, OpptjeningstyperResponse, OpptjeningTypeKode } from '~/types/opptjeningstyper'

export type InntektDTO = {
  inntektId?: number | null
  kommune?: string | null
  inntektAr: number
  belop?: number | null
  inntektType: string
}

export type DagpengerDTO = {
  dagpengerId?: number | null
  ar: number
  dagpengerType: string
  uavkortetDagpengegrunnlag?: number | null
  utbetalteDagpenger?: number | null
  ferietillegg?: number | null
  barnetillegg?: number | null
}

export type OmsorgDTO = {
  omsorgId?: number | null
  ar: number
  omsorgType: string
  fnrOmsorgFor?: string | null
}

export type ForstegangstjenesteDTO = {
  forstegangstjenesteId?: number | null
  tjenesteType: string
  periodeType?: string | null
  fomDato: string
  tomDato: string
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
    fnr: string | null
    inntektListe: InntektBackendDTO[]
    omsorgListe: OmsorgBackendDTO[]
    dagpengerListe: DagpengerBackendDTO[]
    forstegangstjeneste?: ForstegangstjenesteBackendDTO | null
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

export type VurderingResponse = {
  vurdering: string | null
  vurdertTidspunkt?: string | null
  vurdertAvBrukerId?: string | null
  vurdertAvBrukerNavn?: string | null
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
  utbetalteDagpenger?: number | null
  uavkortetDagpengegrunnlag?: number | null
  ferietillegg?: number | null
  barnetillegg?: number | null
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
    fomDato?: string | null
    tomDato?: string | null
  }[]
}
