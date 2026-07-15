import { parseDate } from './parseDate'

/**
 * Formats a date string or Date object to Norwegian month and year format "januar 2028".
 * Accepts ISO strings, Date objects, or timestamps.
 *
 * @param date - The date to format (ISO string, Date, or number)
 * @returns Formatted date string in "Month Year" format or empty string if invalid
 */
export function toMonthAndYear(date: string | Date | number | null | undefined): string {
  const dateObj = parseDate(date)
  if (!dateObj) return ''

  const formatted = dateObj.toLocaleDateString('nb-NO', {
    month: 'long',
    year: 'numeric',
  })

  // Capitalize first letter
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}
