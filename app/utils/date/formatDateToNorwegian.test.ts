import { describe, expect, it } from 'vitest'
import { formatDateToNorwegian } from './formatDateToNorwegian'

describe('formatDateToNorwegian', () => {
  it('formats ISO date string to Norwegian format', () => {
    expect(formatDateToNorwegian('2025-12-24')).toBe('24.12.2025')
    expect(formatDateToNorwegian('2025-01-05')).toBe('05.01.2025')
    expect(formatDateToNorwegian('2025-12-24T16:49:34.37642')).toBe('24.12.2025')
  })

  it('formats Date object to Norwegian format', () => {
    expect(formatDateToNorwegian(new Date(2025, 11, 24))).toBe('24.12.2025') // Month is 0-based
    expect(formatDateToNorwegian(new Date('2025-07-01T00:00:00Z'))).toBe('01.07.2025')
  })

  it('formats timestamp (ms) to Norwegian format', () => {
    const date = new Date('2025-12-24T00:00:00Z')
    expect(formatDateToNorwegian(date.getTime())).toBe('24.12.2025')
  })

  it('returns empty string for invalid date', () => {
    expect(formatDateToNorwegian('not-a-date')).toBe('')
    expect(formatDateToNorwegian('')).toBe('')
    expect(formatDateToNorwegian(null)).toBe('')
    expect(formatDateToNorwegian(undefined)).toBe('')
    expect(formatDateToNorwegian(NaN)).toBe('')
  })

  it('handles timestamp string', () => {
    const date = new Date('2025-12-24T00:00:00Z')
    expect(formatDateToNorwegian(String(date.getTime()))).toBe('24.12.2025')
  })

  it('pads single digit days and months', () => {
    expect(formatDateToNorwegian('2025-01-05')).toBe('05.01.2025')
    expect(formatDateToNorwegian(new Date(2025, 0, 9))).toBe('09.01.2025')
  })
})
