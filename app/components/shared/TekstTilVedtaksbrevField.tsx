import { Textarea } from '@navikt/ds-react'
import type { ComponentProps } from 'react'

interface TekstTilVedtaksbrevFieldProps {
  name?: string
  defaultValue?: string | null
  error?: string
  readOnly?: boolean
  label?: string
  description?: string
  rows?: number
  size?: ComponentProps<typeof Textarea>['size']
}

export default function TekstTilVedtaksbrevField({
  name = 'tekstTilVedtaksbrev',
  defaultValue,
  error,
  readOnly = false,
  label = 'Tekst til vedtaksbrev',
  description = 'Teksten blir flettet inn i vedtaksbrevet.',
  rows = 4,
  size = 'small',
}: TekstTilVedtaksbrevFieldProps) {
  return (
    <Textarea
      name={name}
      label={label}
      description={!readOnly && description}
      defaultValue={defaultValue ?? undefined}
      error={error}
      readOnly={readOnly}
      rows={rows}
      size={size}
    />
  )
}
