import type { OpptjeningTypeKode } from './opptjening.types'

export type InntektFraFilDTO = {
  inntektsType: string
  belopLoenn?: number | null
  belopNaering?: number | null
  belopJsf?: number | null
}

export type PensjonsgivendeInntektDTO = {
  inntektsType: string
  belopLoennsinntekt?: number | null
  belopLoennsinntektBarePensjonsdel?: number | null
  belopNaeringsinntekt?: number | null
  belopNaeringsinntektFraFiskeFangstEllerFamiliebarnehage?: number | null
}

export type AnnenInntektDTO = {
  inntektsType: string
  belop?: number | null
}

export type InntektPerArDTO = {
  inntektAr: number
  inntekterFilformat?: InntektFraFilDTO[]
  inntekterPgi?: PensjonsgivendeInntektDTO[]
  inntekterAnnet?: AnnenInntektDTO[]
}

export type InntektsoversiktDTO = {
  fnr?: string | null
  inntekterPerAr?: InntektPerArDTO[]
}

export type Inntektstyper = {
  pensjonsgivendeInntekt?: OpptjeningTypeKode[]
  inntektFraFil?: OpptjeningTypeKode[]
  annenInntekt?: OpptjeningTypeKode[]
}

export type OppdaterInntektGrunnlag = {
  inntektsoversikt?: InntektsoversiktDTO | null
  inntektstyper?: Inntektstyper | null
}

export type ErstattInntektPerArDTO = {
  inntektAr: number
  inntekterFilformat: InntektFraFilDTO[]
  inntekterPgi: PensjonsgivendeInntektDTO[]
}

export type OppdaterInntektVurdering = {
  inntekterPerAr?: ErstattInntektPerArDTO[]
}

export type InntektKategori = 'pgi' | 'filformat' | 'annet'

export type BelopFelt =
  | 'belopLoennsinntekt'
  | 'belopLoennsinntektBarePensjonsdel'
  | 'belopNaeringsinntekt'
  | 'belopNaeringsinntektFraFiskeFangstEllerFamiliebarnehage'
  | 'belopLoenn'
  | 'belopNaering'
  | 'belopJsf'
  | 'belop'

export type InntektLinje = {
  kategori: InntektKategori
  inntektAr: string
  inntektsType: string
} & Partial<Record<BelopFelt, string>>

export type InntektFelt = 'inntektAr' | 'inntektsType' | BelopFelt

export type InntektFeilFelt = InntektFelt | '_belop' | '_duplikat'

export type InntektFeil = Partial<Record<InntektFeilFelt, string>>
