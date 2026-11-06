export interface VurderingBase {
  begrunnelse?: string | null
  validering?: Validering | null
}

export interface VurderingRespons<T> {
  vurdering: T | null
  vurdertTidspunkt?: string | null
  vurdertAvBrukerId?: string | null
  vurdertAvBrukerNavn?: string | null
  begrunnelse?: string | null
  validering?: Validering | null
}

export interface Validering {
  feil: { melding: string; felt?: string | null }[]
}

export const valideringsfeilForFelt = (validering: Validering | null | undefined, felt: string) =>
  validering?.feil.find(feil => feil.felt === felt)?.melding
