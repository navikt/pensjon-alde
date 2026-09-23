import { useMemo } from 'react'
import {
  byggDagpengerPayload,
  byggEndringSummary,
  DAGPENGER_FELTER,
  type DagpengerDTO,
  type DagpengerLinjeState,
  DagpengerSeksjon,
  dagpengerGrunnlagTilViewModel,
  endreDagpengerFelt,
  normaliserDagpengerPayload,
  nyDagpengerLinje,
  OpptjeningAktivitetComponent,
  OpptjeningSkjema,
  tilLinjeState,
  useLinjeState,
} from '~/components/Opptjening'
import { hentOpptjeningLoaderData, lagreOpptjeningVurdering } from '~/components/Opptjening/opptjening-api.server'
import type { Route } from './+types'

export function meta() {
  return [{ title: 'Oppdater dagpenger' }]
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params
  return hentOpptjeningLoaderData({ request, behandlingId, aktivitetId })
}

export async function action({ params, request }: Route.ActionArgs) {
  const { behandlingId, aktivitetId } = params
  return lagreOpptjeningVurdering({ request, behandlingId, aktivitetId, normaliser: normaliserDagpengerPayload })
}

export const Component = OpptjeningAktivitetComponent

export default function OppdaterDagpengerRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { grunnlag, opptjeningstyper, readOnly } = loaderData
  const { errors } = actionData || {}

  const grunnlagDto = grunnlag.opptjeningsGrunnlagDto

  const { linjer, leggTil, slett, gjenopprett, oppdater } = useLinjeState<DagpengerDTO>(
    () => (grunnlagDto?.dagpengerListe ?? []).map(dagpengerGrunnlagTilViewModel).map(tilLinjeState),
    DAGPENGER_FELTER,
  )

  const endringSummary = useMemo(
    () => byggEndringSummary({ dagpenger: linjer }, opptjeningstyper),
    [linjer, opptjeningstyper],
  )

  const payload = useMemo(
    () => JSON.stringify(byggDagpengerPayload(linjer, grunnlagDto?.fnr ?? '')),
    [linjer, grunnlagDto],
  )

  return (
    <OpptjeningSkjema
      tittel="Oppdater dagpenger"
      grunnlag={grunnlag}
      opptjeningstyper={opptjeningstyper}
      readOnly={readOnly}
      errors={errors}
      endringSummary={endringSummary}
      payload={payload}
    >
      <DagpengerSeksjon
        linjer={linjer}
        opptjeningstyper={opptjeningstyper}
        readOnly={readOnly}
        onLeggTil={() => leggTil(nyDagpengerLinje())}
        onSlett={slett}
        onGjenopprett={gjenopprett}
        onOppdater={(id, felt, verdi) =>
          oppdater(id, linje => endreDagpengerFelt(linje as DagpengerLinjeState, felt, verdi))
        }
      />
    </OpptjeningSkjema>
  )
}
