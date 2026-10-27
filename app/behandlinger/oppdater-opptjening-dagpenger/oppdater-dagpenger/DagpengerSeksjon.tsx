import { PlusIcon } from '@navikt/aksel-icons'
import {
  BodyShort,
  Box,
  Button,
  Detail,
  ErrorMessage,
  HStack,
  Select,
  Table,
  TextField,
  VStack,
} from '@navikt/ds-react'
import { type CSSProperties, useState } from 'react'
import type { DagpengerDTO, DagpengerLinje, Dagpengertype } from './dagpenger.types'
import {
  BELOPSFELTER,
  type DagpengerFeil,
  type DagpengerFeilFelt,
  dagpengertypeLabel,
  erUtenGrunnlagOgFerietillegg,
  formaterBelop,
} from './dagpenger.utils'
import { HandlingKnapper } from './HandlingKnapper'
import { StatusTag } from './StatusTag'

const SLETTET_STIL: CSSProperties = { opacity: 0.45 }
const FELT_STIL: CSSProperties = { width: '100%', minWidth: 0 }
const BELOP_STIL: CSSProperties = { ...FELT_STIL, textAlign: 'right' }
const FEIL_REKKEFOLGE: DagpengerFeilFelt[] = ['ar', 'dagpengerType', ...BELOPSFELTER.map(([felt]) => felt)]

type Props = {
  linjer: DagpengerLinje[]
  typer: Dagpengertype[]
  feil: Record<string, DagpengerFeil>
  visAlleFeil: boolean
  readOnly: boolean
  onLeggTil: () => void
  onSlett: (id: string) => void
  onGjenopprett: (id: string) => void
  onTilbakestill: (id: string) => void
  onOppdater: (id: string, felt: keyof DagpengerDTO, verdi: string | number | null) => void
}

const tilTall = (verdi: string) => (verdi === '' ? null : Number(verdi))

