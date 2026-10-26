import { Detail, ErrorSummary, VStack } from '@navikt/ds-react'
import type { Ref } from 'react'
import type { Valideringsfeil } from '~/types/vurdering'
import { formatDateToNorwegian } from '~/utils/date/formatDateToNorwegian'

interface AktivitetFeilmeldingerProps {
  feilmeldinger?: Valideringsfeil[]
  tidspunkt?: string
  ref?: Ref<HTMLDivElement>
}

/** Lenkene forutsetter at feltet i aktiviteten har `id` lik `felt`. */
export function AktivitetFeilmeldinger({ feilmeldinger, tidspunkt, ref }: AktivitetFeilmeldingerProps) {
  if (!feilmeldinger?.length) return null

  return (
    <VStack gap="space-8">
      <ErrorSummary ref={ref} size="small" heading="Du må rette disse feilene før du kan lagre vurderingen:">
        {feilmeldinger.map(feil => (
          <ErrorSummary.Item key={`${feil.felt ?? ''}:${feil.melding}`} href={feil.felt ? `#${feil.felt}` : undefined}>
            {feil.melding}
          </ErrorSummary.Item>
        ))}
      </ErrorSummary>
      {tidspunkt ? <Detail>Validert {formatDateToNorwegian(tidspunkt, { showTime: true })}</Detail> : null}
    </VStack>
  )
}
