import type { AuthContext } from '~/context'
import { env } from '~/utils/env.server'
import { apiFetch, apiFetchOptional } from '../api-client'

export interface AktivitetApiParams {
  auth: AuthContext
  behandlingId: string
  aktivitetId: string
}

/**
 * Build URL for aktivitet endpoints
 */
function buildUrl(behandlingsId: string, aktivitetId: string, endpoint: string): string {
  return `${env.penUrl}/api/saksbehandling/alde/behandling/${behandlingsId}/aktivitet/${aktivitetId}/${endpoint}`
}

export function createAktivitetApi({ auth, behandlingId, aktivitetId }: AktivitetApiParams) {
  const url = (endpoint: string) => buildUrl(behandlingId, aktivitetId, endpoint)

  return {
    hentAttestering: <T>() => apiFetch<T>(url('attestering'), { method: 'GET' }, auth),

    lagreAttestering: <T>(attestering: T) =>
      apiFetch<void>(
        url('attestering'),
        {
          method: 'POST',
          body: JSON.stringify({ data: attestering }),
        },
        auth,
      ),

    hentGrunnlagsdata: <T>() => apiFetch<T>(url('grunnlagsdata'), { method: 'GET' }, auth),

    hentInput: <T>() => apiFetch<T>(url('input'), { method: 'GET' }, auth),

    hentVurdering: <T>() => apiFetchOptional<T>(url('vurdering'), { method: 'GET' }, auth),

    lagreVurdering: <T>(vurdering: T) =>
      apiFetch<void>(
        url('vurdering'),
        {
          method: 'POST',
          body: JSON.stringify({ data: vurdering }),
        },
        auth,
      ),

    innhentGrunnlagsdataPåNytt: () => apiFetch<void>(url('innhent-grunnlagsdata'), { method: 'POST' }, auth),
  }
}
