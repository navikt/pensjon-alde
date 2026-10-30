export type SortEntry = { columnId: string; direction: 'asc' | 'desc' }

function sammenlign(a: unknown, b: unknown): number {
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b)
  if (typeof a === 'number' && typeof b === 'number') return a - b
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
      const aVerdi = a[kolonne]
      const bVerdi = b[kolonne]

      // Tomme verdier sist, uavhengig av sorteringsretning
      if (aVerdi == null && bVerdi != null) return 1
      if (aVerdi != null && bVerdi == null) return -1

      const resultat = sammenlign(aVerdi, bVerdi)
      if (resultat !== 0) {
        return sort.direction === 'asc' ? resultat : -resultat
      }
    }
    return 0
  })
}
