import { env } from '~/utils/env.server'
import { fetcher } from '../api-client'
import { aktivitetApi } from './aktivitet-api.server'

interface AktivitetApiParams {
  request: Request
  behandlingId?: string
  aktivitetId?: string
}

export function createAktivitetApi({ request, behandlingId, aktivitetId }: AktivitetApiParams) {
  if (!behandlingId || !aktivitetId) {
    throw new Error('Missing required parameters')
  }
  const AKTIVITET_API = `${env.penUrl}/api/saksbehandling/alde/behandling/${behandlingId}/aktivitet/${aktivitetId}`

  return aktivitetApi(AKTIVITET_API, fetcher(request))
}
