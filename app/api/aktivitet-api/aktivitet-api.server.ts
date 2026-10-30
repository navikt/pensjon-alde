import { isApiError } from '~/api/error.types'
import type { VurderingBase } from '~/types/vurdering'
import type { Fetcher } from '../api-client'

export function aktivitetApi(fetch: Fetcher) {
  const hentAktivitet = <T>() => fetch<T>('', { method: 'GET' })

  const hentAttestering = <T>() => fetch<T>(`/attestering`, { method: 'GET' })

  const lagreAttestering = () => fetch(`/attestering`, { method: 'POST' })

  const hentGrunnlagsdata = <T>() => fetch<T>(`/grunnlagsdata`, { method: 'GET' })

  const hentInput = <T>() => fetch<T>(`/input`, { method: 'GET' })

  const hentVurdering = async <T>() => {
    try {
      const respons = await fetch<{ vurdering: T | null; begrunnelse: string | null }>(`/vurdering`, {
        method: 'GET',
      })
      return respons?.vurdering ? { ...respons.vurdering, begrunnelse: respons.begrunnelse } : null
    } catch (error) {
      if (isApiError(error) && error.data.status === 404) {
        // Returner 404 dersom ikke vurdering er gjort
        return null
      }
      throw error
    }
  }

  const lagreForeløpigVurdering = <T extends object>(payload: T) => {
    const { begrunnelse = null, ...data } = payload as VurderingBase & Record<string, unknown>
    return fetch(`/vurdering`, {
      method: 'POST',
      body: JSON.stringify({ data, begrunnelse: begrunnelse || null, foreløpig: true }),
    })
  }

  const lagreVurdering = <T extends object>(payload: T) => {
    const { begrunnelse = null, ...data } = payload as VurderingBase & Record<string, unknown>
    return fetch(`/vurdering`, {
      method: 'POST',
      body: JSON.stringify({ data, begrunnelse: begrunnelse || null }),
    })
  }

  const hentOutput = <T>() => fetch<T>(`/output`, { method: 'GET' })

  const retryGrunnlagsdata = () => fetch(`/grunnlagsdata/retry`, { method: 'POST' })

  return {
    hentAktivitet,
    hentAttestering,
    hentGrunnlagsdata,
    hentInput,
    hentOutput,
    hentVurdering,
    retryGrunnlagsdata,
    lagreAttestering,
    lagreVurdering,
    lagreForeløpigVurdering,
  }
}
