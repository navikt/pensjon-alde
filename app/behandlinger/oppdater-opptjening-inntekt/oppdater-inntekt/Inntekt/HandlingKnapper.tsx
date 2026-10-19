import { Button } from '@navikt/ds-react'
import type { LinjeStatus } from './opptjening.utils'

interface HandlingKnapperProps {
  linje: { _id: string; _status: LinjeStatus }
  beskrivelse?: string
  onSlett: (id: string) => void
  onGjenopprett: (id: string) => void
}

export function HandlingKnapper({ linje, beskrivelse, onSlett, onGjenopprett }: HandlingKnapperProps) {
  const etikett = (handling: string) => (beskrivelse ? `${handling} ${beskrivelse}` : undefined)
  if (linje._status === 'deleted') {
    return (
      <Button
        type="button"
        variant="secondary"
        size="small"
        aria-label={etikett('Gjenopprett')}
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
      aria-label={etikett('Slett')}
      onClick={() => onSlett(linje._id)}
    >
      Slett
    </Button>
  )
}
