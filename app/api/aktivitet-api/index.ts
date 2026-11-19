import { redirect } from 'react-router'
import { env } from '~/utils/env.server'
import { medForrigeKjoring } from '~/utils/fortsett-behandling'
import { fetcher } from '../api-client'
import { aktivitetApi } from './aktivitet-api.server'

interface AktivitetApiParams {
  request: Request
  behandlingId?: string
  aktivitetId?: string
}

export function createAktivitetApi({ request, behandlingId, aktivitetId }: AktivitetApiParams) {
  if (!behandlingId || !aktivitetId) {
    throw new Error('Missing required parameters')
  }
  const AKTIVITET_API = `${env.penUrl}/api/saksbehandling/alde/behandling/${behandlingId}/aktivitet/${aktivitetId}`

  const api = aktivitetApi(fetcher(AKTIVITET_API, request))

  const lagreVurderingOgFortsett = async <T extends object>(payload: T) => {
    const { kjoringUuidForVurdering } = await api.lagreVurdering(payload)
    const aktivitetPathname = new URL(request.url).pathname.replace(/\.data$/, '')
    return redirect(medForrigeKjoring(aktivitetPathname, kjoringUuidForVurdering))
  }

  return { ...api, lagreVurderingOgFortsett }
}
