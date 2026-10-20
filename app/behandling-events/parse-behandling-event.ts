import type { BehandlingDTO } from '~/types/behandling'

/**
 * Parser en behandlingsmelding (JSON) fra Kafka eller SSE. Returnerer `undefined` hvis meldingen
 * ikke kan parses eller mangler felter vi er avhengige av.
 */
export function parseBehandlingEvent(data: unknown): BehandlingDTO | undefined {
  if (typeof data !== 'string') return undefined
  try {
    const event = JSON.parse(data) as BehandlingDTO
    return Number.isSafeInteger(event?.behandlingId) &&
      Number.isSafeInteger(event.totaltAntallGangerKjort) &&
      Array.isArray(event.aktiviteter)
      ? event
      : undefined
  } catch {
    return undefined
  }
}
