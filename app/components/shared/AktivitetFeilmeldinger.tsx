import { Detail, List, LocalAlert } from '@navikt/ds-react'
import type { Valideringsfeil } from '~/types/vurdering'
import { formatDateToNorwegian } from '~/utils/date/formatDateToNorwegian'

interface AktivitetFeilmeldingerProps {
  feilmeldinger?: Valideringsfeil[]
  tidspunkt?: string
}

export function AktivitetFeilmeldinger({ feilmeldinger, tidspunkt }: AktivitetFeilmeldingerProps) {
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
        {tidspunkt ? <Detail>Validert {formatDateToNorwegian(tidspunkt, { showTime: true })}</Detail> : null}
      </LocalAlert.Content>
    </LocalAlert>
  )
}
