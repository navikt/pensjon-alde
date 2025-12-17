import { VStack } from '@navikt/ds-react'
import { formatDateToNorwegian } from '~/utils/date'
import { AddressItem } from '../AddressItem/AddressItem'
import type { MatrikkelAdresse } from '../samboer-types'

interface Props {
  adresse: MatrikkelAdresse
}

export const MatrikkeladresserBlokk = ({ adresse }: Props) => (
  <>
    <VStack gap="4">
      <div>
        {adresse.adresselinjer.map((linje, index) => (
          <AddressItem key={linje} bold={index === 0}>
            {linje}
          </AddressItem>
        ))}
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

        {adresse?.adresseTilleggsdata?.gyldigTilOgMed && (
          <AddressItem>
            {`Gyldig t.o.m. ${formatDateToNorwegian(adresse.adresseTilleggsdata.gyldigTilOgMed)}`}
          </AddressItem>
        )}
      </div>
    </VStack>
  </>
)
