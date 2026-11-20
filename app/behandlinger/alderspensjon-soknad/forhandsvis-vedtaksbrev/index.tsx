import { useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import type { Route } from './+types'
import { ForhandsvisVedtaksbrev, type ForhandsvisVedtaksbrevGrunnlag } from './ForhandsvisVedtaksbrev'

export function meta() {
  return [{ title: 'Forhåndsvis vedtaksbrev' }]
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const api = createAktivitetApi({
    request,
    behandlingId: params.behandlingId,
    aktivitetId: params.aktivitetId,
  })

  return { grunnlag: await api.hentGrunnlagsdata<ForhandsvisVedtaksbrevGrunnlag>() }
}

export async function action() {
  return null
}

export default function ForhandsvisVedtaksbrevRoute({ loaderData }: Route.ComponentProps) {
  const { aktivitet } = useOutletContext<AktivitetOutletContext>()

  return <ForhandsvisVedtaksbrev grunnlag={loaderData.grunnlag} aktivitet={aktivitet} />
}

export const Component = ForhandsvisVedtaksbrev
