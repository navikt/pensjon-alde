import type { BehandlingDTO } from '~/types/behandling'
import type { Fetcher } from '../api-client'
import type { Attesteringsdata } from './types'

export function behandlingApi(fetch: Fetcher) {
  const hentBehandling = () => fetch<BehandlingDTO>('', { method: 'GET' })

  const hentAttesteringsdata = () => fetch<Attesteringsdata>('/attesteringsdata', { method: 'GET' })

  return {
    hentBehandling,
    hentAttesteringsdata,
  }
}
