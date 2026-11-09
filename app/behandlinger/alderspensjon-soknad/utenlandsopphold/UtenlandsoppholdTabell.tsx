import { BodyShort } from '@navikt/ds-react'
import { DataGrid } from '@navikt/ds-react/PREVIEW'
import { useMemo, useState } from 'react'
import { formatDateToNorwegian } from '~/utils/date'
import { landnavn } from '~/utils/landkode'
import { sorterRader } from '~/utils/sorter-rader'
import type { Utenlandsopphold } from './types'

const tomVerdi = '–'

export interface UtenlandsoppholdRad {
  id: string
  fom: string | null
  tom: string | null
  land: string | null
  bodd: boolean | null
  arbeidet: boolean | null
}

export function tilUtenlandsoppholdRader(utenlandsopphold: Utenlandsopphold[]): UtenlandsoppholdRad[] {
  return utenlandsopphold.map((opphold, index) => ({
    id: opphold.utenlandsoppholdId?.toString() ?? `${opphold.fom ?? 'ukjent'}-${index}`,
    fom: opphold.fom,
    tom: opphold.tom,
    land: landnavn(opphold.land),
    bodd: opphold.bodd,
    arbeidet: opphold.arbeidet,
  }))
}

const jaNei = (verdi: boolean | null) => (verdi == null ? tomVerdi : verdi ? 'Ja' : 'Nei')

const kolonner: DataGrid.Columns<UtenlandsoppholdRad> = [
  {
    id: 'fom',
    header: 'Fra og med',
    isRowHeader: true,
    isSortable: true,
    bodyCell: rad => formatDateToNorwegian(rad.fom) || tomVerdi,
  },
  {
    id: 'tom',
    header: 'Til og med',
    isSortable: true,
    bodyCell: rad => formatDateToNorwegian(rad.tom) || tomVerdi,
  },
  {
    id: 'land',
    header: 'Land',
    isSortable: true,
    bodyCell: rad => rad.land ?? tomVerdi,
  },
  {
    id: 'bodd',
    header: 'Bodd',
    bodyCell: rad => jaNei(rad.bodd),
  },
  {
    id: 'arbeidet',
    header: 'Arbeidet',
    bodyCell: rad => jaNei(rad.arbeidet),
  },
]

const standardSortering: DataGrid.Table.SortEntry[] = [{ columnId: 'fom', direction: 'desc' }]

interface Props {
  utenlandsopphold: Utenlandsopphold[]
}

export default function UtenlandsoppholdTabell({ utenlandsopphold }: Props) {
  const [sortState, setSortState] = useState<DataGrid.Table.SortEntry[]>(standardSortering)

  const rader = useMemo(() => tilUtenlandsoppholdRader(utenlandsopphold), [utenlandsopphold])
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
        aria-label="Utenlandsopphold"
        layout="auto"
        stickyHeader={false}
        sorting={{ sortOrder: sortState, onSortOrderChange: handleSortOrderChange }}
        emptyContent={<BodyShort size="small">Ingen utenlandsopphold registrert.</BodyShort>}
      />
    </DataGrid>
  )
}
