import { describe, expect, it } from 'vitest'
import { AktivitetStatus } from '~/types/behandling'
import { erAktivitetReadOnly } from './aktivitet-read-only'

describe('erAktivitetReadOnly', () => {
  it('er readOnly når aktiviteten er fullført', () => {
    expect(erAktivitetReadOnly({ status: AktivitetStatus.FULLFORT })).toBe(true)
  })

  it.each([AktivitetStatus.OPPRETTET, AktivitetStatus.UNDER_BEHANDLING, AktivitetStatus.FEILET])(
    'er ikke readOnly når status er %s',
    status => {
      expect(erAktivitetReadOnly({ status })).toBe(false)
    },
  )
})
