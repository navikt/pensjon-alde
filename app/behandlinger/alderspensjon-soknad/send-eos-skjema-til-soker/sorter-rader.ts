export type SortEntry = { columnId: string; direction: 'asc' | 'desc' }

function sammenlign(a: unknown, b: unknown): number {
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b)
  if (typeof a === 'number' && typeof b === 'number') return a - b
  // null/undefined sist
  if (a == null && b != null) return 1
  if (a != null && b == null) return -1
  return 0
}

/**
 * Sorterer rader etter sorteringsrekkefølgen fra DataGrid (`onSortOrderChange`).
 * `columnId` må tilsvare et felt på raden. Sorteringen er stabil.
 * Basert på Aksel sitt sorteringseksempel for DataGrid.
 */
export function sorterRader<T extends object>(rader: T[], sortOrder: SortEntry[]): T[] {
  if (sortOrder.length === 0) return rader

  return rader.slice().sort((a, b) => {
    for (const sort of sortOrder) {
      const kolonne = sort.columnId as keyof T
      const resultat = sammenlign(a[kolonne], b[kolonne])
      if (resultat !== 0) {
        return sort.direction === 'asc' ? resultat : -resultat
      }
    }
    return 0
  })
}
