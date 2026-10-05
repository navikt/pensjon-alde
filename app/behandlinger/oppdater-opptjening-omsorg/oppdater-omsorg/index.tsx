import { useMemo } from 'react'
import {
  byggEndringSummary,
  byggOmsorgPayload,
  OMSORG_FELTER,
  type OmsorgGrunnlagDTO,
  OmsorgSeksjon,
  OpptjeningAktivitetComponent,
  OpptjeningSkjema,
  tilLinjeState,
  useLinjeState,
} from '~/components/Opptjening'
import {
  hentOpptjeningLoaderData,
  lagreOpptjeningVurdering,
} from '~/components/Opptjening/felles/opptjening-api.server'
import { userContext } from '~/context/user-context'
import { Features } from '~/features'
import { isFeatureEnabled } from '~/utils/unleash.server'
import type { Route } from './+types'

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

export const Component = OpptjeningAktivitetComponent

export default function OppdaterOmsorgRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { grunnlag, opptjeningstyper, readOnly, visNotat } = loaderData
  const { errors } = actionData || {}

  const grunnlagDto = grunnlag.opptjeningsGrunnlagDto

  const { linjer, slett, gjenopprett } = useLinjeState<OmsorgGrunnlagDTO>(
    () => (grunnlagDto?.omsorgListe ?? []).map(tilLinjeState),
    OMSORG_FELTER,
  )

  const endringSummary = useMemo(
    () => byggEndringSummary({ omsorg: linjer }, opptjeningstyper),
    [linjer, opptjeningstyper],
  )

  const payload = useMemo(
    () => JSON.stringify(byggOmsorgPayload(linjer, grunnlagDto?.fnr ?? '')),
    [linjer, grunnlagDto],
  )

  return (
    <OpptjeningSkjema
      tittel="Oppdater omsorg"
      grunnlag={grunnlag}
      opptjeningstyper={opptjeningstyper}
      readOnly={readOnly}
      errors={errors}
      visNotat={visNotat}
      endringSummary={endringSummary}
      payload={payload}
    >
      <OmsorgSeksjon
        linjer={linjer}
        opptjeningstyper={opptjeningstyper}
        readOnly={readOnly}
        onSlett={slett}
        onGjenopprett={gjenopprett}
      />
    </OpptjeningSkjema>
  )
}
