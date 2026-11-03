import { BodyShort, Box, Heading, Table, VStack } from '@navikt/ds-react'
import { useMemo } from 'react'
import { Fnr } from '~/components/Fnr'
import { HandlingKnapper } from '../Opptjening/HandlingKnapper'
import type { OpptjeningstyperResponse } from '../Opptjening/opptjening.types'
import { StatusTag } from '../Opptjening/StatusTag'
import { grupperOmsorgLinjer, type OmsorgLinjeState } from './omsorg.utils'

interface OmsorgSeksjonProps {
  linjer: OmsorgLinjeState[]
  opptjeningstyper: OpptjeningstyperResponse
  readOnly: boolean
  onSlett: (id: string) => void
  onGjenopprett: (id: string) => void
}

export function OmsorgSeksjon({ linjer, opptjeningstyper, readOnly, onSlett, onGjenopprett }: OmsorgSeksjonProps) {
  const grupper = useMemo(() => grupperOmsorgLinjer(linjer), [linjer])
  const visEndring = !readOnly || linjer.some(linje => linje._status !== 'original')

  return (
    <Box>
      {linjer.length === 0 ? (
        <BodyShort>Ingen omsorgslinjer registrert.</BodyShort>
      ) : (
        <VStack gap="space-24">
          {grupper.map(([fnr, omsorgLinjer]) => (
            <Box key={fnr ?? 'ukjent'} style={{ overflowX: 'auto' }}>
              <Heading size="xsmall" level="3" spacing>
                Omsorg for {fnr ? <Fnr value={fnr} /> : 'ukjent person'}
              </Heading>
              <Table size="small" aria-label={`Omsorg for ${fnr ?? 'ukjent person'}`}>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Type</Table.HeaderCell>
                    <Table.HeaderCell>År</Table.HeaderCell>
                    {visEndring && <Table.HeaderCell>Endring</Table.HeaderCell>}
                    {!readOnly && <Table.HeaderCell style={{ width: '14ch' }} />}
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {omsorgLinjer.map(linje => {
                    const erSlettet = linje._status === 'deleted'
                    return (
                      <Table.Row key={linje._id}>
                        <Table.DataCell style={erSlettet ? { opacity: 0.45 } : undefined}>
                          {opptjeningstyper.omsorg.typer.find(t => t.code === linje.omsorgType)?.description ??
                            linje.omsorgType}
                        </Table.DataCell>
                        <Table.DataCell style={erSlettet ? { opacity: 0.45 } : undefined}>{linje.ar}</Table.DataCell>
                        {visEndring && (
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
          ))}
        </VStack>
      )}
    </Box>
  )
}
