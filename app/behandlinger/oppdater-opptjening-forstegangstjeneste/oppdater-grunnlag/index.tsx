import { useMemo } from 'react'
import {
  byggEndringSummary,
  byggForstegangstjenestePayload,
  endreForstegangstjenesteFelt,
  FORSTEGANGSTJENESTE_FELTER,
  type ForstegangstjenesteDTO,
  type ForstegangstjenesteLinjeState,
  ForstegangstjenesteSeksjon,
  finnForstegangstjenesteFomFeil,
  forstegangstjenesteGrunnlagTilViewModel,
  nyForstegangstjenesteLinje,
  OpptjeningAktivitetComponent,
  OpptjeningSkjema,
  tilLinjeState,
  useLinjeState,
  validerForstegangstjenestePayload,
} from '~/components/Opptjening'
import { hentOpptjeningLoaderData, lagreOpptjeningVurdering } from '~/components/Opptjening/opptjening-api.server'
import type { Route } from './+types'

export function meta() {
  return [{ title: 'Oppdater førstegangstjeneste' }]
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params
  return hentOpptjeningLoaderData({ request, behandlingId, aktivitetId })
}

export async function action({ params, request }: Route.ActionArgs) {
  const { behandlingId, aktivitetId } = params
  return lagreOpptjeningVurdering({
    request,
    behandlingId,
    aktivitetId,
    valider: validerForstegangstjenestePayload,
  })
}

export const Component = OpptjeningAktivitetComponent

export default function OppdaterForstegangstjenesteRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { grunnlag, opptjeningstyper, readOnly } = loaderData
  const { errors } = actionData || {}

  const grunnlagDto = grunnlag.opptjeningsGrunnlagDto

  const { linjer, leggTil, slett, gjenopprett, oppdater } = useLinjeState<ForstegangstjenesteDTO>(
    () => forstegangstjenesteGrunnlagTilViewModel(grunnlagDto?.forstegangstjeneste).map(tilLinjeState),
    FORSTEGANGSTJENESTE_FELTER,
  )

  const fomFeil = useMemo(() => finnForstegangstjenesteFomFeil(linjer), [linjer])

  const endringSummary = useMemo(
    () => byggEndringSummary({ forstegangstjeneste: linjer }, opptjeningstyper),
    [linjer, opptjeningstyper],
  )

  const payload = useMemo(
    () => JSON.stringify(byggForstegangstjenestePayload(linjer, grunnlagDto?.fnr ?? '')),
    [linjer, grunnlagDto],
  )

  return (
    <OpptjeningSkjema
      tittel="Oppdater førstegangstjeneste"
      grunnlag={grunnlag}
      opptjeningstyper={opptjeningstyper}
      readOnly={readOnly}
      errors={errors}
      endringSummary={endringSummary}
      payload={payload}
      harKlientFeil={Object.keys(fomFeil).length > 0}
    >
      <ForstegangstjenesteSeksjon
        linjer={linjer}
        opptjeningstyper={opptjeningstyper}
        readOnly={readOnly}
        fomFeil={fomFeil}
        onLeggTil={() => leggTil(nyForstegangstjenesteLinje())}
        onSlett={slett}
        onGjenopprett={gjenopprett}
        onOppdater={(id, felt, verdi) =>
          oppdater(id, linje => endreForstegangstjenesteFelt(linje as ForstegangstjenesteLinjeState, felt, verdi))
        }
      />
    </OpptjeningSkjema>
  )
}
