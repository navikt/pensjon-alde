export type OmsorgDTO = {
  omsorgId?: number | null
  ar: number
  omsorgType: string
  fnrOmsorgFor?: string | null
}

export type OmsorgBackendDTO = {
  omsorgId?: number | null
  fnr: string
  fnrOmsorgFor?: string | null
  omsorgType: string
  kilde?: string | null
  ar: number
}
