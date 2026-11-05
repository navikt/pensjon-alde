import { ArrowUndoIcon, PlusIcon, TrashIcon } from '@navikt/aksel-icons'
import {
  Box,
  Button,
  Checkbox,
  DatePicker,
  Heading,
  HStack,
  Tag,
  TextField,
  useDatepicker,
  VStack,
} from '@navikt/ds-react'
import { DataGrid } from '@navikt/ds-react/PREVIEW/DataGrid'
import { format } from 'date-fns'
import { parseDate } from '~/utils/date'
import {
  finnPeriodeStatus,
  type Periode,
  type PeriodeFeil,
  type PeriodeStatus,
  type RedigerbarPeriode,
  validerPeriode,
} from './trygdetid-perioder'
import type { ArMndDager } from './types'

const STATUS_TAG: Record<PeriodeStatus, { label: string; variant: 'neutral' | 'info' | 'success' | 'error' }> = {
  UENDRET: { label: 'Uendret', variant: 'neutral' },
  ENDRET: { label: 'Endret', variant: 'info' },
  LAGT_TIL: { label: 'Ny', variant: 'success' },
  FJERNET: { label: 'Fjernet', variant: 'error' },
}

function DatoCelle({
  label,
  value,
  error,
  readOnly,
  onChange,
}: {
  label: string
  value: string | null
  error?: string
  readOnly: boolean
  onChange: (verdi: string | null) => void
}) {
  const { inputProps, datepickerProps } = useDatepicker({
    defaultSelected: parseDate(value) ?? undefined,
    onDateChange: dato => onChange(dato ? format(dato, 'yyyy-MM-dd') : null),
  })

  return (
    <DatePicker dropdownCaption {...datepickerProps}>
      <DatePicker.Input {...inputProps} label={label} hideLabel size="small" readOnly={readOnly} error={error} />
    </DatePicker>
  )
}

export function formatLengde({ ar, mnd, dager }: ArMndDager) {
  return `${ar} år, ${mnd} mnd, ${dager} dager`
}

type PeriodeTabellProps<T extends Periode> = {
  tittel: string
  perioder: RedigerbarPeriode<T>[]
  originale: Map<string, T>
  readOnly: boolean
  visValideringsfeil: boolean
  ekstraKolonner?: (
    oppdater: (radId: string, endring: Partial<T>) => void,
    erLåst: (periode: RedigerbarPeriode<T>) => boolean,
  ) => DataGrid.Columns<RedigerbarPeriode<T>>
  onOppdater: (radId: string, endring: Partial<T>) => void
  onFjern: (radId: string) => void
  onAngreFjern: (radId: string) => void
  onLeggTil: () => void
}

export function PeriodeTabell<T extends Periode>({
  tittel,
  perioder,
  originale,
  readOnly,
  visValideringsfeil,
  ekstraKolonner,
  onOppdater,
  onFjern,
  onAngreFjern,
  onLeggTil,
}: PeriodeTabellProps<T>) {
  const erLåst = (periode: RedigerbarPeriode<T>) => readOnly || periode.state === 'FJERNET'
  const feilFor = (periode: RedigerbarPeriode<T>): PeriodeFeil => (visValideringsfeil ? validerPeriode(periode) : {})
  const statusFor = (periode: RedigerbarPeriode<T>) => finnPeriodeStatus(periode, originale.get(periode.radId))

  const kolonner: DataGrid.Columns<RedigerbarPeriode<T>> = [
    {
      id: 'status',
      header: 'Status',
      width: { value: '8ch' },
      headerCell: <Box width="8ch">Status</Box>,
      bodyCell: periode => {
        const { label, variant } = STATUS_TAG[statusFor(periode)]
        return (
          <Box width="8ch">
            <Tag variant={variant}>{label}</Tag>
          </Box>
        )
      },
    },
    {
      id: 'land',
      header: 'Land',
      isRowHeader: true,
      bodyCell: periode => (
        <TextField
          label="Land"
          hideLabel
          size="small"
          htmlSize={5}
          maxLength={3}
          value={periode.land}
          readOnly={erLåst(periode)}
          error={feilFor(periode).land}
          onChange={event => onOppdater(periode.radId, { land: event.target.value.toUpperCase() } as Partial<T>)}
        />
      ),
    },
    {
      id: 'fomDato',
      header: 'Fra og med',
      bodyCell: periode => (
        <DatoCelle
          label="Fra og med"
          value={periode.fomDato}
          readOnly={erLåst(periode)}
          error={feilFor(periode).fomDato}
          onChange={fomDato => onOppdater(periode.radId, { fomDato } as Partial<T>)}
        />
      ),
    },
    {
      id: 'tomDato',
      header: 'Til og med',
      bodyCell: periode => (
        <DatoCelle
          label="Til og med"
          value={periode.tomDato}
          readOnly={erLåst(periode)}
          error={feilFor(periode).tomDato}
          onChange={tomDato => onOppdater(periode.radId, { tomDato } as Partial<T>)}
        />
      ),
    },
    ...(ekstraKolonner?.(onOppdater, erLåst) ?? []),
    {
      id: 'ikkeProRata',
      header: 'Ikke pro rata',
      bodyCell: periode => (
        <Checkbox
          hideLabel
          size="small"
          checked={periode.ikkeProRata}
          readOnly={erLåst(periode)}
          onChange={event => onOppdater(periode.radId, { ikkeProRata: event.target.checked } as Partial<T>)}
        >
          Ikke pro rata
        </Checkbox>
      ),
    },
    {
      id: 'trygdetid',
      header: 'Trygdetid',
      bodyCell: periode => (statusFor(periode) === 'UENDRET' ? formatLengde(periode.lengde) : '-'),
    },
    {
      id: 'kilde',
      header: 'Kilde',
      bodyCell: periode => periode.grunnlagKildeCode ?? '-',
    },
  ]

  if (!readOnly) {
    kolonner.push({
      id: 'handlinger',
      header: 'Handlinger',
      bodyCell: periode =>
        periode.state === 'FJERNET' ? (
          <Button
            type="button"
            size="xsmall"
            variant="tertiary"
            icon={<ArrowUndoIcon aria-hidden />}
            onClick={() => onAngreFjern(periode.radId)}
          >
            Angre
          </Button>
        ) : (
          <Button
            type="button"
            size="xsmall"
            variant="tertiary"
            icon={<TrashIcon aria-hidden />}
            onClick={() => onFjern(periode.radId)}
          >
            Fjern
          </Button>
        ),
    })
  }

  return (
    <VStack gap="space-8">
      <HStack justify="space-between" align="center">
        <Heading size="xsmall" level="2">
          {tittel}
        </Heading>
        {!readOnly && (
          <Button type="button" size="small" variant="secondary" icon={<PlusIcon aria-hidden />} onClick={onLeggTil}>
            Legg til periode
          </Button>
        )}
      </HStack>
      <DataGrid columns={kolonner} data={perioder} getRowId={periode => periode.radId}>
        <DataGrid.Table layout="auto" stickyHeader={false} emptyContent="Ingen perioder registrert" />
      </DataGrid>
    </VStack>
  )
}
