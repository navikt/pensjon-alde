import { isValid, parseISO } from 'date-fns'

export function parseDate(date: string | Date | number | null | undefined): Date | null {
  if (!date) return null

  let dateObj: Date

  if (typeof date === 'string') {
    dateObj = parseISO(date)
    if (!isValid(dateObj)) {
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

  return isValid(dateObj) ? dateObj : null
}
