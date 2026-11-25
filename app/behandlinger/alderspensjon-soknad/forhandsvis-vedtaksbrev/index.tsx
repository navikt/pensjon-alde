import { data, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import type { FormErrors } from '~/types/aktivitet-component'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import type { Route } from './+types'
import {
  ForhandsvisVedtaksbrev,
  type ForhandsvisVedtaksbrevGrunnlag,
  type ForhandsvisVedtaksbrevVurdering,
} from './ForhandsvisVedtaksbrev'

export function meta() {
  return [{ title: 'Forhåndsvis vedtaksbrev' }]
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const api = createAktivitetApi({
    request,
    behandlingId: params.behandlingId,
    aktivitetId: params.aktivitetId,
  })

  return { readOnly: false, grunnlag: await api.hentGrunnlagsdata<ForhandsvisVedtaksbrevGrunnlag>() }
}

export async function action({ params, request }: Route.ActionArgs) {
  const api = createAktivitetApi({
    request,
    behandlingId: params.behandlingId,
    aktivitetId: params.aktivitetId,
  })

  try {
    return await api.lagreVurderingOgFortsett<ForhandsvisVedtaksbrevVurdering>({})
  } catch {
    return data(
      {
        errors: {
          _form: 'Det oppstod en feil ved fortsettelse av behandlingen',
        } as FormErrors<ForhandsvisVedtaksbrevVurdering>,
      },
      { status: 500 },
    )
  }
}

export default function ForhandsvisVedtaksbrevRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { aktivitet, avbrytAktivitet } = useOutletContext<AktivitetOutletContext>()

  return (
    <ForhandsvisVedtaksbrev
      grunnlag={loaderData.grunnlag}
      aktivitet={aktivitet}
      readOnly={loaderData.readOnly}
      avbrytAktivitet={avbrytAktivitet}
      errors={actionData?.errors}
    />
  )
}

export const Component = ForhandsvisVedtaksbrev
