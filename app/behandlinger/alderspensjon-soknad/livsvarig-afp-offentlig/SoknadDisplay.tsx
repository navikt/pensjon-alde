import { BodyShort, Box, Heading, VStack } from '@navikt/ds-react'
import { formatDateToNorwegian } from '~/utils/date'
import type { Soknad, Ukjent } from './index'

export function SoknadDisplay({ soknad }: { soknad: Soknad | Ukjent }) {
  return (
    <Box.New padding="4" borderWidth="1" borderRadius="medium" borderColor="neutral-subtle">
      <VStack gap="space-8">
        <div>
          <Heading level="3" size="xsmall">
            {soknad.tpInfo.tpNavn}
          </Heading>
          <BodyShort size="small" textColor="subtle">
            TP-nummer: {soknad.tpInfo.tpNummer}
          </BodyShort>
        </div>
        <div>
          <BodyShort weight="semibold">Status søknad:</BodyShort>
          <BodyShort>
            {soknad.status === 'soknad' && 'Søknad sendt'}
            {soknad.status === 'ukjent' && 'Ukjent status'}
          </BodyShort>
        </div>
        {soknad.status === 'soknad' && (
          <div>
            <BodyShort weight="semibold">Ønsket virkningsdato:</BodyShort>
            <BodyShort>{formatDateToNorwegian(soknad.onsketVirkningsdato)}</BodyShort>
          </div>
        )}
      </VStack>
    </Box.New>
  )
}
