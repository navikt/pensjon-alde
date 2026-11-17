import { useState } from 'react'
import type { AktivitetComponentProps } from '~/types/aktivitet-component'
import { DagpengerSeksjon } from './DagpengerSeksjon'
import type { ActionErrors, DagpengerDTO, DagpengerGrunnlag, DagpengerVurdering } from './dagpenger.types'
import {
  BELOPSFELTER,
  byggDagpengerPayload,
  DAGPENGER_FELTER,
  dagpengerLinjerFraVurdering,
  dagpengertypeLabel,
  endreDagpengerFelt,
  finnDagpengerFeil,
  nyDagpengerLinje,
  tilbakestillDagpengerLinje,
} from './dagpenger.utils'
import { OpptjeningSkjema } from './OpptjeningSkjema'
import { byggEndringSummary } from './opptjening.utils'
import { useLinjeState } from './use-linje-state'

type Props = Omit<AktivitetComponentProps<DagpengerGrunnlag, DagpengerVurdering>, 'errors'> & {
  errors?: ActionErrors
  manglerTilgang?: boolean
}

export function OppdaterDagpenger({
  grunnlag,
  vurdering,
  readOnly,
  avbrytAktivitet,
  errors,
  begrunnelse,
  visNotat,
  manglerTilgang,
}: Props) {
  const typer = grunnlag?.dagpengertyper ?? []
  const { linjer, leggTil, slett, gjenopprett, oppdater } = useLinjeState<DagpengerDTO>(
    () => dagpengerLinjerFraVurdering(grunnlag, vurdering),
    DAGPENGER_FELTER,
  )
  const feil = readOnly ? {} : finnDagpengerFeil(linjer)
  const [visAlleFeil, setVisAlleFeil] = useState(false)
  const summary = byggEndringSummary(linjer, {
    label: linje => `${dagpengertypeLabel(typer, linje.dagpengerType)} (${linje.ar})`,
    endringer: linje => {
      const original = linje._original
      if (!original) return []
      return [
        ...(original.ar !== linje.ar ? [`År: ${original.ar} → ${linje.ar}`] : []),
        ...(original.dagpengerType !== linje.dagpengerType
          ? [
              `Type: ${dagpengertypeLabel(typer, original.dagpengerType)} → ${dagpengertypeLabel(typer, linje.dagpengerType)}`,
            ]
          : []),
        ...BELOPSFELTER.filter(([felt]) => (linje[felt] ?? null) !== (original[felt] ?? null)).map(
          ([felt, label]) => `${label}: ${original[felt] ?? '-'} → ${linje[felt] ?? '-'}`,
        ),
      ]
    },
  })
  return (
    <OpptjeningSkjema
      tittel="Oppdater dagpenger"
      opptjeningstyper={typer}
      readOnly={readOnly}
      manglerTilgang={manglerTilgang}
      errors={errors}
      visNotat={visNotat}
      endringSummary={summary}
      payload={JSON.stringify(byggDagpengerPayload(linjer))}
      begrunnelse={begrunnelse}
      avbrytAktivitet={avbrytAktivitet}
      harKlientFeil={Object.keys(feil).length > 0}
      onInnsendingsforsok={() => setVisAlleFeil(true)}
    >
      <DagpengerSeksjon
        linjer={linjer}
        typer={typer}
        feil={feil}
        visAlleFeil={visAlleFeil}
        readOnly={readOnly}
        onLeggTil={() => leggTil(nyDagpengerLinje(typer[0]?.code ?? ''))}
        onSlett={slett}
        onGjenopprett={gjenopprett}
        onTilbakestill={id => oppdater(id, tilbakestillDagpengerLinje)}
        onOppdater={(id, felt, verdi) => oppdater(id, linje => endreDagpengerFelt(linje, felt, verdi))}
      />
    </OpptjeningSkjema>
  )
}
