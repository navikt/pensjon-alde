export type OmsorgGrunnlagDTO = {
  omsorgId?: number | null
  fnrOmsorgFor?: string | null
  omsorgType: string
  kilde?: string | null
  ar: number
}

export type OmsorgTilSlettingDTO = {
  ar: number
  omsorgType: string
}
