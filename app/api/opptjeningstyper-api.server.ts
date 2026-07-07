import type { OpptjeningstyperResponse } from '~/behandlinger/oppdater-opptjeningsgrunnlag/oppdater-grunnlag/oppdater-grunnlag-types'
import { env } from '~/utils/env.server'
import { fetcher } from './api-client'

export function fetchOpptjeningstyper(request: Request) {
  const fetch = fetcher(`${env.penUrl}/api/saksbehandling/oppdater-opptjeningsgrunnlag`, request)
  return fetch<OpptjeningstyperResponse>('/opptjeningstyper', { method: 'GET' })
}
