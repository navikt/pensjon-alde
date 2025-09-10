import { VStack } from '@navikt/ds-react'
import { formatDateToNorwegian } from '~/utils/date'
import { AddressItem } from '../AddressItem/AddressItem'
import type { Vegadresse } from '../samboer-types'

interface Props {
  adresse: Vegadresse
}

export const VegadresseBlokk = ({ adresse }: Props) => (
  <>
    {/*
    <Heading size="small" level="5" style={{ marginTop: '6px', marginBottom: '12px' }}>
      Vegadresse
    </Heading>
    */}

    <VStack gap="4">
      <div>
        <AddressItem bold>
          {adresse.adressenavn} {adresse.husnummer}
          {adresse.husbokstav} {adresse.bruksenhetsnummer && `- ${adresse.bruksenhetsnummer}`}
        </AddressItem>

        <AddressItem>
          {adresse.postnummer} {adresse.poststed}
        </AddressItem>
      </div>

      <div>
        <AddressItem bold>
          Flyttedato{' '}
          {adresse?.adresseTilleggsdata?.angittFlyttedato
            ? formatDateToNorwegian(adresse.adresseTilleggsdata.angittFlyttedato)
            : 'Mangler dato'}
        </AddressItem>

        <AddressItem>
          Gyldig f.o.m.{' '}
          {adresse?.adresseTilleggsdata?.gyldigFraOgMed
            ? formatDateToNorwegian(adresse.adresseTilleggsdata.gyldigFraOgMed)
            : 'Mangler dato'}
        </AddressItem>

        <AddressItem>
          Gyldig t.o.m.{' '}
          {adresse?.adresseTilleggsdata?.gyldigTilOgMed
            ? formatDateToNorwegian(adresse.adresseTilleggsdata.gyldigTilOgMed)
            : 'Mangler dato'}
        </AddressItem>
      </div>
    </VStack>
  </>
)
