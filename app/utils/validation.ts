export interface ValidationError {
  field: string
  message: string
}

export function validateSamboerForm(formData: FormData): ValidationError[] {
  const errors: ValidationError[] = []

  const virkFom = formData.get('virkFom') as string
  if (!virkFom || virkFom.trim() === '') {
    errors.push({
      field: 'virkFom',
      message: 'Virkningstidspunkt må fylles ut'
    })
  } else {
    // Validate date format (dd.mm.yyyy)
    const datePattern = /^\d{2}\.\d{2}\.\d{4}$/
    if (!datePattern.test(virkFom)) {
      errors.push({
        field: 'virkFom',
        message: 'Dato må være i format dd.mm.åååå'
      })
    } else {
      // Validate that it's a valid date
      const [day, month, year] = virkFom.split('.').map(Number)
      const date = new Date(year, month - 1, day)
      if (
        date.getDate() !== day ||
        date.getMonth() !== month - 1 ||
        date.getFullYear() !== year
      ) {
        errors.push({
          field: 'virkFom',
          message: 'Ugyldig dato'
        })
      }

      // Check if date is not in the future
      if (date > new Date()) {
        errors.push({
          field: 'virkFom',
          message: 'Dato kan ikke være i fremtiden'
        })
      }
    }
  }

  return errors
}
