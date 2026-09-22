import { DatePicker, useDatepicker } from '@navikt/ds-react'
import { parseIsoDate, toIsoDate } from './opptjening.utils'

interface DatoVelgerCellProps {
  value: string
  label: string
  disabled?: boolean
  error?: string
  fromDate?: Date
  onChange: (val: string) => void
}

export function DatoVelgerCell({ value, label, disabled, error, fromDate, onChange }: DatoVelgerCellProps) {
  const { inputProps, datepickerProps } = useDatepicker({
    defaultSelected: value ? parseIsoDate(value) : undefined,
    fromDate,
    onDateChange: date => onChange(date ? toIsoDate(date) : ''),
  })
  return (
    <DatePicker dropdownCaption {...datepickerProps}>
      <DatePicker.Input {...inputProps} label={label} hideLabel size="small" disabled={disabled} error={error} />
    </DatePicker>
  )
}
