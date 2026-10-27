export type LinjeStatus = 'original' | 'new' | 'modified' | 'deleted'

export type ActionErrors = { _form?: string; _server?: string[] }

export type SakValg = {
  sakId: number
  sakType?: string | null
  sakStatus?: string | null
}

export type Dagpengertype = { code: string; description: string }

export type DagpengerDTO = {
  dagpengerId?: number | null
  ar: number | null
  dagpengerType: string | null
  rapportType?: string | null
  kilde?: string | null
  utbetalteDagpenger: number | null
  uavkortetDagpengegrunnlag?: number | null
  ferietillegg?: number | null
  barnetillegg: number | null
}

export type DagpengerTilLagring = {
  ar: number
  dagpengerType: string
  utbetalteDagpenger: number
  uavkortetDagpengegrunnlag?: number | null
  ferietillegg?: number | null
  barnetillegg: number
}

export type DagpengerTilSletting = { ar: number; dagpengerType: string }

export type DagpengerGrunnlag = {
  saker?: SakValg[]
  dagpengerListe?: DagpengerDTO[]
  dagpengertyper?: Dagpengertype[]
}

export type DagpengerVurdering = {
  sakId?: number
  fnr: string
  dagpengerTilLagring: DagpengerTilLagring[]
  dagpengerTilSletting: DagpengerTilSletting[]
}

export type DagpengerLinje = DagpengerDTO & {
  _id: string
  _status: LinjeStatus
  _original: DagpengerDTO | null
  _skjulteVerdier?: Pick<DagpengerDTO, 'uavkortetDagpengegrunnlag' | 'ferietillegg'>
}
