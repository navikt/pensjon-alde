import { useMemo } from 'react'
import {
  type ActionErrors,
  byggEndringSummary,
  byggOmsorgPayload,
  OMSORG_FELTER,
  type OmsorgGrunnlagDTO,
  OmsorgSeksjon,
  type OppdaterOpptjeningGrunnlag,
  type OppdaterOpptjeningVurdering,
  OpptjeningSkjema,
  omsorgLinjerFraVurdering,
  useLinjeState,
} from '~/components/Opptjening'
import { opptjeningstyperFraGrunnlag } from '~/components/Opptjening/felles/opptjeningstyper.utils'
import type { AktivitetComponentProps } from '~/types/aktivitet-component'

type OppdaterOmsorgProps = Omit<
  AktivitetComponentProps<OppdaterOpptjeningGrunnlag, OppdaterOpptjeningVurdering>,
  'errors'
> & {
  errors?: ActionErrors
  manglerTilgang?: boolean
}

export function OppdaterOmsorg({
  grunnlag,
  vurdering,
  readOnly,
  avbrytAktivitet,
  errors,
  begrunnelse,
  visNotat,
  manglerTilgang,
}: OppdaterOmsorgProps) {
  const grunnlagDto = grunnlag?.opptjeningsGrunnlagDto

  const opptjeningstyper = useMemo(() => opptjeningstyperFraGrunnlag(grunnlag), [grunnlag])

  const { linjer, slett, gjenopprett } = useLinjeState<OmsorgGrunnlagDTO>(
    () => omsorgLinjerFraVurdering(grunnlagDto, vurdering),
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
      grunnlag={grunnlag ?? {}}
      opptjeningstyper={opptjeningstyper}
      readOnly={readOnly}
      manglerTilgang={manglerTilgang}
      errors={errors}
      visNotat={visNotat}
      endringSummary={endringSummary}
      payload={payload}
      sakId={vurdering?.sakId}
      begrunnelse={begrunnelse}
      avbrytAktivitet={avbrytAktivitet}
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