export function DagpengerSeksjon({
  linjer,
  typer,
  feil,
  visAlleFeil,
  readOnly,
  onLeggTil,
  onSlett,
  onGjenopprett,
  onTilbakestill,
  onOppdater,
}: Props) {
  const [iRedigering, setIRedigering] = useState<Set<string>>(() => new Set())
  const visEndring = !readOnly || linjer.some(linje => linje._status !== 'original')
  const antallKolonner = 2 + BELOPSFELTER.length + (visEndring ? 1 : 0) + (readOnly ? 0 : 1)

  const settRedigering = (id: string, rediger: boolean) =>
    setIRedigering(prev => {
      const neste = new Set(prev)
      if (rediger) {
        neste.add(id)
      } else {
        neste.delete(id)
      }
      return neste
    })

  const [berort, setBerort] = useState<Set<string>>(() => new Set())
  const beror = (id: string, felt: DagpengerFeilFelt | '*') =>
    setBerort(prev => (prev.has(`${id}|${felt}`) ? prev : new Set(prev).add(`${id}|${felt}`)))
  const visFeil = (id: string, felt: DagpengerFeilFelt) =>
    visAlleFeil || berort.has(`${id}|*`) || berort.has(`${id}|${felt}`)

  const brukteTyper = (linje: DagpengerLinje) =>
    new Set(
      linjer
        .filter(annen => annen._id !== linje._id)
        .map(annen => (annen._status === 'deleted' ? (annen._original ?? annen) : annen))
        .filter(annen => annen.ar === linje.ar)
        .map(annen => annen.dagpengerType),
    )

  return (
    <VStack gap="space-16">
      {linjer.length === 0 ? (
        <BodyShort>Ingen dagpenger registrert.</BodyShort>
      ) : (
        <Box style={{ overflowX: 'auto' }} tabIndex={0} role="region" aria-label="Dagpenger">
          <Table size="small" aria-label="Dagpenger" style={{ tableLayout: 'fixed', width: '100%', minWidth: '48rem' }}>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell style={{ width: '5.5rem' }}>År</Table.HeaderCell>
                <Table.HeaderCell style={{ width: '20%' }}>Type</Table.HeaderCell>
                {BELOPSFELTER.map(([felt, label]) => (
                  <Table.HeaderCell key={felt} align="right">
                    {label}
                  </Table.HeaderCell>
                ))}
                {visEndring && <Table.HeaderCell style={{ width: '5.5rem' }}>Endring</Table.HeaderCell>}
                {!readOnly && <Table.HeaderCell aria-label="Handlinger" style={{ width: '13rem' }} />}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {linjer.flatMap(linje => {
                const erSlettet = linje._status === 'deleted'
                const redigerer = !readOnly && !erSlettet && (linje._status === 'new' || iRedigering.has(linje._id))
                const beskrivelse = `${dagpengertypeLabel(typer, linje.dagpengerType)} ${linje.ar ?? ''}`.trim()
                const original = linje._status === 'modified' ? linje._original : null
                const linjeFeil = feil[linje._id] ?? {}
                const synligeFeil = FEIL_REKKEFOLGE.filter(felt => linjeFeil[felt] && visFeil(linje._id, felt))
                const meldinger = [...new Set(synligeFeil.map(felt => linjeFeil[felt] as string))]
                const feilId = `dagpenger-feil-${linje._id}`
                const feltFeil = (felt: DagpengerFeilFelt) =>
                  synligeFeil.includes(felt) ? { error: true, 'aria-describedby': feilId } : {}
                const kantStil: CSSProperties = meldinger.length > 0 ? { borderBottom: 'none' } : {}
                const celleStil: CSSProperties = erSlettet ? { ...kantStil, ...SLETTET_STIL } : kantStil
                const visVerdi = (tekst: string, opprinnelig?: string) => {
                  if (opprinnelig === undefined || opprinnelig === tekst) return tekst || '–'
                  return (
                    <VStack gap="space-0">
                      <span>{tekst || '–'}</span>
                      <Detail as="span" textColor="subtle">
                        {`Tidligere: ${opprinnelig || '–'}`}
                      </Detail>
                    </VStack>
                  )
                }
                const opptatte = redigerer ? brukteTyper(linje) : new Set<string | null>()
                const typeValg =
                  !linje.dagpengerType || typer.some(type => type.code === linje.dagpengerType)
                    ? typer
                    : [...typer, { code: linje.dagpengerType, description: linje.dagpengerType }]

                const rad = (
                  <Table.Row key={linje._id}>
                    <Table.DataCell style={celleStil}>
                      {redigerer && linje._status === 'new' ? (
                        <TextField
                          label="År"
                          hideLabel
                          size="small"
                          type="number"
                          min={1900}
                          max={9999}
                          step={1}
                          value={linje.ar ?? ''}
                          style={FELT_STIL}
                          {...feltFeil('ar')}
                          onChange={event => onOppdater(linje._id, 'ar', tilTall(event.target.value))}
                          onBlur={() => beror(linje._id, 'ar')}
                        />
                      ) : (
                        visVerdi(String(linje.ar ?? ''), original ? String(original.ar ?? '') : undefined)
                      )}
                    </Table.DataCell>
                    <Table.DataCell style={celleStil}>
                      {redigerer ? (
                        <Select
                          label="Type"
                          hideLabel
                          size="small"
                          value={linje.dagpengerType ?? ''}
                          style={FELT_STIL}
                          {...feltFeil('dagpengerType')}
                          onChange={event => onOppdater(linje._id, 'dagpengerType', event.target.value || null)}
                          onBlur={() => beror(linje._id, 'dagpengerType')}
                        >
                          {!linje.dagpengerType && <option value="">Velg type</option>}
                          {typeValg.map(type => (
                            <option
                              key={type.code}
                              value={type.code}
                              disabled={type.code !== linje.dagpengerType && opptatte.has(type.code)}
                            >
                              {type.description}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        visVerdi(
                          dagpengertypeLabel(typer, linje.dagpengerType),
                          original ? dagpengertypeLabel(typer, original.dagpengerType) : undefined,
                        )
                      )}
                    </Table.DataCell>
                    {BELOPSFELTER.map(([felt, label]) => (
                      <Table.DataCell key={felt} align="right" style={celleStil}>
                        {redigerer ? (
                          <TextField
                            label={label}
                            hideLabel
                            size="small"
                            type="number"
                            min={0}
                            max={2147483647}
                            step={1}
                            value={linje[felt] ?? ''}
                            style={BELOP_STIL}
                            disabled={
                              felt !== 'utbetalteDagpenger' &&
                              felt !== 'barnetillegg' &&
                              erUtenGrunnlagOgFerietillegg(linje.dagpengerType)
                            }
                            {...feltFeil(felt)}
                            onChange={event => onOppdater(linje._id, felt, tilTall(event.target.value))}
                            onBlur={() => beror(linje._id, felt)}
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
                    {!readOnly && (
                      <Table.DataCell style={kantStil}>
                        <HStack gap="space-4" wrap={false} justify="end">
                          {!erSlettet && linje._status !== 'new' && (
                            <Button
                              type="button"
                              variant="tertiary"
                              size="small"
                              aria-label={`${redigerer ? 'Ferdig' : 'Endre'} ${beskrivelse}`}
                              onClick={() => {
                                if (redigerer) beror(linje._id, '*')
                                settRedigering(linje._id, !redigerer)
                              }}
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

                if (meldinger.length === 0) return [rad]
                return [
                  rad,
                  <Table.Row key={`${linje._id}-feil`}>
                    <Table.DataCell colSpan={antallKolonner} style={{ paddingTop: 0 }}>
                      <VStack gap="space-4" id={feilId}>
                        {meldinger.map(melding => (
                          <ErrorMessage key={melding} size="small" showIcon>
                            {melding}
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
      {!readOnly && (
        <HStack>
          <Button
            type="button"
            size="small"
            variant="secondary"
            icon={<PlusIcon aria-hidden />}
            onClick={onLeggTil}
            disabled={typer.length === 0}
          >
            Legg til dagpenger
          </Button>
        </HStack>
      )}
    </VStack>
  )
}
