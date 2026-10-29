import { useOutletContext } from 'react-router'
import { userContext } from '~/context/user-context'
import { Features } from '~/features'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import { isFeatureEnabled } from '~/utils/unleash.server'
import type { Route } from './+types'
import { OppdaterOmsorg } from './OppdaterOmsorg'
import { hentOpptjeningLoaderData, lagreOpptjeningVurdering } from './Opptjening/opptjening-api.server'

export function meta() {
  return [{ title: 'Oppdater omsorg' }]
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params
  const { enhet } = context.get(userContext)
  return {
    ...(await hentOpptjeningLoaderData({ request, behandlingId, aktivitetId })),
    visNotat: isFeatureEnabled(Features.NOTAT, { enhet }),
  }
}

export async function action({ params, request }: Route.ActionArgs) {
  const { behandlingId, aktivitetId } = params
  return lagreOpptjeningVurdering({ request, behandlingId, aktivitetId })
}

export default function OppdaterOmsorgRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { grunnlag, readOnly, visNotat } = loaderData
  const { aktivitet, behandling, avbrytAktivitet } = useOutletContext<AktivitetOutletContext>()

  return (
    <OppdaterOmsorg
      readOnly={readOnly}
      manglerTilgang={readOnly}
      grunnlag={grunnlag}
      vurdering={null}
      aktivitet={aktivitet}
      behandling={behandling}
      avbrytAktivitet={avbrytAktivitet}
      errors={actionData?.errors}
      visNotat={visNotat}
    />
  )
}

export const Component = OppdaterOmsorg
