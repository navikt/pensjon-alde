import { BodyLong, BodyShort, Button, Heading, HStack, Link, Page, VStack } from '@navikt/ds-react'
import commonStyles from '~/common.module.css'
import type { AktivitetDTO } from '~/types/behandling'
import { formatDateToNorwegian } from '~/utils/date'
import type { Soknad } from './index'

interface AfpLivsvarigVenterProps {
  soknad: Soknad
  aktivitet: AktivitetDTO
  pensjonsoversiktUrl?: string
  psakOppgaveoversikt?: string
  avbrytAktivitet?: () => void
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
            <BodyShort size="small" textColor="subtle">
              Opplysninger sist innhentet {formatDateToNorwegian(aktivitet.sisteAktiveringsdato, { showTime: true })}
            </BodyShort>
            <BodyShort size="small" textColor="subtle">
              Planlagt ny innhenting {formatDateToNorwegian(aktivitet.utsattTil, { showTime: true })}
            </BodyShort>
          </VStack>
        </VStack>
        <HStack gap="2" justify="center">
          {pensjonsoversiktUrl && <Link href={pensjonsoversiktUrl}>Pensjonsoversikt</Link>}
          {psakOppgaveoversikt && <Link href={psakOppgaveoversikt}>Oppgavelisten</Link>}
        </HStack>
        {avbrytAktivitet && (
          <div>
            <Button as="a" size="small" variant="tertiary" onClick={avbrytAktivitet}>
              Avbryt del-auto behandling
            </Button>
          </div>
        )}
      </VStack>
    </Page.Block>
  )
}
