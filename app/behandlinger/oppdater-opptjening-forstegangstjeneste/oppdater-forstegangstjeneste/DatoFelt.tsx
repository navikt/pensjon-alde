import { DatePicker, useDatepicker } from '@navikt/ds-react'
import { format, isValid, parseISO } from 'date-fns'

type Props = {
  label: string
  value: string | null
  error?: boolean
  'aria-describedby'?: string
  onChange: (verdi: string | null) => void
  onBlur: () => void
}

export function DatoFelt({ label, value, error = false, 'aria-describedby': beskrevetAv, onChange, onBlur }: Props) {
  const startverdi = value ? parseISO(value) : undefined
  const { datepickerProps, inputProps } = useDatepicker({
    defaultSelected: startverdi && isValid(startverdi) ? startverdi : undefined,
    onDateChange: dato => onChange(dato ? format(dato, 'yyyy-MM-dd') : null),
  })

  return (
    <DatePicker dropdownCaption {...datepickerProps}>
      <DatePicker.Input
        {...inputProps}
        label={label}
        hideLabel
        size="small"
        error={error}
        aria-describedby={beskrevetAv}
        onBlur={event => {
          inputProps.onBlur?.(event)
          onBlur()
        }}
      />
    </DatePicker>
  )
}
