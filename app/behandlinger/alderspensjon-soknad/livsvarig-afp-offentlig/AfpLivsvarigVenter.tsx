import { BodyLong, BodyShort, Button, Heading, HStack, Page, VStack } from '@navikt/ds-react'
import commonStyles from '~/common.module.css'
import type { AktivitetDTO } from '~/types/behandling'
import { formatDateToNorwegian } from '~/utils/date'
import type { Soknad } from './index'

interface AfpLivsvarigVenterProps {
  soknad: Soknad
  aktivitet: AktivitetDTO
  pensjonsoversiktUrl?: string
  psakOppgaveoversikt?: string
  avbrytAktivitet: () => void
}

export function AfpLivsvarigVenter({
  soknad,
  aktivitet,
  pensjonsoversiktUrl,
  psakOppgaveoversikt,
  avbrytAktivitet,
}: AfpLivsvarigVenterProps) {
  return (
    <Page.Block gutters className={`${commonStyles.page} ${commonStyles.center}`} width="text">
      <VStack gap="space-40" align="center">
        <VStack align="center" gap="space-16">
          <Heading size="medium" level="1">
            Venter på svar fra {soknad?.tpInfo.tpNavn}
          </Heading>
          <VStack gap="space-40">
            <BodyLong align="center">
              Det er søkt om livsvarig AFP for offentlig sektor. Maskinen sender saken til attestering når
              tjenestepensjonsleverandør har svart.{' '}
            </BodyLong>
            <VStack align="center">
              <Heading size="small" level="3" align="center" spacing>
                Hvorfor venter vi på tjenestepensjonsleverandør?
              </Heading>

              <BodyLong align="center">
                Søkeren har ikke nok opptjening til å få innvilget alderspensjon alene, men kan ha rett til
                alderspensjon om den kombineres med livsvarig AFP.
              </BodyLong>
            </VStack>
          </VStack>
          <VStack align="center">
            <BodyShort size="small" color="subtle">
              Sist oppdatert {formatDateToNorwegian(aktivitet.sisteAktiveringsdato, { showTime: true })}
            </BodyShort>
            <BodyShort size="small" color="subtle">
              Neste oppdatering {formatDateToNorwegian(aktivitet.utsattTil, { showTime: true })}
            </BodyShort>
          </VStack>
        </VStack>
        <HStack gap="2" justify="center">
          {pensjonsoversiktUrl && (
            <Button size="small" as="a" href={pensjonsoversiktUrl}>
              Til Pensjonsoversikt
            </Button>
          )}
          {psakOppgaveoversikt && (
            <Button as="a" size="small" href={psakOppgaveoversikt} variant="secondary">
              Til Oppgavelisten
            </Button>
          )}
        </HStack>
        <div>
          <Button as="a" size="small" variant="tertiary" onClick={avbrytAktivitet}>
            Avbryt behandling i pilot
          </Button>
        </div>
      </VStack>
    </Page.Block>
  )
}
