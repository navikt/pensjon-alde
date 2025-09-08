import { Heading, HGrid, VStack } from '@navikt/ds-react'
import { formatDateToNorwegian } from '~/utils/date'
import { AddressItem } from '../AddressItem/AddressItem'
import type { RegoppslagAdresse } from '../samboer-types'

interface Props {
  adresse: RegoppslagAdresse
}

export const RegoppslagAdresseBlokk = ({ adresse }: Props) => (
  <>
    <Heading size="small" level="5" style={{ marginTop: '6px', marginBottom: '12px' }}>
      Regoppslagadresse
    </Heading>

    <HGrid gap={{ xs: '3', sm: '6' }} columns={2}>
      <VStack gap="1">
        <AddressItem header="Postnummer">{adresse.postnummer ?? ''}</AddressItem>
        <AddressItem header="Poststed">{adresse.poststed ?? ''}</AddressItem>
        <AddressItem header="Land">{adresse.land ?? ''}</AddressItem>
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
