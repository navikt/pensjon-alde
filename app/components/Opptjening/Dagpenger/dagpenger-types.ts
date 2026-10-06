export type DagpengerDTO = {
  dagpengerId?: number | null
  ar: number
  dagpengerType: string
  uavkortetDagpengegrunnlag?: number | null
  utbetalteDagpenger?: number | null
  ferietillegg?: number | null
  barnetillegg?: number | null
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
