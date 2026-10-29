import { useMemo, useState } from 'react'
import type { AktivitetComponentProps } from '~/types/aktivitet-component'
import { InntektSeksjon } from './Inntekt/InntektSeksjon'
import type { InntektLinje, OppdaterInntektGrunnlag, OppdaterInntektVurdering } from './Inntekt/inntekt.types'
import {
  beregnInntektStatus,
  byggInntektEndringSummary,
  byggInntektFeiloppsummering,
  byggInntektPayload,
  endreInntektFelt,
  finnInntektFeil,
  INNTEKT_FELTER,
  inntektLinjerFraVurdering,
  inntektstyperPerKategori,
  ledigInntektstype,
  nyInntektLinje,
  tilbakestillInntektLinje,
} from './Inntekt/inntekt.utils'
import { OpptjeningSkjema } from './Inntekt/OpptjeningSkjema'
import type { ActionErrors } from './Inntekt/opptjening.types'
import { useLinjeState } from './Inntekt/use-linje-state'

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
    beregnInntektStatus,
  )

  const feil = useMemo(() => (readOnly ? {} : finnInntektFeil(linjer)), [linjer, readOnly])
  const feiloppsummering = useMemo(() => byggInntektFeiloppsummering(linjer, feil, typer), [linjer, feil, typer])
  const [innsendingsforsok, setInnsendingsforsok] = useState(0)

  const endringSummary = useMemo(() => byggInntektEndringSummary(linjer, typer, feil), [linjer, typer, feil])

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
      feiloppsummering={feiloppsummering}
      onInnsendingsforsok={() => setInnsendingsforsok(forsok => forsok + 1)}
    >
      <InntektSeksjon
        linjer={linjer}
        typer={typer}
        feil={feil}
        readOnly={readOnly}
        innsendingsforsok={innsendingsforsok}
        onLeggTil={(kategori, inntektAr) => {
          const inntektsType = ledigInntektstype(linjer, typer[kategori], kategori, inntektAr)
          if (inntektsType !== null) leggTil(nyInntektLinje(kategori, inntektsType, inntektAr))
        }}
        onSlett={slett}
        onGjenopprett={gjenopprett}
        onTilbakestill={id => oppdater(id, tilbakestillInntektLinje)}
        onOppdater={(id, felt, verdi) => oppdater(id, linje => endreInntektFelt(linje, felt, verdi))}
      />
    </OpptjeningSkjema>
  )
}
