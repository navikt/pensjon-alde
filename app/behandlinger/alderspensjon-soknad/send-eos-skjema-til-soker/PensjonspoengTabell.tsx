import { BodyShort } from '@navikt/ds-react'
import { DataGrid } from '@navikt/ds-react/PREVIEW'
import { useMemo, useState } from 'react'
import { formatCurrencyNok } from '~/utils/currency'
import { formatDateToNorwegian } from '~/utils/date'
import { type PensjonspoengRad, tilPensjonspoengRader } from './pensjonspoeng-rader'
import { sorterRader } from './sorter-rader'
import type { Pensjonspoeng } from './types'

const poengFormat = new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const tomVerdi = '–'

const formaterPoeng = (poeng: number | null) => (poeng != null ? poengFormat.format(poeng) : tomVerdi)

const kolonner: DataGrid.Columns<PensjonspoengRad> = [
  {
    id: 'ar',
    header: 'År',
    isRowHeader: true,
    isSortable: true,
    bodyCell: rad => rad.ar,
  },
  {
    id: 'pensjonsgivendeInntekt',
    header: 'Pensjonsgivende inntekt',
    align: 'right',
    bodyCell: rad => (rad.pensjonsgivendeInntekt != null ? formatCurrencyNok(rad.pensjonsgivendeInntekt) : tomVerdi),
  },
  {
    id: 'pensjonspoeng',
    header: 'Pensjonspoeng',
    align: 'right',
    bodyCell: rad => formaterPoeng(rad.pensjonspoeng),
  },
  {
    id: 'omsorgspoeng',
    header: 'Omsorgspoeng',
    align: 'right',
    bodyCell: rad => formaterPoeng(rad.omsorgspoeng),
  },
  {
    id: 'sisteRegistrertDato',
    header: 'Siste registrert dato',
    bodyCell: rad => formatDateToNorwegian(rad.sisteRegistrertDato) || tomVerdi,
  },
]

interface Props {
  pensjonspoeng: Pensjonspoeng[]
}

const standardSortering: DataGrid.Table.SortEntry[] = [{ columnId: 'ar', direction: 'desc' }]

export default function PensjonspoengTabell({ pensjonspoeng }: Props) {
  const [sortState, setSortState] = useState<DataGrid.Table.SortEntry[]>(standardSortering)

  const rader = useMemo(() => tilPensjonspoengRader(pensjonspoeng), [pensjonspoeng])
  const sorterteRader = useMemo(() => sorterRader(rader, sortState), [rader, sortState])

  const handleSortOrderChange: DataGrid.Table.Sorting['onSortOrderChange'] = newSortOrder => {
    setSortState(newSortOrder)
  }

  return (
    <DataGrid
      columns={kolonner}
      data={sorterteRader}
      getRowId={rad => rad.ar.toString()}
      defaultSettings={{ rowDensity: 'tight', textSize: 'small', zebraStripes: true }}
    >
      <DataGrid.Table
        aria-label="Pensjonspoeng"
        layout="auto"
        stickyHeader={false}
        sorting={{ sortOrder: sortState, onSortOrderChange: handleSortOrderChange }}
        emptyContent={<BodyShort size="small">Ingen pensjonspoeng registrert.</BodyShort>}
      />
    </DataGrid>
  )
}
