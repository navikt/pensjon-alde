import { BodyShort } from '@navikt/ds-react'
import { DataGrid } from '@navikt/ds-react/PREVIEW'
import { useMemo, useState } from 'react'
import { formatCurrencyNok } from '~/utils/currency'
import { formatDateToNorwegian } from '~/utils/date'
import { sorterRader } from '~/utils/sorter-rader'
import { type BeholdningRad, tilBeholdningRader } from './beholdning-rader'
import type { Beholdning } from './types'

const tomVerdi = '–'

const kolonner: DataGrid.Columns<BeholdningRad> = [
  {
    id: 'ar',
    header: 'År',
    isRowHeader: true,
    isSortable: true,
    bodyCell: rad => rad.ar ?? tomVerdi,
  },
  {
    id: 'dato',
    header: 'Dato',
    bodyCell: rad => formatDateToNorwegian(rad.dato) || tomVerdi,
  },
  {
    id: 'pensjonsbeholdning',
    header: 'Pensjonsbeholdning',
    align: 'right',
    bodyCell: rad => (rad.pensjonsbeholdning != null ? formatCurrencyNok(rad.pensjonsbeholdning) : tomVerdi),
  },
]

interface Props {
  beholdninger: Beholdning[]
}

const standardSortering: DataGrid.Table.SortEntry[] = [{ columnId: 'ar', direction: 'desc' }]

export default function PensjonsbeholdningTabell({ beholdninger }: Props) {
  const [sortState, setSortState] = useState<DataGrid.Table.SortEntry[]>(standardSortering)

  const rader = useMemo(() => tilBeholdningRader(beholdninger), [beholdninger])
  const sorterteRader = useMemo(() => sorterRader(rader, sortState), [rader, sortState])

  const handleSortOrderChange: DataGrid.Table.Sorting['onSortOrderChange'] = newSortOrder => {
    setSortState(newSortOrder)
  }

  return (
    <DataGrid
      columns={kolonner}
      data={sorterteRader}
      getRowId={rad => rad.id}
      defaultSettings={{ rowDensity: 'tight', textSize: 'small', zebraStripes: true }}
    >
      <DataGrid.Table
        aria-label="Pensjonsbeholdning"
        layout="auto"
        stickyHeader={false}
        sorting={{ sortOrder: sortState, onSortOrderChange: handleSortOrderChange }}
        emptyContent={<BodyShort size="small">Ingen pensjonsbeholdning registrert.</BodyShort>}
      />
    </DataGrid>
  )
}
