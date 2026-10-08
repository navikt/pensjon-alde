import { Box, VStack } from '@navikt/ds-react'
import BegrunnelseField from '~/components/shared/BegrunnelseField'
import type { AktivitetComponentProps } from '~/types/aktivitet-component'
import { OppdaterOpptjeningEndringer } from './OppdaterOpptjeningEndringer'
import type { OppdaterOpptjeningGrunnlag, OppdaterOpptjeningVurdering } from './opptjening-types'
import { opptjeningstyperFraGrunnlag } from './opptjeningstyper.utils'

/** Oppsummeringsvisningen som brukes i attestering og oppsummering for alle opptjeningsbehandlingene. */
export const OpptjeningAktivitetComponent = ({
  behandling,
  grunnlag,
  vurdering,
  begrunnelse,
  visNotat,
}: AktivitetComponentProps<OppdaterOpptjeningGrunnlag, OppdaterOpptjeningVurdering>) => {
  return (
    <Box paddingBlock="space-28">
      <VStack gap="space-28">
        <OppdaterOpptjeningEndringer
          behandling={behandling}
          vurdering={vurdering}
          opptjeningstyper={opptjeningstyperFraGrunnlag(grunnlag)}
          opptjeningsGrunnlag={grunnlag?.opptjeningsGrunnlagDto}
        />
        {visNotat && <BegrunnelseField readOnly defaultValue={begrunnelse} />}
      </VStack>
    </Box>
  )
}
