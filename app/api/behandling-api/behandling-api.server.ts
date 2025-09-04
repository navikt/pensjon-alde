import type { AuthContext } from '~/context'
import type { BehandlingDTO } from '~/types/behandling'
import { env } from '~/utils/env.server'
import { apiFetch } from '../api-client'

function buildUrl(path: string): string {
  return `${env.penUrl}/api/saksbehandling/alde${path}`
}

export async function hentBehandling(behandlingId: string, auth: AuthContext): Promise<BehandlingDTO> {
  return apiFetch<BehandlingDTO>(buildUrl(`/behandling/${behandlingId}`), { method: 'GET' }, auth)
}
