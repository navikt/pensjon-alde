import { format } from 'date-fns'
import { parseDate } from './parseDate'

/**
 * Formats a date string or Date object to Norwegian date format "dd.MM.yyyy".
 * Accepts ISO strings, Date objects, or timestamps.
 *
 * @param date - The date to format (ISO string, Date, or number)
 * @param options - Optional configuration object
 * @param options.showTime - If true, adds time in 24-hour format (HH:mm)
 * @param options.onlyTimeIfSameDate - If true and the date is the same day as today, formats only as 'HH:mm'
 * @returns Formatted date string in "dd.MM.yyyy" or "dd.MM.yyyy HH:mm" if showTime is true, or "HH:mm" if onlyTimeIfSameDate is true and date is today, or empty string if invalid
 */
export function formatDateToNorwegian(
  date: string | Date | number | null | undefined,
  options?: { showTime?: boolean; onlyTimeIfSameDate?: boolean },
): string {
  const dateObj = parseDate(date)
  if (!dateObj) return ''

  const isSameDay = format(dateObj, 'dd.MM.yyyy') === format(new Date(), 'dd.MM.yyyy')
  if (options?.onlyTimeIfSameDate && isSameDay) {
    return format(dateObj, 'HH:mm')
  }

  return format(dateObj, options?.showTime ? "dd.MM.yyyy - 'kl.' HH:mm" : 'dd.MM.yyyy')
}
