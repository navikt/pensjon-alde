import { Box, HStack, Loader } from '@navikt/ds-react'
import { useEffect } from 'react'
import { useFetcher } from 'react-router'
import type { AktivitetComponentProps } from '~/types/aktivitet-component'
import { OppdaterOpptjeningEndringer } from './OppdaterOpptjeningEndringer'
import type {
  OppdaterOpptjeningGrunnlag,
  OppdaterOpptjeningVurdering,
  OpptjeningstyperResponse,
} from './opptjening-types'

/** Oppsummeringsvisningen som brukes i attestering og oppsummering for alle opptjeningsbehandlingene. */
export const OpptjeningAktivitetComponent = ({
  behandling,
  grunnlag,
  vurdering,
}: AktivitetComponentProps<OppdaterOpptjeningGrunnlag, OppdaterOpptjeningVurdering>) => {
  const fetcher = useFetcher<OpptjeningstyperResponse>()

  useEffect(() => {
    if (!fetcher.data && fetcher.state === 'idle') {
      fetcher.load('/api/opptjeningstyper')
    }
  }, [fetcher])

  if (!fetcher.data) {
    return (
      <Box paddingBlock="space-28">
        <HStack justify="center">
          <Loader size="large" title="Laster opptjeningstyper" />
        </HStack>
      </Box>
    )
  }

  return (
    <Box paddingBlock="space-28">
      <OppdaterOpptjeningEndringer
        behandling={behandling}
        vurdering={vurdering}
        opptjeningstyper={fetcher.data}
        opptjeningsGrunnlag={grunnlag?.opptjeningsGrunnlagDto}
      />
    </Box>
  )
}
