import { BodyShort, Box, Heading } from '@navikt/ds-react'
import type { ReactNode } from 'react'

interface Props {
  header: string
  children: ReactNode
}

export const AddressItem = ({ header, children }: Props) => (
  <Box.New>
    <Heading size="xsmall" level="6">
      {header}
    </Heading>
    <BodyShort>{children}</BodyShort>
  </Box.New>
)
