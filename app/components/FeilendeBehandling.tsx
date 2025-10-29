import {
  BodyLong,
  BodyShort,
  Box,
  Button,
  CopyButton,
  Heading,
  HStack,
  Link,
  Page,
  Spacer,
  VStack,
} from '@navikt/ds-react'
import commonStyles from '~/common.module.css'
import type { BehandlingDTO } from '~/types/behandling'
import { formatDateToNorwegian } from '~/utils/date'

export default function FeilendeBehandling({ dato, behandling }: { dato: number; behandling: BehandlingDTO }) {
  const nesteKjoring = behandling.utsattTil ? new Date(behandling.utsattTil)?.getTime() : undefined

  return (
    <Page>
      <Page.Block gutters className={commonStyles.page} width="md">
        <VStack gap="8">
          <Heading
            size="xlarge"
            level="1"
            style={{
              color: 'var(--ax-text-danger-subtle)',
            }}
          >
            Feil ved automatisk saksbehandling
          </Heading>
          <BodyLong size="medium">
            Noe gikk galt ved automatisk saksbehandling.
            {nesteKjoring &&
              ` Pesys vil prøve på nytt automatisk klokken ${formatDateToNorwegian(nesteKjoring, {
                showTime: true,
                onlyTimeIfSameDate: true,
              })}.`}
          </BodyLong>

          <BodyLong size="medium">
            Om ønskelig kan du få Pesys til å forsøke på nytt med en gang eller du kan ta saken til manuell behandling
          </BodyLong>

          <HStack gap="4">
            <Link href="https://teams.microsoft.com/v2/" target="_blank" rel="noopener noreferrer">
              Meld fra i Teams
            </Link>
            <Button variant={'secondary'}>Ta saken til manuell behandling</Button>
            <Button variant={'secondary'}>Forsøk på nytt</Button>
          </HStack>

          <VStack gap="4">
            <VStack gap="4">
              <BodyLong size="medium">
                <HStack align="center" justify="space-between">
                  <strong>Feilmelding</strong>
                  <CopyButton
                    copyText={
                      (behandling.sisteKjoring?.feilmelding || '') + ' ' + (behandling.sisteKjoring?.uuid || '')
                    }
                    size="small"
                    variant="action"
                    text="Kopier"
                    activeText="Kopiert"
                  />
                </HStack>
              </BodyLong>

              <Box.New borderRadius="medium" borderColor="neutral-subtle" borderWidth="1" padding="2">
                <HStack justify="space-between">
                  <BodyLong size="small" style={{ padding: '1rem' }}>
                    {behandling.sisteKjoring?.feilmelding}
                  </BodyLong>
                  {behandling.sisteKjoring?.uuid && (
                    <BodyShort size="small" style={{ padding: '1rem' }} textColor="subtle">
                      {behandling.sisteKjoring?.uuid}
                    </BodyShort>
                  )}
                </HStack>
              </Box.New>
            </VStack>
          </VStack>
          <BodyLong size="small" textColor="subtle">
            {formatDateToNorwegian(dato, { showTime: true })}
          </BodyLong>
        </VStack>
      </Page.Block>
    </Page>
  )
}
