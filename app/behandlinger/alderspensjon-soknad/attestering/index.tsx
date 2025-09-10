import { DogHarnessIcon } from '@navikt/aksel-icons'
import { BodyLong } from '@navikt/ds-react'

export default function Attestering() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '1rem',
        marginTop: '2rem',
      }}
    >
      <DogHarnessIcon
        title="Attestering fullført"
        fontSize="2rem"
        color="var(--ax-text-success)"
        aria-label="Oppgaven er til attestering"
      />
      <BodyLong>Oppgaven er til attestering</BodyLong>
    </div>
  )
}

export const loader = async () => {
  return null
}

export const action = async () => {
  return null
}
