import { BodyLong, BodyShort, Box, Button, CopyButton, Heading, HStack, Link, Page, VStack } from '@navikt/ds-react'
import commonStyles from '~/common.module.css'
import type { BehandlingDTO } from '~/types/behandling'
import { formatDateToNorwegian } from '~/utils/date'

export default function FeilendeBehandling({
  dato,
  behandling,
  retry,
  avbrytAktivitet,
}: {
  dato: number
  behandling: BehandlingDTO
  retry: () => void
  avbrytAktivitet: () => void
}) {
  const nesteKjoring = behandling.utsattTil ? new Date(behandling.utsattTil)?.getTime() : undefined

  function finnFeilendeAktivitet() {
    const feilendeAktivitetId = behandling?.sisteKjoring?.aktivitetId
    if (feilendeAktivitetId != null) {
      return behandling.aktiviteter.find(it => it.aktivitetId === feilendeAktivitetId)
    }
  }

  const feilendeAktivitet = finnFeilendeAktivitet()

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
            {feilendeAktivitet ? (
              <>
                Aktiviteten{' '}
                <i>
                  {feilendeAktivitet.friendlyName ? `${feilendeAktivitet.friendlyName} ` : `${feilendeAktivitet.type} `}
                </i>
                har feilet{' '}
                {feilendeAktivitet.antallGangerKjort === 1
                  ? ' en gang '
                  : `${feilendeAktivitet.antallGangerKjort} ganger`}
                .
              </>
            ) : (
              <>Noe gikk galt ved automatisk saksbehandling.</>
            )}

            {nesteKjoring &&
              ` Pesys vil prøve på nytt automatisk klokken ${formatDateToNorwegian(nesteKjoring, {
                showTime: true,
                onlyTimeIfSameDate: true,
              })}.`}
          </BodyLong>

          <HStack gap="4">
            <Button size="small" variant={'primary'} onClick={retry}>
              Prøv igjen nå
            </Button>
            <Button size="small" variant={'secondary'} onClick={avbrytAktivitet}>
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
                  <strong>Feilmelding</strong>
                </BodyLong>

                <Box.New borderRadius="medium" borderColor="neutral-subtle" borderWidth="1" padding="2">
                  <VStack gap="space-8">
                    <BodyLong size="small" style={{ wordBreak: 'break-all' }}>
                      {behandling.sisteKjoring?.feilmelding}
                    </BodyLong>
                    {behandling.sisteKjoring?.uuid && (
                      <HStack align="center">
                        <BodyShort size="small" textColor="subtle">
                          {behandling.sisteKjoring?.uuid}
                        </BodyShort>
                        <CopyButton
                          copyText={behandling.sisteKjoring?.uuid || behandling.behandlingId.toString()}
                          size="small"
                          variant="action"
                        />
                      </HStack>
                    )}
                  </VStack>
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
