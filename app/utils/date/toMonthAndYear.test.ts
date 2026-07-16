import { describe, expect, it } from 'vitest'
import { toMonthAndYear } from './toMonthAndYear'

describe('toMonthAndYear', () => {
  it('formats string input to Norwegian month and year', () => {
    expect(toMonthAndYear('2028-01-15')).toBe('Januar 2028')
  })

  it('formats Date input to Norwegian month and year', () => {
    expect(toMonthAndYear(new Date(2028, 0, 15))).toBe('Januar 2028')
  })

  it('returns empty string for null input', () => {
    expect(toMonthAndYear(null)).toBe('')
  })

  it('returns empty string for undefined input', () => {
    expect(toMonthAndYear(undefined)).toBe('')
  })

  it('treats 0 as a valid epoch date (1970-01-01), not as a missing value', () => {
    // Not asserting the exact "Januar 1970" string, since new Date(0) formats in the
    // local timezone and could resolve to December 1969 in negative-offset timezones.
    // We only assert that 0 is treated as a valid date (non-empty output), matching
    // parseDate()'s documented contract that 0 is a valid epoch, not a missing value.
    expect(toMonthAndYear(0)).not.toBe('')
    expect(toMonthAndYear('0')).not.toBe('')
    expect(toMonthAndYear(0)).toBe(toMonthAndYear(new Date(0)))
  })
})
