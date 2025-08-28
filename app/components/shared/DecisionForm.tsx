import type { DatePickerProps } from '@navikt/ds-react'
import { Button, DatePicker, useDatepicker } from '@navikt/ds-react'
import type React from 'react'

interface DecisionFormProps {
  title: string
  children: React.ReactNode
  onSubmit: () => void
  onContinue?: () => void
  submitLabel?: string
  continueLabel?: string
  showDatePicker?: boolean
  datepickerProps?: DatePickerProps
  inputProps?: React.ComponentProps<typeof DatePicker.Input>
}

const DecisionForm: React.FC<DecisionFormProps> = ({
  title,
  children,
  onSubmit,
  onContinue,
  submitLabel = 'Fullfør vurdering',
  continueLabel = 'Gå videre',
  showDatePicker = true,
  datepickerProps,
  inputProps
}) => {
  const defaultDatepicker = useDatepicker({
    fromDate: new Date('1 Jan 2020'),
    toDate: new Date()
  })

  const finalDatepickerProps =
    datepickerProps || defaultDatepicker.datepickerProps
  const finalInputProps = inputProps || defaultDatepicker.inputProps

  return (
    <>
      <h4>{title}</h4>
      <form className="decision-form">
        <div className="form-fields">{children}</div>

        {showDatePicker && (
          <div className="date-group">
            <DatePicker {...finalDatepickerProps}>
              <DatePicker.Input
                {...finalInputProps}
                label="Vurderingsdato"
                placeholder="dd.mm.åååå"
              />
            </DatePicker>
          </div>
        )}

        <div className="button-group">
          <Button variant="primary" onClick={onSubmit} type="button">
            {submitLabel}
          </Button>

          {onContinue && (
            <Button variant="secondary" onClick={onContinue} type="button">
              {continueLabel}
            </Button>
          )}
        </div>
      </form>
    </>
  )
}

export default DecisionForm
