import { Box, VStack } from '@navikt/ds-react'
import { useEffect } from 'react'
import { useFetcher } from 'react-router'
import BegrunnelseField from '~/components/shared/BegrunnelseField'
import type { AktivitetComponentProps } from '~/types/aktivitet-component'
import { OppdaterOpptjeningEndringer } from './OppdaterOpptjeningEndringer'
import type {
  OppdaterOpptjeningGrunnlag,
  OppdaterOpptjeningVurdering,
  OpptjeningstyperResponse,
} from './opptjening-types'

const UTEN_TYPER: OpptjeningstyperResponse = {
  inntekt: { typer: [], subTyper: [] },
  omsorg: { typer: [], subTyper: [] },
  dagpenger: { typer: [], subTyper: [] },
  forstegangstjeneste: { typer: [], subTyper: [] },
}

/** Oppsummeringsvisningen som brukes i attestering og oppsummering for alle opptjeningsbehandlingene. */
export const OpptjeningAktivitetComponent = ({
  behandling,
  grunnlag,
  vurdering,
  begrunnelse,
  visNotat,
}: AktivitetComponentProps<OppdaterOpptjeningGrunnlag, OppdaterOpptjeningVurdering>) => {
  const fetcher = useFetcher<OpptjeningstyperResponse>()

  useEffect(() => {
    if (!fetcher.data && fetcher.state === 'idle') {
      fetcher.load('/api/opptjeningstyper')
    }
  }, [fetcher])

  return (
    <Box paddingBlock="space-28">
      <VStack gap="space-28">
        <OppdaterOpptjeningEndringer
          behandling={behandling}
          vurdering={vurdering}
          opptjeningstyper={fetcher.data ?? UTEN_TYPER}
          opptjeningsGrunnlag={grunnlag?.opptjeningsGrunnlagDto}
        />
        {visNotat && <BegrunnelseField readOnly defaultValue={begrunnelse} />}
      </VStack>
    </Box>
  )
}
