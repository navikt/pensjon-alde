import { useOutletContext } from 'react-router'
import { userContext } from '~/context/user-context'
import { Features } from '~/features'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import { isFeatureEnabled } from '~/utils/unleash.server'
import type { Route } from './+types'
import { hentDagpengerGrunnlag, lagreDagpengerVurdering } from './dagpenger-api.server'
import { OppdaterDagpenger } from './OppdaterDagpenger'

export function meta() {
  return [{ title: 'Oppdater dagpenger' }]
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { enhet } = context.get(userContext)
  return {
    ...(await hentDagpengerGrunnlag({ request, ...params })),
    visNotat: isFeatureEnabled(Features.NOTAT, { enhet }),
  }
}

export async function action({ params, request }: Route.ActionArgs) {
  return lagreDagpengerVurdering({ request, ...params })
}

export default function OppdaterDagpengerRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { aktivitet, behandling, avbrytAktivitet } = useOutletContext<AktivitetOutletContext>()
  return (
    <OppdaterDagpenger
      key={aktivitet.aktivitetId}
      {...loaderData}
      manglerTilgang={loaderData.readOnly}
      vurdering={null}
      aktivitet={aktivitet}
      behandling={behandling}
      avbrytAktivitet={avbrytAktivitet}
      errors={actionData?.errors}
    />
  )
}

export const Component = OppdaterDagpenger
