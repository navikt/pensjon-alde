import type { Fetcher } from '../api-client'

export function behandlingApi(BASE_URL: string, fetch: Fetcher) {
  const hentBehandling = <T>() => fetch<T>(`${BASE_URL}`, { method: 'GET' })

  return {
    hentBehandling,
  }
}
