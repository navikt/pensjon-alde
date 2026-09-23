import { PlusIcon } from '@navikt/aksel-icons'
import { BodyShort, Box, Button, Heading, Select, Table } from '@navikt/ds-react'
import { DatoVelgerCell } from './DatoVelgerCell'
import { HandlingKnapper } from './HandlingKnapper'
import type { ForstegangstjenesteLinjeState } from './opptjening.utils'
import type { ForstegangstjenesteDTO, OpptjeningstyperResponse } from './opptjening-types'
import { StatusTag } from './StatusTag'

const TIDLIGSTE_DATO = new Date(2010, 0, 1)

interface ForstegangstjenesteSeksjonProps {
  linjer: ForstegangstjenesteLinjeState[]
  opptjeningstyper: OpptjeningstyperResponse
  readOnly: boolean
  fomFeil: Record<string, string>
  onLeggTil: () => void
  onSlett: (id: string) => void
  onGjenopprett: (id: string) => void
  onOppdater: (id: string, felt: keyof ForstegangstjenesteDTO, verdi: string) => void
}

export function ForstegangstjenesteSeksjon({
  linjer,
  opptjeningstyper,
  readOnly,
  fomFeil,
  onLeggTil,
  onSlett,
  onGjenopprett,
  onOppdater,
}: ForstegangstjenesteSeksjonProps) {
  return (
    <Box>
      <Heading size="small" level="3" spacing>
        Førstegangstjeneste
      </Heading>
      {linjer.length === 0 ? (
        <BodyShort>Ingen førstegangstjenestelinjer registrert.</BodyShort>
      ) : (
        <Box style={{ overflowX: 'auto' }}>
          <Table size="small">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Type</Table.HeaderCell>
                <Table.HeaderCell>Periodetype</Table.HeaderCell>
                <Table.HeaderCell>FOM</Table.HeaderCell>
                <Table.HeaderCell>TOM</Table.HeaderCell>
                {!readOnly && <Table.HeaderCell>Status</Table.HeaderCell>}
                {!readOnly && <Table.HeaderCell />}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {linjer.map(linje => {
                const erSlettet = linje._status === 'deleted'
                return (
                  <Table.Row key={linje._id} style={erSlettet ? { opacity: 0.45 } : undefined}>
                    <Table.DataCell>
                      {readOnly ? (
                        (opptjeningstyper.forstegangstjeneste.typer.find(t => t.code === linje.tjenesteType)
                          ?.description ?? linje.tjenesteType)
                      ) : (
                        <Select
                          label="Type"
                          size="small"
                          hideLabel
                          value={linje.tjenesteType}
                          onChange={e => onOppdater(linje._id, 'tjenesteType', e.target.value)}
                          disabled={erSlettet}
                          style={{ minWidth: '12rem' }}
                        >
                          {opptjeningstyper.forstegangstjeneste.typer.map(t => (
                            <option key={t.code} value={t.code}>
                              {t.description}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Table.DataCell>
                    <Table.DataCell>
                      {readOnly ? (
                        (opptjeningstyper.forstegangstjeneste.subTyper.find(t => t.code === linje.periodeType)
                          ?.description ??
                        linje.periodeType ??
                        '–')
                      ) : (
                        <Select
                          label="Periodetype"
                          size="small"
                          hideLabel
                          value={linje.periodeType ?? ''}
                          onChange={e => onOppdater(linje._id, 'periodeType', e.target.value)}
                          disabled={erSlettet}
                          style={{ minWidth: '10rem' }}
                        >
                          <option value="">–</option>
                          {opptjeningstyper.forstegangstjeneste.subTyper.map(t => (
                            <option key={t.code} value={t.code}>
                              {t.description}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Table.DataCell>
                    <Table.DataCell>
                      {readOnly ? (
                        linje.fomDato || '–'
                      ) : (
                        <DatoVelgerCell
                          value={linje.fomDato}
                          label="FOM"
                          disabled={erSlettet}
                          error={!erSlettet ? fomFeil[linje._id] : undefined}
                          fromDate={TIDLIGSTE_DATO}
                          onChange={val => onOppdater(linje._id, 'fomDato', val)}
                        />
                      )}
                    </Table.DataCell>
                    <Table.DataCell>
                      {readOnly ? (
                        linje.tomDato || '–'
                      ) : (
                        <DatoVelgerCell
                          value={linje.tomDato}
                          label="TOM"
                          disabled={erSlettet}
                          fromDate={TIDLIGSTE_DATO}
                          onChange={val => onOppdater(linje._id, 'tomDato', val)}
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
            Legg til førstegangstjeneste
          </Button>
        </Box>
      )}
    </Box>
  )
}
