import type { BehandlingDTO } from '~/types/behandling'

export function parseBehandlingEvent(data: unknown): BehandlingDTO | undefined {
  if (typeof data !== 'string') return undefined
  try {
    const event = JSON.parse(data) as BehandlingDTO
    return Number.isSafeInteger(event?.behandlingId) && Array.isArray(event.aktiviteter) ? event : undefined
  } catch {
    return undefined
  }
}
