import { Box, VStack } from '@navikt/ds-react'
import { useMemo } from 'react'
import type { Bostedsadresse, MatrikkelAdresse, Vegadresse } from '../samboer-types'
import { MatrikkeladresserBlokk } from './Matrikkeladresse'
import { VegadresseBlokk } from './Vegadresse'

interface Props {
  bostedadresser: Bostedsadresse[]
}

const AddressBlock = ({ bostedadresser }: Props) => {
  const sortedAddresses = useMemo(() => {
    return [...bostedadresser].sort((a, b) => {
      const dateA = a.adresseTilleggsdata?.gyldigFraOgMed
      const dateB = b.adresseTilleggsdata?.gyldigFraOgMed

      if (!dateA || !dateB) return 0
      return dateB.localeCompare(dateA)
    })
  }, [bostedadresser])

  const renderAddress = (adresse: Bostedsadresse, index: number) => {
    let content: React.ReactElement

    switch (adresse.type) {
      case 'VegadresseModel':
        content = <VegadresseBlokk adresse={adresse as Vegadresse} />
        break
      case 'MatrikkeladresseModel':
        content = <MatrikkeladresserBlokk adresse={adresse as MatrikkelAdresse} />
        break
      default:
        content = <div>Ingen støtte for {(adresse as Bostedsadresse).type}</div>
    }

    return (
      <Box
        key={`${adresse.type}-${index}`}
        borderWidth="1"
        borderRadius={{ xs: '12' }}
        borderColor={'neutral-subtleA'}
        padding="space-16"
      >
        {content}
      </Box>
    )
  }

  return <VStack gap="space-16">{sortedAddresses.map(renderAddress)}</VStack>
}

export default AddressBlock
