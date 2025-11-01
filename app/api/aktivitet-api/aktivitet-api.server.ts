import { isApiError } from '~/api/error.types'
import type { Fetcher } from '../api-client'

export function aktivitetApi(fetch: Fetcher) {
  const hentAktivitet = <T>() => fetch<T>('', { method: 'GET' })

  const hentAttestering = <T>() => fetch<T>(`/attestering`, { method: 'GET' })

  const lagreAttestering = () => fetch(`/attestering`, { method: 'POST' })

  const hentGrunnlagsdata = <T>() => fetch<T>(`/grunnlagsdata`, { method: 'GET' })

  const hentInput = <T>() => fetch<T>(`/input`, { method: 'GET' })

  const hentVurdering = async <T>() => {
    try {
      return await fetch<T>(`/vurdering`, { method: 'GET' })
    } catch (error) {
      if (isApiError(error) && error.data.status === 404) {
        // Returner 404 dersom ikke vurdering er gjort
        return null
      }
      throw error
    }
  }

  const lagreVurdering = (vurdering: Record<string, any>) =>
    fetch(`/vurdering`, { method: 'POST', body: JSON.stringify({ data: vurdering }) })

  const hentOutput = <T>() => fetch<T>(`/output`, { method: 'GET' })

  const innhentGrunnlagsdata = <T>() => fetch<T>(`/innhent-grunnlagsdata`, { method: 'GET' })

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
