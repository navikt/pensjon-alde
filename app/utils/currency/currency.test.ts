import { describe, expect, it } from 'vitest'
import { formatCurrencyNok } from './currency'

describe('formatCurrencyNok', () => {
  it('should format number amounts as Norwegian currency', () => {
    expect(formatCurrencyNok(1000)).toBe('1 000 kr')
    expect(formatCurrencyNok(123456.78)).toBe('123 457 kr')
    expect(formatCurrencyNok(0)).toBe('0 kr')
  })

  it('should format string amounts as Norwegian currency', () => {
    expect(formatCurrencyNok('2500')).toBe('2 500 kr')
    expect(formatCurrencyNok('999.99')).toBe('1 000 kr')
  })

  it('should handle null and undefined values', () => {
    expect(formatCurrencyNok(null as unknown as number)).toBe('0 kr')
    expect(formatCurrencyNok(undefined as unknown as number)).toBe('0 kr')
  })
})
