import { differenceInDays, differenceInMonths, differenceInYears } from 'date-fns'
import { parseDate } from './parseDate'

/**
 * Formats a date string or Date object to a human-readable age string (time since).
 * Returns the time elapsed in years, months, or days depending on the duration.
 *
 * @param date - The date to calculate age from (ISO string, Date, or number)
 * @returns A string representation of the age (e.g. "2 years", "3 months", "5 days") or empty string if invalid
 */
export function formatDateToAge(date: string | Date | number | null | undefined): string {
  const dateObj = parseDate(date)
  if (!dateObj) return ''

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
