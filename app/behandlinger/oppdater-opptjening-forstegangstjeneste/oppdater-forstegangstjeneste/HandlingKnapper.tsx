import { Button } from '@navikt/ds-react'
import type { LinjeStatus } from './forstegangstjeneste.types'

interface HandlingKnapperProps {
  linje: { _id: string; _status: LinjeStatus }
  beskrivelse: string
  onSlett: (id: string) => void
  onGjenopprett: (id: string) => void
}

export function HandlingKnapper({ linje, beskrivelse, onSlett, onGjenopprett }: HandlingKnapperProps) {
  if (linje._status === 'deleted') {
    return (
      <Button
        type="button"
        variant="secondary"
        size="small"
        aria-label={`Gjenopprett ${beskrivelse}`}
        onClick={() => onGjenopprett(linje._id)}
      >
        Gjenopprett
      </Button>
    )
  }
  return (
    <Button
      type="button"
      variant="secondary"
      size="small"
      aria-label={`Slett ${beskrivelse}`}
      onClick={() => onSlett(linje._id)}
    >
      Slett
    </Button>
  )
}
