import { useMemo, useState } from 'react'
import { type ActionErrors, OpptjeningSkjema, useLinjeState } from '~/components/Opptjening'
import type { AktivitetComponentProps } from '~/types/aktivitet-component'
import { InntektSeksjon } from './Inntekt/InntektSeksjon'
import type { InntektLinje, OppdaterInntektGrunnlag, OppdaterInntektVurdering } from './Inntekt/inntekt.types'
import {
  byggInntektEndringSummary,
  byggInntektPayload,
  endreInntektFelt,
  finnInntektFeil,
  INNTEKT_FELTER,
  inntektLinjerFraVurdering,
  inntektstyperPerKategori,
  nyInntektLinje,
  tilbakestillInntektLinje,
} from './Inntekt/inntekt.utils'

type OppdaterInntektProps = Omit<
  AktivitetComponentProps<OppdaterInntektGrunnlag, OppdaterInntektVurdering>,
  'errors'
> & {
  errors?: ActionErrors
  manglerTilgang?: boolean
}

export function OppdaterInntekt({
  grunnlag,
  vurdering,
  readOnly,
  avbrytAktivitet,
  errors,
  begrunnelse,
  visNotat,
  manglerTilgang,
}: OppdaterInntektProps) {
  const typer = useMemo(() => inntektstyperPerKategori(grunnlag?.inntektstyper), [grunnlag])
  const kodebeskrivelser = useMemo(() => Object.values(typer).flat(), [typer])

  const { linjer, leggTil, slett, gjenopprett, oppdater } = useLinjeState<InntektLinje>(
    () => inntektLinjerFraVurdering(grunnlag, vurdering),
    INNTEKT_FELTER,
  )

  const feil = useMemo(() => finnInntektFeil(linjer), [linjer])
  const [visAlleFeil, setVisAlleFeil] = useState(false)

  const endringSummary = useMemo(() => byggInntektEndringSummary(linjer, typer), [linjer, typer])

  const payload = useMemo(
    () => JSON.stringify(byggInntektPayload(linjer, grunnlag?.inntektsoversikt?.fnr ?? '')),
    [linjer, grunnlag],
  )

  return (
    <OpptjeningSkjema
      tittel="Oppdater inntekt"
      grunnlag={grunnlag ?? {}}
      opptjeningstyper={kodebeskrivelser}
      readOnly={readOnly}
      manglerTilgang={manglerTilgang}
      errors={errors}
      visNotat={visNotat}
      endringSummary={endringSummary}
      payload={payload}
      sakId={vurdering?.sakId}
      begrunnelse={begrunnelse}
      avbrytAktivitet={avbrytAktivitet}
      harKlientFeil={Object.keys(feil).length > 0}
      onInnsendingsforsok={() => setVisAlleFeil(true)}
    >
      <InntektSeksjon
        linjer={linjer}
        typer={typer}
        feil={feil}
        readOnly={readOnly}
        visAlleFeil={visAlleFeil}
        onLeggTil={kategori => leggTil(nyInntektLinje(kategori, typer[kategori][0]?.code ?? ''))}
        onSlett={slett}
        onGjenopprett={gjenopprett}
        onTilbakestill={id => oppdater(id, tilbakestillInntektLinje)}
        onOppdater={(id, felt, verdi) => oppdater(id, linje => endreInntektFelt(linje, felt, verdi))}
      />
    </OpptjeningSkjema>
  )
}
