import type { VurderingBase } from '~/types/vurdering'

export interface OpptjeningChangeStamp {
  createdBy: string | null
  createdDate: string | null // LocalDate
  updatedBy: string | null
  updatedDate: string | null // LocalDate
}

export interface Inntekt {
  inntektId: number | null
  fnr: string | null
  kilde: string | null
  kommune: string | null
  piMerke: string | null
  inntektAr: number | null
  belop: number | null
  changeStamp: OpptjeningChangeStamp | null
  inntektType: string | null
}

export interface Omsorg {
  omsorgId: number | null
  fnr: string | null
  fnrOmsorgFor: string | null
  omsorgType: string | null
  kilde: string | null
  ar: number | null
  changeStamp: OpptjeningChangeStamp | null
}

export interface Pensjonspoeng {
  pensjonspoengId: number | null
  fnr: string | null
  fnrOmsorgFor: string | null
  kilde: string | null
  pensjonspoengType: string | null // OpptjeningTypeCode
  inntekt: Inntekt | null
  omsorg: Omsorg | null
  ar: number | null
  anvendtPi: number | null
  poeng: number | null
  maxUforegrad: number | null
  changeStamp: OpptjeningChangeStamp | null
}

/**
 * Pensjonsbeholdning (PEN_B) fra POPP. Kun feltene som brukes i frontend er typet ut;
 * nøstede opptjeningsbeløp er tilgjengelige i debug-visningen.
 */
export interface Beholdning {
  beholdningId: number | null
  fnr: string | null
  status: string | null
  beholdningType: string | null
  belop: number | null
  vedtakId: number | null
  fomDato: string | null // LocalDate
  tomDato: string | null // LocalDate
  beholdningGrunnlag: number | null
  beholdningGrunnlagAvkortet: number | null
  beholdningInnskudd: number | null
  beholdningInnskuddUtenOmsorg: number | null
  oppdateringArsak: string | null
  lonnsvekstregulering: Record<string, unknown> | null
  inntektOpptjeningBelop: Record<string, unknown> | null
  omsorgOpptjeningBelop: Record<string, unknown> | null
  dagpengerOpptjeningBelop: Record<string, unknown> | null
  forstegangstjenesteOpptjeningBelop: Record<string, unknown> | null
  uforeOpptjeningBelop: Record<string, unknown> | null
  changeStamp: OpptjeningChangeStamp | null
}

export interface SendEosSkjemaTilSokerGrunnlag {
  beholdning: Beholdning[]
  pensjonspoeng: Pensjonspoeng[]
}

export type SendEosSkjemaTilSokerVurdering = VurderingBase
