import type { AktivitetDTO, BehandlingDTO } from './behandling'

/**
 * The context type passed via Outlet context for aktivitet routes.
 * Provides both the current behandling and aktivitet.
 */
export interface AktivitetOutletContext {
  behandling: BehandlingDTO
  aktivitet: AktivitetDTO
}
