import { differenceInDays, differenceInMonths, differenceInYears, isValid, parseISO } from 'date-fns'

/**
 * Formats a date string or Date object to a human-readable age string (time since).
 * Returns the time elapsed in years, months, or days depending on the duration.
 *
 * @param date - The date to calculate age from (ISO string, Date, or number)
 * @returns A string representation of the age (e.g. "2 years", "3 months", "5 days") or empty string if invalid
 */
export function formatDateToAge(date: string | Date | number | null | undefined): string {
  if (!date) return ''

  let dateObj: Date

  if (typeof date === 'string') {
    // Try to parse as ISO string
    dateObj = parseISO(date)
    if (!isValid(dateObj)) {
      // Fallback: try to parse as timestamp string
      const timestamp = Number(date)
      if (!Number.isNaN(timestamp)) {
        dateObj = new Date(timestamp)
      }
    }
  } else if (typeof date === 'number') {
    dateObj = new Date(date)
  } else {
    dateObj = date
  }

  if (!isValid(dateObj)) return ''

  const now = new Date()
  const years = differenceInYears(now, dateObj)

  if (years > 0) {
    return `${years} ${years === 1 ? 'år' : 'år'}`
  }

  const months = differenceInMonths(now, dateObj)

  if (months > 0) {
    return `${months} ${months === 1 ? 'måned' : 'måneder'}`
  }

  const days = differenceInDays(now, dateObj)

  if (days >= 0) {
    return `${days} ${days === 1 ? 'dag' : 'dager'}`
  }

  // Handle future dates
  return '0 dager'
}
