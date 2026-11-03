import { useMemo } from 'react'
import type { AktivitetComponentProps } from '~/types/aktivitet-component'
import { OmsorgSeksjon } from './Omsorg/OmsorgSeksjon'
import type { OmsorgGrunnlagDTO } from './Omsorg/omsorg.types'
import {
  byggOmsorgEndringSummary,
  byggOmsorgPayload,
  OMSORG_FELTER,
  omsorgLinjerFraVurdering,
} from './Omsorg/omsorg.utils'
import { OpptjeningSkjema } from './Opptjening/OpptjeningSkjema'
import type {
  ActionErrors,
  OppdaterOpptjeningGrunnlag,
  OppdaterOpptjeningVurdering,
} from './Opptjening/opptjening.types'
import { opptjeningstyperFraGrunnlag } from './Opptjening/opptjeningstyper.utils'
import { useLinjeState } from './Opptjening/use-linje-state'

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

  const endringSummary = useMemo(() => byggOmsorgEndringSummary(linjer, opptjeningstyper), [linjer, opptjeningstyper])

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
