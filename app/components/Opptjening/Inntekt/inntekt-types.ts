export type InntektDTO = {
  inntektId?: number | null
  kommune?: string | null
  inntektAr: number
  belop?: number | null
  inntektType: string
}

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
