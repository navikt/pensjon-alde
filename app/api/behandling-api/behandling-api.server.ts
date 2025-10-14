import type { BehandlingDTO } from '~/types/behandling'
import type { Fetcher } from '../api-client'
import type { Attesteringsdata } from './types'

export function behandlingApi(fetch: Fetcher) {
  const avbrytBehandling = (request: AvbrytVurderingRequest) =>
    fetch<void>('/avbryt', { method: 'POST', body: JSON.stringify(request) })

  const hentBehandling = () => fetch<BehandlingDTO>('', { method: 'GET' })

  const hentAttesteringsdata = () => fetch<Attesteringsdata>('/attesteringsdata', { method: 'GET' })

  const attester = () => fetch<void>('/attester', { method: 'POST' })

  return {
    avbrytBehandling,
    hentBehandling,
    hentAttesteringsdata,
    attester,
  }
}

export type AvbrytVurderingRequest = {
  vistAktivitetId?: number | null
  begrunnelse?: string | null
}
