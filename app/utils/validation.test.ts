import { describe, expect, it } from 'vitest'
import { validateSamboerForm } from './validation'

describe('validateSamboerForm', () => {
  it('validates required virkFom field', () => {
    const formData = new FormData()
    const errors = validateSamboerForm(formData)

    expect(errors).toHaveLength(1)
    expect(errors[0]).toEqual({
      field: 'virkFom',
      message: 'Virkningstidspunkt må fylles ut'
    })
  })

  it('validates date format', () => {
    const formData = new FormData()
    formData.set('virkFom', 'invalid-date')

    const errors = validateSamboerForm(formData)

    expect(errors).toHaveLength(1)
    expect(errors[0]).toEqual({
      field: 'virkFom',
      message: 'Dato må være i format dd.mm.åååå'
    })
  })

  it('validates future dates', () => {
    const formData = new FormData()
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const futureDateString = futureDate.toLocaleDateString('no-NO')

    formData.set('virkFom', futureDateString)

    const errors = validateSamboerForm(formData)

    expect(errors).toHaveLength(1)
    expect(errors[0]).toEqual({
      field: 'virkFom',
      message: 'Dato kan ikke være i fremtiden'
    })
  })

  it('validates invalid dates', () => {
    const formData = new FormData()
    formData.set('virkFom', '32.13.2023')

    const errors = validateSamboerForm(formData)

    expect(errors).toHaveLength(1)
    expect(errors[0]).toEqual({
      field: 'virkFom',
      message: 'Ugyldig dato'
    })
  })

  it('passes validation with valid date', () => {
    const formData = new FormData()
    const validDate = new Date('2023-01-01')
    formData.set('virkFom', validDate.toLocaleDateString('no-NO'))

    const errors = validateSamboerForm(formData)

    expect(errors).toHaveLength(0)
  })
})
