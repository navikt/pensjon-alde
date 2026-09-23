import { useMemo } from 'react'
import {
  byggEndringSummary,
  byggOmsorgPayload,
  OMSORG_FELTER,
  type OmsorgDTO,
  OmsorgSeksjon,
  OpptjeningAktivitetComponent,
  OpptjeningSkjema,
  omsorgGrunnlagTilViewModel,
  tilLinjeState,
  useLinjeState,
} from '~/components/Opptjening'
import { hentOpptjeningLoaderData, lagreOpptjeningVurdering } from '~/components/Opptjening/opptjening-api.server'
import type { Route } from './+types'

export function meta() {
  return [{ title: 'Oppdater omsorg' }]
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params
  return hentOpptjeningLoaderData({ request, behandlingId, aktivitetId })
}

export async function action({ params, request }: Route.ActionArgs) {
  const { behandlingId, aktivitetId } = params
  return lagreOpptjeningVurdering({ request, behandlingId, aktivitetId })
}

export const Component = OpptjeningAktivitetComponent

export default function OppdaterOmsorgRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { grunnlag, opptjeningstyper, readOnly } = loaderData
  const { errors } = actionData || {}

  const grunnlagDto = grunnlag.opptjeningsGrunnlagDto

  const { linjer, slett, gjenopprett } = useLinjeState<OmsorgDTO>(
    () => (grunnlagDto?.omsorgListe ?? []).map(omsorgGrunnlagTilViewModel).map(tilLinjeState),
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
