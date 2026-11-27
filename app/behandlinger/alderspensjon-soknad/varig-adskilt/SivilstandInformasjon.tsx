import { BodyShort, HStack } from '@navikt/ds-react'
import { formatDateToNorwegian } from '~/utils/date/formatDateToNorwegian'
import { SIVILSTAND_TEKST, type Sivilstand } from './types'

export function SivilstandInformasjon({ sivilstand }: { sivilstand: Sivilstand | null }) {
  return (
    <>
      <HStack gap="space-4">
        Sivilstand:{' '}
        <BodyShort weight="semibold">{sivilstand ? SIVILSTAND_TEKST[sivilstand.sokerSivilstand] : 'Ukjent'}</BodyShort>
      </HStack>
      {sivilstand?.gyldigFraOgMed && (
        <HStack gap="space-4">
          Gyldig fra og med: <BodyShort weight="semibold">{formatDateToNorwegian(sivilstand.gyldigFraOgMed)}</BodyShort>
        </HStack>
      )}
      {sivilstand?.bekreftelsesdato && (
        <HStack gap="space-4">
          Bekreftelsesdato:{' '}
          <BodyShort weight="semibold">{formatDateToNorwegian(sivilstand.bekreftelsesdato)}</BodyShort>
        </HStack>
      )}
    </>
  )
}
