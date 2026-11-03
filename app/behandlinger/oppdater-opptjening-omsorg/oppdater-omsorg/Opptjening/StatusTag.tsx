import { Tag } from '@navikt/ds-react'
import type { LinjeStatus } from './opptjening.utils'

export function StatusTag({ status }: { status: LinjeStatus }) {
  if (status === 'new')
    return (
      <Tag variant="success" size="small">
        Ny
      </Tag>
    )
  if (status === 'modified')
    return (
      <Tag variant="warning" size="small">
        Endret
      </Tag>
    )
  if (status === 'deleted')
    return (
      <Tag variant="error" size="small">
        Slettet
      </Tag>
    )
  return null
}
