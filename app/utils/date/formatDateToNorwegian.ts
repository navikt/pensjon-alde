import { format, isValid, parseISO } from 'date-fns'

/**
 * Formats a date string or Date object to Norwegian date format "dd.MM.yyyy".
 * Accepts ISO strings, Date objects, or timestamps.
 *
 * @param date - The date to format (ISO string, Date, or number)
 * @returns Formatted date string in "dd.MM.yyyy" or empty string if invalid
 */
export function formatDateToNorwegian(date: string | Date | number | null | undefined): string {
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

  return format(dateObj, 'dd.MM.yyyy')
}
