import { useOutletContext } from 'react-router'
import { userContext } from '~/context/user-context'
import { Features } from '~/features'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import { isFeatureEnabled } from '~/utils/unleash.server'
import type { Route } from './+types'
import { hentForstegangstjenesteGrunnlag, lagreForstegangstjenesteVurdering } from './forstegangstjeneste-api.server'
import { OppdaterForstegangstjeneste } from './OppdaterForstegangstjeneste'

export function meta() {
  return [{ title: 'Oppdater førstegangstjeneste' }]
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { enhet } = context.get(userContext)
  return {
    ...(await hentForstegangstjenesteGrunnlag({ request, ...params })),
    visNotat: isFeatureEnabled(Features.NOTAT, { enhet }),
  }
}

export async function action({ params, request }: Route.ActionArgs) {
  return lagreForstegangstjenesteVurdering({ request, ...params })
}

export default function OppdaterForstegangstjenesteRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { aktivitet, behandling, avbrytAktivitet } = useOutletContext<AktivitetOutletContext>()
  return (
    <OppdaterForstegangstjeneste
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

export const Component = OppdaterForstegangstjeneste
