import { Heading, HGrid, VStack } from '@navikt/ds-react'
import { formatDateToNorwegian } from '~/utils/date'
import { AddressItem } from '../AddressItem/AddressItem'
import type { Vegadresse } from '../samboer-types'

interface Props {
  adresse: Vegadresse
}

export const VegadresseBlokk = ({ adresse }: Props) => (
  <>
    <Heading size="small" level="5" style={{ marginTop: '6px', marginBottom: '12px' }}>
      Vegadresse
    </Heading>

    <HGrid gap={{ xs: '3', sm: '6' }} columns={2}>
      <VStack gap="1">
        <AddressItem header="Adressenavn">{adresse.adressenavn}</AddressItem>
        <AddressItem header="Husnummer">{adresse.husnummer}</AddressItem>
        <AddressItem header="Husbokstav">{adresse.husbokstav}</AddressItem>
        <AddressItem header="Postnummer">{adresse.postnummer}</AddressItem>
        <AddressItem header="Kommunenr">{adresse.kommunenummer}</AddressItem>
        <AddressItem header="Bruksenhetsnummer">{adresse.bruksenhetsnummer ?? 'Ingen info'}</AddressItem>
      </VStack>

      <VStack gap="1">
        <AddressItem header="Angitt flyttedato">
          {adresse?.adresseTilleggsdata?.angittFlyttedato
            ? formatDateToNorwegian(adresse.adresseTilleggsdata.angittFlyttedato)
            : 'Mangler dato'}
        </AddressItem>

        <AddressItem header="Gyldig fra og med">
          {adresse?.adresseTilleggsdata?.gyldigFraOgMed
            ? formatDateToNorwegian(adresse.adresseTilleggsdata.gyldigFraOgMed)
            : 'Mangler dato'}
        </AddressItem>

        <AddressItem header="Gyldig til og med">
          {adresse?.adresseTilleggsdata?.gyldigTilOgMed
            ? formatDateToNorwegian(adresse.adresseTilleggsdata.gyldigTilOgMed)
            : 'Mangler dato'}
        </AddressItem>
      </VStack>
    </HGrid>
  </>
)
