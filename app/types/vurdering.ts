export interface VurderingBase {
  begrunnelse?: string | null
}

/**
 * Resultatet av siste validering. Kommer som `validering` med vurderingen,
 * og er null med mindre aktiviteten venter på saksbehandler.
 */
export interface Validering {
  feil: Valideringsfeil[]
}

/** En feil fra siste validering som saksbehandler må rette. */
export interface Valideringsfeil {
  melding: string
  /** Feltet i vurderingen feilen gjelder, eller null hvis den gjelder hele vurderingen. */
  felt: string | null
}
