import { isValid, parseISO } from 'date-fns'

/**
 * Parser en dato fra ulike inputformater til et Date-objekt.
 *
 * Aksepterer ISO-datostrenger, numeriske timestamps (millisekunder,
 * samme semantikk som `new Date(ms)`), Date-objekter, eller
 * numeriske strenger (f.eks. "1735689600000").
 *
 * `0` og `"0"` tolkes som gyldig input (Unix epoch, 1970-01-01), ikke
 * som en tom verdi. `null`, `undefined`, tom streng og whitespace-only
 * strenger returnerer `null`.
 *
 * @param date - Datoen som skal parses
 * @returns Et gyldig Date-objekt, eller `null` hvis input mangler eller ikke kan parses
 */
export function parseDate(date: string | Date | number | null | undefined): Date | null {
  if (date === null || date === undefined) return null
  if (typeof date === 'string' && date.trim() === '') return null

  let dateObj: Date

  if (typeof date === 'string') {
    dateObj = parseISO(date)
    if (!isValid(dateObj)) {
      const timestamp = Number(date.trim())
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
