import { redirect, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import { SendTilAttestering } from '~/components/shared/SendTilAttestering'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import type { Route } from './+types'

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params
  createAktivitetApi({ request, behandlingId, aktivitetId })
  return {}
}

export async function action({ params, request }: Route.ActionArgs) {
  const { behandlingId, aktivitetId } = params
  const api = createAktivitetApi({ request, behandlingId, aktivitetId })
  await api.lagreVurdering({ sendTilAttestering: true })
  return redirect(`/behandling/${behandlingId}?justCompleted=${aktivitetId}`)
}

export default function SendTilAttesteringRoute() {
  const { avbrytAktivitet } = useOutletContext<AktivitetOutletContext>()

  return (
    <SendTilAttestering
      heading="Send til attestering"
      submitLabel="Send til attestering"
      cancelLabel="Avbryt behandling"
      onAvbryt={avbrytAktivitet}
    />
  )
}
