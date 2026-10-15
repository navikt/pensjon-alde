import { PlusIcon } from '@navikt/aksel-icons'
import {
  BodyShort,
  Box,
  Button,
  ErrorMessage,
  Heading,
  HStack,
  Select,
  Table,
  TextField,
  VStack,
} from '@navikt/ds-react'
import type { CSSProperties } from 'react'
import { HandlingKnapper } from '~/components/Opptjening/felles/HandlingKnapper'
import type { OpptjeningTypeKode } from '~/components/Opptjening/felles/opptjening.types'
import { StatusTag } from '~/components/Opptjening/felles/StatusTag'
import type { BelopFelt, InntektFeil, InntektFeilFelt, InntektFelt, InntektKategori } from './inntekt.types'
import { BELOP_FELTER, formaterBelop, type InntektLinjeState, inntektTypeLabel } from './inntekt.utils'

interface InntektTabellProps {
  kategori: InntektKategori
  tittel: string
  linjer: InntektLinjeState[]
  typer: OpptjeningTypeKode[]
  feil: Record<string, InntektFeil>
  redigerbar: boolean
  visEndring: boolean
  erIRedigering: (linje: InntektLinjeState) => boolean
  visFeil: (id: string, felt: InntektFeilFelt) => boolean
  onBerort: (id: string, felter: InntektFeilFelt[]) => void
  onRediger: (id: string, rediger: boolean) => void
  onLeggTil: (kategori: InntektKategori) => void
  onSlett: (id: string) => void
  onGjenopprett: (id: string) => void
  onTilbakestill: (id: string) => void
  onOppdater: (id: string, felt: InntektFelt, verdi: string) => void
}

