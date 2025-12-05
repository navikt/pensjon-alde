import { BodyShort } from '@navikt/ds-react'
import type { ReactNode } from 'react'

interface Props {
  bold?: boolean
  children: ReactNode
}

export const AddressItem = ({ bold = false, children }: Props) => {
  if (!children) return null

  return (
    <BodyShort weight={bold ? 'semibold' : 'regular'} style={{ wordBreak: 'break-all' }}>
      {children}
    </BodyShort>
  )
}
