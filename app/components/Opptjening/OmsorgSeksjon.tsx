import { BodyShort, Box, Heading, Table } from '@navikt/ds-react'
import { useMemo } from 'react'
import { Fnr } from '~/components/Fnr'
import { HandlingKnapper } from './HandlingKnapper'
import type { OmsorgLinjeState } from './opptjening.utils'
import type { OpptjeningstyperResponse } from './opptjening-types'
import { StatusTag } from './StatusTag'

interface OmsorgSeksjonProps {
  linjer: OmsorgLinjeState[]
  opptjeningstyper: OpptjeningstyperResponse
  readOnly: boolean
  onSlett: (id: string) => void
  onGjenopprett: (id: string) => void
}

export function OmsorgSeksjon({ linjer, opptjeningstyper, readOnly, onSlett, onGjenopprett }: OmsorgSeksjonProps) {
  const sortert = useMemo(() => [...linjer].sort((a, b) => a.ar - b.ar), [linjer])

  return (
    <Box>
      <Heading size="small" level="3" spacing>
        Omsorg
      </Heading>
      {linjer.length === 0 ? (
        <BodyShort>Ingen omsorgslinjer registrert.</BodyShort>
      ) : (
        <Box style={{ overflowX: 'auto' }}>
          <Table size="small">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Type</Table.HeaderCell>
                <Table.HeaderCell>År</Table.HeaderCell>
                <Table.HeaderCell>Omsorg for (fnr)</Table.HeaderCell>
                {!readOnly && <Table.HeaderCell>Status</Table.HeaderCell>}
                {!readOnly && <Table.HeaderCell />}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {sortert.map(linje => {
                const erSlettet = linje._status === 'deleted'
                return (
                  <Table.Row key={linje._id} style={erSlettet ? { opacity: 0.45 } : undefined}>
                    <Table.DataCell>
                      {opptjeningstyper.omsorg.typer.find(t => t.code === linje.omsorgType)?.description ??
                        linje.omsorgType}
                    </Table.DataCell>
                    <Table.DataCell>{linje.ar}</Table.DataCell>
                    <Table.DataCell>{linje.fnrOmsorgFor ? <Fnr value={linje.fnrOmsorgFor} /> : '–'}</Table.DataCell>
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
    </Box>
  )
}
