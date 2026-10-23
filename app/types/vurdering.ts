export interface VurderingBase {
  begrunnelse?: string | null
}

/**
 * En feil fra siste validering som saksbehandler må rette. Feilene kommer som en liste med vurderingen,
 * og listen er null med mindre aktiviteten venter på saksbehandler.
 */
export interface Valideringsfeil {
  melding: string
  /** Feltet i vurderingen feilen gjelder, eller null hvis den gjelder hele vurderingen. */
  felt: string | null
}
