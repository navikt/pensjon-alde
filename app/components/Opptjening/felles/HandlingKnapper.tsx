import { TrashIcon } from '@navikt/aksel-icons'
import { Button } from '@navikt/ds-react'
import type { LinjeStatus } from './opptjening.utils'

interface HandlingKnapperProps {
  linje: { _id: string; _status: LinjeStatus }
  onSlett: (id: string) => void
  onGjenopprett: (id: string) => void
}

export function HandlingKnapper({ linje, onSlett, onGjenopprett }: HandlingKnapperProps) {
  if (linje._status === 'deleted') {
    return (
      <Button type="button" variant="tertiary" size="small" onClick={() => onGjenopprett(linje._id)}>
        Gjenopprett
      </Button>
    )
  }
  return (
    <Button
      type="button"
      variant="tertiary-neutral"
      size="small"
      icon={<TrashIcon aria-hidden />}
      onClick={() => onSlett(linje._id)}
    >
      Slett
    </Button>
  )
}
