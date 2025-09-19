import { HouseIcon } from '@navikt/aksel-icons'
import { BodyShort, Heading, VStack } from '@navikt/ds-react'
import type { ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
  description: string
}

const AddressWrapper = ({ title, children, description }: Props) => (
  <VStack gap="4">
    <div>
      <Heading level="2" size="small" style={{ display: 'flex', alignItems: 'center' }}>
        <HouseIcon title={title} fontSize="1.3rem" />
        {title}
      </Heading>

      {description && <BodyShort size="small">{description}</BodyShort>}
    </div>

    {children}
  </VStack>
)

export default AddressWrapper
