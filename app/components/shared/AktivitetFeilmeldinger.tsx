import { Detail, List, LocalAlert } from '@navikt/ds-react'
import type { AktivitetFeilmeldingDTO } from '~/types/behandling'
import { formatDateToNorwegian } from '~/utils/date/formatDateToNorwegian'

interface AktivitetFeilmeldingerProps {
  feilmeldinger?: AktivitetFeilmeldingDTO[]
}

export function AktivitetFeilmeldinger({ feilmeldinger }: AktivitetFeilmeldingerProps) {
  if (!feilmeldinger?.length) return null

  return (
    <LocalAlert status="error">
      <LocalAlert.Header>
        <LocalAlert.Title>Vurderingen må rettes</LocalAlert.Title>
      </LocalAlert.Header>
      <LocalAlert.Content>
        <List as="ul" size="small">
          {feilmeldinger.map(feil => (
            <List.Item key={`${feil.felt ?? ''}:${feil.melding}`}>{feil.melding}</List.Item>
          ))}
        </List>
        <Detail>Validert {formatDateToNorwegian(feilmeldinger[0].tidspunkt, { showTime: true })}</Detail>
      </LocalAlert.Content>
    </LocalAlert>
  )
}
