import { BodyLong, BodyShort, Box, Button, CopyButton, Heading, HStack, Link, Page, VStack } from '@navikt/ds-react'
import commonStyles from '~/common.module.css'
import type { BehandlingDTO } from '~/types/behandling'
import { formatDateToNorwegian } from '~/utils/date'

export default function FeilendeBehandling({ dato, behandling }: { dato: number; behandling: BehandlingDTO }) {
  const nesteKjoring = behandling.utsattTil ? new Date(behandling.utsattTil)?.getTime() : undefined

  return (
    <Page>
      <Page.Block gutters className={commonStyles.page} width="md">
        <VStack gap="4">
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

          <HStack gap="4">
            <Button size="small" variant={'primary'}>
              Prøv igjen nå
            </Button>
            <Button size="small" variant={'secondary'}>
              Ta saken til manuell behandling
            </Button>
          </HStack>

          <BodyLong size="medium">
            Fortsatt problemer? Vennligst kopier feilmeldingen nedenfor og{' '}
            <Link href="https://teams.microsoft.com/v2/" target="_blank" rel="noopener noreferrer">
              meld fra i Teams
            </Link>
          </BodyLong>

          <VStack gap="4">
            <VStack>
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
              <BodyLong size="small" textColor="subtle">
                {formatDateToNorwegian(dato, { showTime: true })}
              </BodyLong>
            </VStack>
          </VStack>
        </VStack>
      </Page.Block>
    </Page>
  )
}
