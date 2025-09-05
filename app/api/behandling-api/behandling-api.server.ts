import type { Fetcher } from '../api-client'

export function behandlingApi(fetch: Fetcher) {
  const hentBehandling = <T>() => fetch<T>('', { method: 'GET' })

  return {
    hentBehandling,
  }
}
