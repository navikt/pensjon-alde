import {
  Box,
  Button,
  Detail,
  ErrorMessage,
  Heading,
  HelpText,
  HStack,
  Select,
  Table,
  TextField,
  VStack,
} from '@navikt/ds-react'
import type { CSSProperties } from 'react'
import { HandlingKnapper } from './HandlingKnapper'
import styles from './InntektSeksjon.module.css'
import type { BelopFelt, InntektFeil, InntektFeilFelt, InntektFelt, InntektKategori } from './inntekt.types'
import { BELOP_FELTER, formaterBelop, type InntektLinjeState, inntektFeltId, inntektTypeLabel } from './inntekt.utils'
import type { OpptjeningTypeKode } from './opptjening.types'
import { StatusTag } from './StatusTag'

const SLETTET_STIL: CSSProperties = { color: 'var(--ax-text-neutral-subtle)' }

interface InntektTabellProps {
  kategori: InntektKategori
  tittel: string
  kontekst: string
  headingLevel: '3' | '4'
  linjer: InntektLinjeState[]
  typer: OpptjeningTypeKode[]
  feil: Record<string, InntektFeil>
  redigerbar: boolean
  visEndring: boolean
  beskrivLinje: (linje: InntektLinjeState) => string
  erIRedigering: (linje: InntektLinjeState) => boolean
  visFeil: (id: string, felt: InntektFeilFelt) => boolean
  onBerort: (id: string, felter: InntektFeilFelt[]) => void
  onRediger: (id: string, rediger: boolean) => void
  onSlett: (id: string) => void
  onGjenopprett: (id: string) => void
  onTilbakestill: (id: string) => void
  onOppdater: (id: string, felt: InntektFelt, verdi: string) => void
}

export function InntektTabell({
  kategori,
  tittel,
  kontekst,
  headingLevel,
  linjer,
  typer,
  feil,
  redigerbar,
  visEndring,
  beskrivLinje,
  erIRedigering,
  visFeil,
  onBerort,
  onRediger,
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
  const tabellNavn = `${tittel}, ${kontekst}`

  return (
    <Box>
      <Heading size="xsmall" level={headingLevel} spacing>
        {tittel}
      </Heading>
      <Box className={styles.rullbar} tabIndex={0} role="region" aria-label={tabellNavn}>
        <Table size="small" aria-label={tabellNavn}>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>År</Table.HeaderCell>
              <Table.HeaderCell>Type</Table.HeaderCell>
              {belopFelter.map(({ felt, label, kortLabel }) => (
                <Table.HeaderCell key={felt} align="right">
                  {kortLabel ? (
                    <HStack as="span" gap="space-4" align="center" justify="end" wrap={false} className={styles.nowrap}>
                      {kortLabel}
                      <HelpText title={`Om ${kortLabel.toLowerCase()}`} strategy="fixed">
                        {label}
                      </HelpText>
                    </HStack>
                  ) : (
                    label
                  )}
                </Table.HeaderCell>
              ))}
              {visEndring && <Table.HeaderCell>Endring</Table.HeaderCell>}
              {redigerbar && (
                <Table.HeaderCell>
                  <span className={styles.skjult}>Handlinger</span>
                </Table.HeaderCell>
              )}
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
              const kantStil: CSSProperties = synligeFeil.length > 0 ? { borderBottom: 'none' } : {}
              const celleStil: CSSProperties = erSlettet ? { ...kantStil, ...SLETTET_STIL } : kantStil
              const beskrivelse = beskrivLinje(linje)
              const original = linje._status === 'modified' ? linje._original : null
              const visVerdi = (tekst: string, opprinnelig?: string) => {
                const verdi = !tekst ? '–' : erSlettet ? <span className={styles.slettet}>{tekst}</span> : tekst
                if (opprinnelig === undefined || opprinnelig === tekst) return verdi
                return (
                  <VStack gap="space-0">
                    <span>{verdi}</span>
                    <Detail as="span" textColor="subtle">
                      {`Var: ${opprinnelig || '–'}`}
                    </Detail>
                  </VStack>
                )
              }
              const typeValg = typer.some(t => t.code === linje.inntektsType)
                ? typer
                : [...typer, { code: linje.inntektsType, description: linje.inntektsType }]

              const rad = (
                <Table.Row key={linje._id}>
                  <Table.DataCell style={celleStil}>
                    {redigerer ? (
                      <TextField
                        id={inntektFeltId(linje._id, 'inntektAr')}
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
                      visVerdi(linje.inntektAr, original?.inntektAr)
                    )}
                  </Table.DataCell>
                  <Table.DataCell style={celleStil}>
                    {redigerer ? (
                      <Select
                        id={inntektFeltId(linje._id, 'inntektsType')}
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
                      visVerdi(
                        inntektTypeLabel(typer, linje.inntektsType),
                        original ? inntektTypeLabel(typer, original.inntektsType) : undefined,
                      )
                    )}
                  </Table.DataCell>
                  {belopFelter.map(({ felt, label }) => (
                    <Table.DataCell key={felt} align="right" style={celleStil}>
                      {redigerer ? (
                        <TextField
                          id={inntektFeltId(linje._id, felt)}
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
                        visVerdi(formaterBelop(linje[felt]), original ? formaterBelop(original[felt]) : undefined)
                      )}
                    </Table.DataCell>
                  ))}
                  {visEndring && (
                    <Table.DataCell style={kantStil}>
                      <StatusTag status={linje._status} />
                    </Table.DataCell>
                  )}
                  {redigerbar && (
                    <Table.DataCell style={kantStil}>
                      <HStack gap="space-4" wrap={false} justify="end">
                        {!erSlettet && linje._status !== 'new' && (
                          <Button
                            type="button"
                            variant="tertiary"
                            size="small"
                            aria-label={`${redigerer ? 'Ferdig' : 'Endre'} ${beskrivelse}`}
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
                            aria-label={`Angre ${beskrivelse}`}
                            onClick={() => onTilbakestill(linje._id)}
                          >
                            Angre
                          </Button>
                        )}
                        <HandlingKnapper
                          linje={linje}
                          beskrivelse={beskrivelse}
                          onSlett={onSlett}
                          onGjenopprett={onGjenopprett}
                        />
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
    </Box>
  )
}