export function InntektTabell({
  kategori,
  tittel,
  linjer,
  typer,
  feil,
  redigerbar,
  visEndring,
  erIRedigering,
  visFeil,
  onBerort,
  onRediger,
  onLeggTil,
  onSlett,
  onGjenopprett,
  onTilbakestill,
  onOppdater,
}: InntektTabellProps) {
  const belopFelter = BELOP_FELTER[kategori]
  const feilRekkefolge: InntektFeilFelt[] = [
    'inntektAr',
    'inntektsType',
    '_duplikat',
    ...belopFelter.map(({ felt }) => felt),
    '_belop',
  ]
  const antallKolonner = 2 + belopFelter.length + (visEndring ? 1 : 0) + (redigerbar ? 1 : 0)

  return (
    <Box>
      <Heading size="xsmall" level="3" spacing>
        {tittel}
      </Heading>
      {linjer.length === 0 ? (
        <BodyShort>Ingen {tittel.toLowerCase()} registrert.</BodyShort>
      ) : (
        <Box style={{ overflowX: 'auto' }}>
          <Table size="small" aria-label={tittel}>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>År</Table.HeaderCell>
                <Table.HeaderCell>Type</Table.HeaderCell>
                {belopFelter.map(({ felt, label }) => (
                  <Table.HeaderCell key={felt} align="right">
                    {label}
                  </Table.HeaderCell>
                ))}
                {visEndring && <Table.HeaderCell>Endring</Table.HeaderCell>}
                {redigerbar && <Table.HeaderCell />}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {linjer.flatMap(linje => {
                const erSlettet = linje._status === 'deleted'
                const redigerer = redigerbar && !erSlettet && erIRedigering(linje)
                const linjeFeil = feil[linje._id] ?? {}
                const synligeFeil = redigerer
                  ? feilRekkefolge.filter(felt => linjeFeil[felt] && visFeil(linje._id, felt))
                  : []
                const feilId = `inntekt-feil-${linje._id}`
                const harFeil = (felt: InntektFeilFelt) => synligeFeil.includes(felt)
                const harBelopFeil = (felt: BelopFelt) => harFeil(felt) || harFeil('_belop')
                const feilProps = (erFeil: boolean) => ({
                  error: erFeil,
                  'aria-describedby': erFeil ? feilId : undefined,
                })
                const celleStil: CSSProperties = {
                  ...(erSlettet ? { opacity: 0.45 } : {}),
                  ...(synligeFeil.length > 0 ? { borderBottom: 'none' } : {}),
                }
                const typeValg = typer.some(t => t.code === linje.inntektsType)
                  ? typer
                  : [...typer, { code: linje.inntektsType, description: linje.inntektsType }]

                const rad = (
                  <Table.Row key={linje._id}>
                    <Table.DataCell style={celleStil}>
                      {redigerer ? (
                        <TextField
                          label="År"
                          hideLabel
                          size="small"
                          inputMode="numeric"
                          value={linje.inntektAr}
                          {...feilProps(harFeil('inntektAr') || harFeil('_duplikat'))}
                          onChange={e => onOppdater(linje._id, 'inntektAr', e.target.value)}
                          onBlur={() => onBerort(linje._id, ['inntektAr', '_duplikat'])}
                          style={{ width: '5.5rem' }}
                        />
                      ) : (
                        linje.inntektAr
                      )}
                    </Table.DataCell>
                    <Table.DataCell style={celleStil}>
                      {redigerer ? (
                        <Select
                          label="Type"
                          hideLabel
                          size="small"
                          value={linje.inntektsType}
                          {...feilProps(harFeil('inntektsType') || harFeil('_duplikat'))}
                          onChange={e => onOppdater(linje._id, 'inntektsType', e.target.value)}
                          onBlur={() => onBerort(linje._id, ['inntektsType', '_duplikat'])}
                          style={{ minWidth: '12rem' }}
                        >
                          {!linje.inntektsType && <option value="">Velg type</option>}
                          {typeValg
                            .filter(t => t.code)
                            .map(t => (
                              <option key={t.code} value={t.code}>
                                {t.description}
                              </option>
                            ))}
                        </Select>
                      ) : (
                        inntektTypeLabel(typer, linje.inntektsType)
                      )}
                    </Table.DataCell>
                    {belopFelter.map(({ felt, label }) => (
                      <Table.DataCell key={felt} align="right" style={celleStil}>
                        {redigerer ? (
                          <TextField
                            label={label}
                            hideLabel
                            size="small"
                            inputMode="numeric"
                            value={linje[felt] ?? ''}
                            {...feilProps(harBelopFeil(felt))}
                            onChange={e => onOppdater(linje._id, felt, e.target.value)}
                            onBlur={() => onBerort(linje._id, [felt, '_belop'])}
                            style={{ width: '8.5rem', textAlign: 'right' }}
                          />
                        ) : (
                          formaterBelop(linje[felt]) || '–'
                        )}
                      </Table.DataCell>
                    ))}
                    {visEndring && (
                      <Table.DataCell style={celleStil}>
                        <StatusTag status={linje._status} />
                      </Table.DataCell>
                    )}
                    {redigerbar && (
                      <Table.DataCell style={{ ...celleStil, opacity: undefined }}>
                        <HStack gap="space-4" wrap={false} justify="end">
                          {!erSlettet && linje._status !== 'new' && (
                            <Button
                              type="button"
                              variant="tertiary"
                              size="small"
                              onClick={() => onRediger(linje._id, !redigerer)}
                            >
                              {redigerer ? 'Ferdig' : 'Endre'}
                            </Button>
                          )}
                          {linje._status === 'modified' && (
                            <Button
                              type="button"
                              variant="tertiary"
                              size="small"
                              onClick={() => onTilbakestill(linje._id)}
                            >
                              Angre
                            </Button>
                          )}
                          <HandlingKnapper linje={linje} onSlett={onSlett} onGjenopprett={onGjenopprett} />
                        </HStack>
                      </Table.DataCell>
                    )}
                  </Table.Row>
                )

                if (synligeFeil.length === 0) return [rad]

                return [
                  rad,
                  <Table.Row key={`${linje._id}-feil`}>
                    <Table.DataCell colSpan={antallKolonner} style={{ paddingTop: 0 }}>
                      <VStack gap="space-4" id={feilId}>
                        {synligeFeil.map(felt => (
                          <ErrorMessage key={felt} size="small" showIcon>
                            {linjeFeil[felt]}
                          </ErrorMessage>
                        ))}
                      </VStack>
                    </Table.DataCell>
                  </Table.Row>,
                ]
              })}
            </Table.Body>
          </Table>
        </Box>
      )}
      {redigerbar && (
        <Box marginBlock="space-12 space-0">
          <Button
            type="button"
            variant="secondary"
            size="small"
            icon={<PlusIcon aria-hidden />}
            onClick={() => onLeggTil(kategori)}
          >
            Legg til {tittel.toLowerCase()}
          </Button>
        </Box>
      )}
    </Box>
  )
}
