import { BodyLong, BodyShort, Box, CopyButton, Heading, Link, Page, VStack } from '@navikt/ds-react'
import commonStyles from '~/common.module.css'
import { formatDateToNorwegian } from '~/utils/date'

export default function ForbiddenPage({ dato, traceId }: { dato: number; traceId: string | undefined }) {
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
            Ikke tilgang
          </Heading>
          <BodyLong size="medium">
            Du har ikke tilgang til å saksbehandle dette. Det kan skyldes at saken er på en enhet du ikke har tilgang
            til, en involvert person på saken er egen ansatt eller at du mangler andre nødvendige tilganger.
          </BodyLong>

          <BodyLong size="medium">
            Vennligst kopier feilsøkingsinformasjonen nedenfor og{' '}
            <Link href="https://teams.microsoft.com/v2/" target="_blank" rel="noopener noreferrer">
              meld fra i Teams
            </Link>{' '}
            om du mener dette er feil.
          </BodyLong>
          {traceId && (
            <VStack gap="1">
              <BodyLong size="medium">
                <strong>Feilsøkingsinformasjon</strong>
              </BodyLong>

              <Box.New borderRadius="medium" borderColor="neutral-subtle" borderWidth="1" padding="2">
                <BodyShort size="small" textColor="subtle">
                  {traceId}
                </BodyShort>
                <CopyButton copyText={traceId} size="small" variant="action" />
              </Box.New>
              <BodyLong size="small" textColor="subtle">
                {formatDateToNorwegian(dato, { showTime: true })}
              </BodyLong>
            </VStack>
          )}
        </VStack>
      </Page.Block>
    </Page>
  )
}
