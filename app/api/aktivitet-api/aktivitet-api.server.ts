import type { Fetcher } from '../api-client'
import { isApiError } from '../api-client'

export function aktivitetApi(BASE_URL: string, fetch: Fetcher) {
  const hentAktivitet = <T>() => fetch<T>(`${BASE_URL}`, { method: 'GET' })

  const hentAttestering = <T>() => fetch<T>(`${BASE_URL}/attestering`, { method: 'GET' })

  const lagreAttestering = <T>() => fetch<T>(`${BASE_URL}/attestering`, { method: 'POST' })

  const hentGrunnlagsdata = <T>() => fetch<T>(`${BASE_URL}/grunnlagsdata`, { method: 'GET' })

  const hentInput = <T>() => fetch<T>(`${BASE_URL}/input`, { method: 'GET' })

  const hentVurdering = async <T>() => {
    try {
      return await fetch<T>(`${BASE_URL}/vurdering`, { method: 'GET' })
    } catch (error) {
      if (isApiError(error) && error.data.status === 404) {
        // Returner 404 dersom ikke vurdering er gjort
        return null
      }
      throw error
    }
  }

  const lagreVurdering = <T>(vurdering: T) =>
    fetch<T>(`${BASE_URL}/vurdering`, { method: 'POST', body: JSON.stringify({ data: vurdering }) })

  const hentOutput = <T>() => fetch<T>(`${BASE_URL}/output`, { method: 'GET' })

  const innhentGrunnlagsdata = <T>() => fetch<T>(`${BASE_URL}/innhent-grunnlagsdata`, { method: 'GET' })

  return {
    hentAktivitet,
    hentAttestering,
    hentGrunnlagsdata,
    hentInput,
    hentOutput,
    hentVurdering,
    innhentGrunnlagsdata,
    lagreAttestering,
    lagreVurdering,
  }
}
