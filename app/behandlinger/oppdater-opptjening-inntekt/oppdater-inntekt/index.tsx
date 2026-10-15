import { useOutletContext } from 'react-router'
import {
  hentOpptjeningLoaderData,
  lagreOpptjeningVurdering,
} from '~/components/Opptjening/felles/opptjening-api.server'
import { userContext } from '~/context/user-context'
import { Features } from '~/features'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import { isFeatureEnabled } from '~/utils/unleash.server'
import type { Route } from './+types'
import type { OppdaterInntektGrunnlag } from './Inntekt/inntekt.types'
import { harInntektEndringer } from './Inntekt/inntekt.utils'
import { OppdaterInntekt } from './OppdaterInntekt'

export function meta() {
  return [{ title: 'Oppdater inntekt' }]
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params
  const { enhet } = context.get(userContext)
  return {
    ...(await hentOpptjeningLoaderData<OppdaterInntektGrunnlag>({ request, behandlingId, aktivitetId })),
    visNotat: isFeatureEnabled(Features.NOTAT, { enhet }),
  }
}

export async function action({ params, request }: Route.ActionArgs) {
  const { behandlingId, aktivitetId } = params
  return lagreOpptjeningVurdering({ request, behandlingId, aktivitetId, harEndringer: harInntektEndringer })
}

export default function OppdaterInntektRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { grunnlag, readOnly, visNotat } = loaderData
  const { aktivitet, behandling, avbrytAktivitet } = useOutletContext<AktivitetOutletContext>()

  return (
    <OppdaterInntekt
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

export const Component = OppdaterInntekt
