import { PlusIcon } from '@navikt/aksel-icons'
import { BodyShort, Box, Button, Heading, Select, Table, TextField } from '@navikt/ds-react'
import { useMemo } from 'react'
import { formatCurrencyNok } from '~/utils/currency'
import { HandlingKnapper } from './HandlingKnapper'
import type { DagpengerLinjeState } from './opptjening.utils'
import type { DagpengerDTO, OpptjeningstyperResponse } from './opptjening-types'
import { StatusTag } from './StatusTag'

interface DagpengerSeksjonProps {
  linjer: DagpengerLinjeState[]
  opptjeningstyper: OpptjeningstyperResponse
  readOnly: boolean
  onLeggTil: () => void
  onSlett: (id: string) => void
  onGjenopprett: (id: string) => void
  onOppdater: (id: string, felt: keyof DagpengerDTO, verdi: string) => void
}

export function DagpengerSeksjon({
  linjer,
  opptjeningstyper,
  readOnly,
  onLeggTil,
  onSlett,
  onGjenopprett,
  onOppdater,
}: DagpengerSeksjonProps) {
  const sortert = useMemo(() => [...linjer].sort((a, b) => a.ar - b.ar), [linjer])

  return (
    <Box>
      <Heading size="small" level="3" spacing>
        Dagpenger
      </Heading>
      {linjer.length === 0 ? (
        <BodyShort>Ingen dagpengelinjer registrert.</BodyShort>
      ) : (
        <Box style={{ overflowX: 'auto' }}>
          <Table size="small">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Type</Table.HeaderCell>
                <Table.HeaderCell>År</Table.HeaderCell>
                <Table.HeaderCell>Uavkortet grunnlag</Table.HeaderCell>
                <Table.HeaderCell>Utbetalte dagpenger</Table.HeaderCell>
                <Table.HeaderCell>Ferietillegg</Table.HeaderCell>
                <Table.HeaderCell>Barnetillegg</Table.HeaderCell>
                {!readOnly && <Table.HeaderCell>Status</Table.HeaderCell>}
                {!readOnly && <Table.HeaderCell />}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {sortert.map(linje => {
                const erSlettet = linje._status === 'deleted'
                const erFerietillegg = linje.dagpengerType === 'DP_FF'
                return (
                  <Table.Row key={linje._id} style={erSlettet ? { opacity: 0.45 } : undefined}>
                    <Table.DataCell>
                      {readOnly ? (
                        (opptjeningstyper.dagpenger.typer.find(t => t.code === linje.dagpengerType)?.description ??
                        linje.dagpengerType)
                      ) : (
                        <Select
                          label="Type"
                          size="small"
                          hideLabel
                          value={linje.dagpengerType}
                          onChange={e => onOppdater(linje._id, 'dagpengerType', e.target.value)}
                          disabled={erSlettet}
                          style={{ minWidth: '14rem' }}
                        >
                          {opptjeningstyper.dagpenger.typer.map(t => (
                            <option key={t.code} value={t.code}>
                              {t.description}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Table.DataCell>
                    <Table.DataCell>
                      {readOnly ? (
                        linje.ar
                      ) : (
                        <TextField
                          label="År"
                          hideLabel
                          value={linje.ar?.toString() ?? ''}
                          onChange={e => onOppdater(linje._id, 'ar', e.target.value)}
                          inputMode="numeric"
                          size="small"
                          disabled={erSlettet}
                          style={{ width: '5.5rem' }}
                        />
                      )}
                    </Table.DataCell>
                    <Table.DataCell>
                      {readOnly ? (
                        linje.uavkortetDagpengegrunnlag != null ? (
                          formatCurrencyNok(linje.uavkortetDagpengegrunnlag)
                        ) : (
                          '–'
                        )
                      ) : (
                        <TextField
                          label="Uavkortet grunnlag"
                          hideLabel
                          value={linje.uavkortetDagpengegrunnlag?.toString() ?? ''}
                          onChange={e => onOppdater(linje._id, 'uavkortetDagpengegrunnlag', e.target.value)}
                          inputMode="decimal"
                          size="small"
                          disabled={erSlettet || erFerietillegg}
                          style={{ width: '9rem' }}
                        />
                      )}
                    </Table.DataCell>
                    <Table.DataCell>
                      {readOnly ? (
                        linje.utbetalteDagpenger != null ? (
                          formatCurrencyNok(linje.utbetalteDagpenger)
                        ) : (
                          '–'
                        )
                      ) : (
                        <TextField
                          label="Utbetalte dagpenger"
                          hideLabel
                          value={linje.utbetalteDagpenger?.toString() ?? ''}
                          onChange={e => onOppdater(linje._id, 'utbetalteDagpenger', e.target.value)}
                          inputMode="decimal"
                          size="small"
                          disabled={erSlettet}
                          style={{ width: '9rem' }}
                        />
                      )}
                    </Table.DataCell>
                    <Table.DataCell>
                      {readOnly ? (
                        linje.ferietillegg != null ? (
                          formatCurrencyNok(linje.ferietillegg)
                        ) : (
                          '–'
                        )
                      ) : (
                        <TextField
                          label="Ferietillegg"
                          hideLabel
                          value={linje.ferietillegg?.toString() ?? ''}
                          onChange={e => onOppdater(linje._id, 'ferietillegg', e.target.value)}
                          inputMode="decimal"
                          size="small"
                          disabled={erSlettet || erFerietillegg}
                          style={{ width: '9rem' }}
                        />
                      )}
                    </Table.DataCell>
                    <Table.DataCell>
                      {readOnly ? (
                        linje.barnetillegg != null ? (
                          formatCurrencyNok(linje.barnetillegg)
                        ) : (
                          '–'
                        )
                      ) : (
                        <TextField
                          label="Barnetillegg"
                          hideLabel
                          value={linje.barnetillegg?.toString() ?? ''}
                          onChange={e => onOppdater(linje._id, 'barnetillegg', e.target.value)}
                          inputMode="decimal"
                          size="small"
                          disabled={erSlettet}
                          style={{ width: '9rem' }}
                        />
                      )}
                    </Table.DataCell>
                    {!readOnly && (
                      <Table.DataCell>
                        <StatusTag status={linje._status} />
                      </Table.DataCell>
                    )}
                    {!readOnly && (
                      <Table.DataCell>
                        <HandlingKnapper linje={linje} onSlett={onSlett} onGjenopprett={onGjenopprett} />
                      </Table.DataCell>
                    )}
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table>
        </Box>
      )}
      {!readOnly && (
        <Box marginBlock="space-12 space-0">
          <Button type="button" variant="secondary" size="small" icon={<PlusIcon aria-hidden />} onClick={onLeggTil}>
            Legg til dagpengelinje
          </Button>
        </Box>
      )}
    </Box>
  )
}
