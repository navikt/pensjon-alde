import { createAktivitetApi } from '~/api/aktivitet-api'
import { isAktivitetDebugEnabled } from '~/utils/env.server'
import type { Route } from './+types/aktivitet-debug'

export async function loader({ params, request }: Route.LoaderArgs) {
  if (!isAktivitetDebugEnabled) {
    throw new Response('Not found', { status: 404 })
  }

  const api = createAktivitetApi({ request, behandlingId: params.behandlingId, aktivitetId: params.aktivitetId })
  const [grunnlag, vurdering] = await Promise.all([
    api.hentGrunnlagsdata<unknown>().catch(() => null),
    api.hentVurdering<unknown>().catch(() => null),
  ])

  return { grunnlag, vurdering }
}
