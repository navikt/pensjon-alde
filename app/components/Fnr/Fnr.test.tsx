import { describe, expect, it } from 'vitest'
import { Fnr } from './Fnr'

describe('Fnr component', () => {
  it('should accept string value', () => {
    const result = Fnr({ value: '12345678901' })
    expect(result).toBeDefined()
  })

  it('should accept number value', () => {
    const result = Fnr({ value: 12345678901 })
    expect(result).toBeDefined()
  })

  it('should return null for null value', () => {
    const result = Fnr({ value: null })
    expect(result).toBeNull()
  })

  it('should return null for undefined value', () => {
    const result = Fnr({ value: undefined })
    expect(result).toBeNull()
  })

  it('should handle short strings', () => {
    const result = Fnr({ value: '123' })
    expect(result).toBeDefined()
    expect(result?.type).toBe('span')
  })

  it('should render 11-digit fnr with wrapper', () => {
    const result = Fnr({ value: '12345678901' })
    expect(result?.type).toBe('span')
    expect(result?.props?.className).toContain('fnrWrapper')
  })

  it('should convert number to string correctly', () => {
    const result = Fnr({ value: 12345678901 })
    expect(result?.type).toBe('span')
    expect(result?.props?.className).toContain('fnrWrapper')
  })
})
