import { Textarea } from '@navikt/ds-react'
import type { ComponentProps } from 'react'

interface BegrunnelseFieldProps {
  defaultValue?: string | null
  error?: string
  readOnly?: boolean
  label?: string
  description?: string
  rows?: number
  size?: ComponentProps<typeof Textarea>['size']
}

export default function BegrunnelseField({
  defaultValue,
  error,
  readOnly = false,
  label = 'Begrunnelse',
  description,
  rows = 4,
  size = 'small',
}: BegrunnelseFieldProps) {
  return (
    <Textarea
      name="begrunnelse"
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
