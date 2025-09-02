import { HouseIcon } from '@navikt/aksel-icons'
import { Heading, VStack } from '@navikt/ds-react'
import type { ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
}

const AddressWrapper = ({ title, children }: Props) => (
  <VStack>
    <Heading level="2" size="small">
      <HouseIcon title={title} fontSize="1.5rem" />
      {title}
    </Heading>

    {children}
  </VStack>
)

export default AddressWrapper
