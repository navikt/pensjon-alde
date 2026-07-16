import type { OpptjeningstyperResponse } from '~/types/opptjeningstyper'
import { env } from '~/utils/env.server'
import { fetcher } from './api-client'

export function fetchOpptjeningstyper(request: Request) {
  const fetch = fetcher(`${env.penUrl}/api/saksbehandling/oppdater-opptjeningsgrunnlag`, request)
  return fetch<OpptjeningstyperResponse>('/opptjeningstyper', { method: 'GET' })
}
