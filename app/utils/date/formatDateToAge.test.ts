import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatDateToAge } from './formatDateToAge'

describe('formatDateToAge', () => {
  // Set up a fixed "now" date for testing
  const mockNow = new Date('2023-09-15T12:00:00Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(mockNow)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats age in years correctly', () => {
    // 2 years ago
    expect(formatDateToAge('2021-09-15T12:00:00Z')).toBe('2 år')
    // 1 year ago
    expect(formatDateToAge('2022-09-15T12:00:00Z')).toBe('1 år')
    // 5 years ago
    expect(formatDateToAge(new Date('2018-09-15T12:00:00Z'))).toBe('5 år')
  })

  it('formats age in months correctly', () => {
    // 6 months ago
    expect(formatDateToAge('2023-03-15T12:00:00Z')).toBe('6 måneder')
    // 1 month ago
    expect(formatDateToAge('2023-08-15T12:00:00Z')).toBe('1 måned')
    // 3 months ago
    expect(formatDateToAge(new Date('2023-06-15T12:00:00Z'))).toBe('3 måneder')
  })

  it('formats age in days correctly', () => {
    // 5 days ago
    expect(formatDateToAge('2023-09-10T12:00:00Z')).toBe('5 dager')
    // 1 day ago
    expect(formatDateToAge('2023-09-14T12:00:00Z')).toBe('1 dag')
    // 0 days ago (today)
    expect(formatDateToAge(new Date('2023-09-15T12:00:00Z'))).toBe('0 dager')
  })

  it('returns empty string for invalid date', () => {
    expect(formatDateToAge('not-a-date')).toBe('')
    expect(formatDateToAge('')).toBe('')
    expect(formatDateToAge(null)).toBe('')
    expect(formatDateToAge(undefined)).toBe('')
    expect(formatDateToAge(NaN)).toBe('')
  })

  it('handles timestamp strings and numbers', () => {
    const dateTimestamp = new Date('2022-09-15T12:00:00Z').getTime() // 1 year ago
    expect(formatDateToAge(dateTimestamp)).toBe('1 år')
    expect(formatDateToAge(String(dateTimestamp))).toBe('1 år')
  })

  it('handles future dates', () => {
    // 1 day in the future
    expect(formatDateToAge('2023-09-16T12:00:00Z')).toBe('0 dager')
  })
})
