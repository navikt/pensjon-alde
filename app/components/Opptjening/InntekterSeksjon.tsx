import { PlusIcon } from '@navikt/aksel-icons'
import { BodyShort, Box, Button, Heading, Select, Table, TextField } from '@navikt/ds-react'
import { useMemo } from 'react'
import { formatCurrencyNok } from '~/utils/currency'
import { HandlingKnapper } from './HandlingKnapper'
import { type InntektLinjeState, REQUIRED_KOMMUNE } from './opptjening.utils'
import type { InntektDTO, OpptjeningstyperResponse } from './opptjening-types'
import { StatusTag } from './StatusTag'

interface InntekterSeksjonProps {
  linjer: InntektLinjeState[]
  opptjeningstyper: OpptjeningstyperResponse
  readOnly: boolean
  kommuneFeil: Record<string, string>
  onLeggTil: () => void
  onSlett: (id: string) => void
  onGjenopprett: (id: string) => void
  onOppdater: (id: string, felt: keyof InntektDTO, verdi: string) => void
}

export function InntekterSeksjon({
  linjer,
  opptjeningstyper,
  readOnly,
  kommuneFeil,
  onLeggTil,
  onSlett,
  onGjenopprett,
  onOppdater,
}: InntekterSeksjonProps) {
  const sortert = useMemo(() => [...linjer].sort((a, b) => a.inntektAr - b.inntektAr), [linjer])

  return (
    <Box>
      <Heading size="small" level="3" spacing>
        Inntekter
      </Heading>
      {linjer.length === 0 ? (
        <BodyShort>Ingen inntektslinjer registrert.</BodyShort>
      ) : (
        <Box style={{ overflowX: 'auto' }}>
          <Table size="small">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Inntektstype</Table.HeaderCell>
                <Table.HeaderCell>År</Table.HeaderCell>
                <Table.HeaderCell>Beløp</Table.HeaderCell>
                <Table.HeaderCell>Skattekommune</Table.HeaderCell>
                {!readOnly && <Table.HeaderCell>Status</Table.HeaderCell>}
                {!readOnly && <Table.HeaderCell />}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {sortert.map(linje => {
                const erSlettet = linje._status === 'deleted'
                const kommuneKravet = REQUIRED_KOMMUNE[linje.inntektType]
                const kommuneDisabled = erSlettet || !!kommuneKravet
                return (
                  <Table.Row key={linje._id} style={erSlettet ? { opacity: 0.45 } : undefined}>
                    <Table.DataCell>
                      {readOnly ? (
                        (opptjeningstyper.inntekt.typer.find(t => t.code === linje.inntektType)?.description ??
                        linje.inntektType)
                      ) : (
                        <Select
                          label="Inntektstype"
                          size="small"
                          hideLabel
                          value={linje.inntektType}
                          onChange={e => onOppdater(linje._id, 'inntektType', e.target.value)}
                          disabled={erSlettet}
                          style={{ minWidth: '16rem' }}
                        >
                          {opptjeningstyper.inntekt.typer.map(t => (
                            <option key={t.code} value={t.code}>
                              {t.description}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Table.DataCell>
                    <Table.DataCell>
                      {readOnly ? (
                        linje.inntektAr
                      ) : (
                        <TextField
                          label="År"
                          hideLabel
                          value={linje.inntektAr?.toString() ?? ''}
                          onChange={e => onOppdater(linje._id, 'inntektAr', e.target.value)}
                          inputMode="numeric"
                          size="small"
                          disabled={erSlettet}
                          style={{ width: '5.5rem' }}
                        />
                      )}
                    </Table.DataCell>
                    <Table.DataCell>
                      {readOnly ? (
                        linje.belop != null ? (
                          formatCurrencyNok(linje.belop)
                        ) : (
                          '–'
                        )
                      ) : (
                        <TextField
                          label="Beløp"
                          hideLabel
                          value={linje.belop?.toString() ?? ''}
                          onChange={e => onOppdater(linje._id, 'belop', e.target.value)}
                          inputMode="decimal"
                          size="small"
                          disabled={erSlettet}
                          style={{ width: '9rem' }}
                        />
                      )}
                    </Table.DataCell>
                    <Table.DataCell>
                      {readOnly ? (
                        (linje.kommune ?? '–')
                      ) : (
                        <TextField
                          label="Skattekommune"
                          hideLabel
                          value={linje.kommune ?? ''}
                          onChange={e => onOppdater(linje._id, 'kommune', e.target.value)}
                          size="small"
                          disabled={kommuneDisabled}
                          error={!kommuneDisabled ? kommuneFeil[linje._id] : undefined}
                          style={{ width: '7rem' }}
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
            Legg til inntektslinje
          </Button>
        </Box>
      )}
    </Box>
  )
}
