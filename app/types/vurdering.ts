export interface VurderingBase {
  begrunnelse?: string | null
  tekstTilVedtaksbrev?: string | null
}

export interface VurderingRequest<T> {
  data: T
  begrunnelse: string | null
  tekstTilVedtaksbrev: string | null
}

export interface VurderingResponse<T> {
  vurdering: T | null
  vurdertTidspunkt: string | null
  vurdertAvBrukerId: string | null
  vurdertAvBrukerNavn: string | null
  begrunnelse: string | null
  tekstTilVedtaksbrev: string | null
  validering: unknown | null
}
