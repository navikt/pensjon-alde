import { useMemo } from 'react'
import {
  byggEndringSummary,
  byggInntektPayload,
  endreInntektFelt,
  finnInntektKommuneFeil,
  INNTEKT_FELTER,
  type InntektDTO,
  InntekterSeksjon,
  type InntektLinjeState,
  initialInntektLinjer,
  nyInntektLinje,
  OpptjeningAktivitetComponent,
  OpptjeningSkjema,
  useLinjeState,
  validerInntektPayload,
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
  return [{ title: 'Oppdater inntekter' }]
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
  return lagreOpptjeningVurdering({ request, behandlingId, aktivitetId, valider: validerInntektPayload })
}

export const Component = OpptjeningAktivitetComponent

export default function OppdaterInntektRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { grunnlag, opptjeningstyper, readOnly, visNotat } = loaderData
  const { errors } = actionData || {}

  const grunnlagDto = grunnlag.opptjeningsGrunnlagDto
  const defaultInntektType = opptjeningstyper.inntekt.typer[0]?.code ?? ''

  const { linjer, leggTil, slett, gjenopprett, oppdater } = useLinjeState<InntektDTO>(
    () => initialInntektLinjer(grunnlagDto?.inntektListe, readOnly, defaultInntektType),
    INNTEKT_FELTER,
  )

  const kommuneFeil = useMemo(() => finnInntektKommuneFeil(linjer), [linjer])

  const endringSummary = useMemo(
    () => byggEndringSummary({ inntekt: linjer }, opptjeningstyper),
    [linjer, opptjeningstyper],
  )

  const payload = useMemo(
    () => JSON.stringify(byggInntektPayload(linjer, grunnlagDto?.fnr ?? '')),
    [linjer, grunnlagDto],
  )

  return (
    <OpptjeningSkjema
      tittel="Oppdater inntekter"
      grunnlag={grunnlag}
      opptjeningstyper={opptjeningstyper}
      readOnly={readOnly}
      errors={errors}
      visNotat={visNotat}
      endringSummary={endringSummary}
      payload={payload}
      harKlientFeil={Object.keys(kommuneFeil).length > 0}
    >
      <InntekterSeksjon
        linjer={linjer}
        opptjeningstyper={opptjeningstyper}
        readOnly={readOnly}
        kommuneFeil={kommuneFeil}
        onLeggTil={() => leggTil(nyInntektLinje(defaultInntektType))}
        onSlett={slett}
        onGjenopprett={gjenopprett}
        onOppdater={(id, felt, verdi) =>
          oppdater(id, linje => endreInntektFelt(linje as InntektLinjeState, felt, verdi))
        }
      />
    </OpptjeningSkjema>
  )
}
