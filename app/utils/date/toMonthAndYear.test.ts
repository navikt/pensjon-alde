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
})
