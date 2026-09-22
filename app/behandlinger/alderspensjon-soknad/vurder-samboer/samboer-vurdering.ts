/**
 * MIDLERTIDIG: Håndterer overgangen fra feltnavnet `vurdering` til `samboerType`.
 *
 * Backend kan foreløpig svare med begge feltnavn, og vi sender begge ved lagring
 * slik at både gammel og ny backend forstår payloaden.
 *
 * Når backend konsekvent bruker `samboerType`, kan denne filen fjernes:
 * `normaliserSamboerVurdering` erstattes av direkte lesing av `samboerType`, og
 * `tilSamboerVurderingPayload` erstattes av `submission.value`.
 */
import type {
  NormalisertSamboerVurdering,
  SamboerVurdering,
  SamboerVurderingPayload,
  SamboerVurderingRespons,
} from './samboer-types'

export function normaliserSamboerVurdering(
  respons: SamboerVurderingRespons | null | undefined,
): NormalisertSamboerVurdering | null {
  if (!respons) return null

  const { vurdering, samboerType, ...rest } = respons

  return {
    ...rest,
    samboerType: samboerType ?? vurdering,
  }
}

export function tilSamboerVurderingPayload(vurdering: SamboerVurdering): SamboerVurderingPayload {
  return {
    ...vurdering,
    vurdering: vurdering.samboerType,
  }
}
