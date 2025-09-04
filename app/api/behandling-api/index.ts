import { env } from '~/utils/env.server'
import { fetcher } from '../api-client'
import { behandlingApi } from './behandling-api.server'

interface BehandlingApiParams {
  request: Request
  behandlingId: string
}

export function createBehandlingApi({ request, behandlingId }: BehandlingApiParams) {
  const BEHANDLING_API = `${env.penUrl}/api/saksbehandling/alde/behandling/${behandlingId}`

  return behandlingApi(BEHANDLING_API, fetcher(request))
}
