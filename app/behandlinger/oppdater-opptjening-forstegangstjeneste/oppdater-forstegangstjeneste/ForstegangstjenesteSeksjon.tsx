import { PlusIcon } from '@navikt/aksel-icons'
import { BodyShort, Box, Button, Detail, ErrorMessage, Heading, HStack, Select, Table, VStack } from '@navikt/ds-react'
import { type CSSProperties, type ReactNode, useState } from 'react'
import { DatoFelt } from './DatoFelt'
import type { LinjeStatus, Opptjeningstype, PeriodeLinje, TjenesteLinje } from './forstegangstjeneste.types'
import {
  type ForstegangstjenesteFeil,
  formaterDato,
  PERIODE_FELTER,
  type PeriodeFeilFelt,
  TJENESTE_FELTER,
  type TjenesteFeilFelt,
  tidsrom,
  typeLabel,
  visteVerdier,
} from './forstegangstjeneste.utils'
import { HandlingKnapper } from './HandlingKnapper'
import { StatusTag } from './StatusTag'

const SLETTET_STIL: CSSProperties = { opacity: 0.45 }
const FELT_STIL: CSSProperties = { width: '100%', minWidth: 0 }
const DATO_BREDDE = '11rem'
const ENDRING_BREDDE = '5.5rem'
const HANDLING_BREDDE = '13rem'

type FeltFeil = { error?: true; 'aria-describedby'?: string }

type Props = {
  tjeneste: TjenesteLinje | undefined
  perioder: PeriodeLinje[]
  periodetyper: Opptjeningstype[]
  tjenestetyper: Opptjeningstype[]
  feil: ForstegangstjenesteFeil
  visAlleFeil: boolean
  readOnly: boolean
  onRegistrer: () => void
  onOppdaterTjeneste: (felt: TjenesteFeilFelt, verdi: string | null) => void
  onTilbakestillTjeneste: () => void
  onSlettTjeneste: () => void
  onGjenopprettTjeneste: () => void
  onLeggTilPeriode: () => void
  onOppdaterPeriode: (id: string, felt: PeriodeFeilFelt, verdi: string | null) => void
  onTilbakestillPeriode: (id: string) => void
  onSlettPeriode: (id: string) => void
  onGjenopprettPeriode: (id: string) => void
}

function visVerdi(tekst: string, opprinnelig?: string) {
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

function FeilRad({ id, meldinger, antallKolonner }: { id: string; meldinger: string[]; antallKolonner: number }) {
  return (
    <Table.Row>
      <Table.DataCell colSpan={antallKolonner} style={{ paddingTop: 0 }}>
        <VStack gap="space-4" id={id}>
          {meldinger.map(melding => (
            <ErrorMessage key={melding} size="small" showIcon>
              {melding}
            </ErrorMessage>
          ))}
        </VStack>
      </Table.DataCell>
    </Table.Row>
  )
}

type RadHandlingerProps = {
  linje: { _id: string; _status: LinjeStatus }
  beskrivelse: string
  redigerer: boolean
  onRediger: () => void
  onTilbakestill: () => void
  onSlett: (id: string) => void
  onGjenopprett: (id: string) => void
}

function RadHandlinger({
  linje,
  beskrivelse,
  redigerer,
  onRediger,
  onTilbakestill,
  onSlett,
  onGjenopprett,
}: RadHandlingerProps) {
  return (
    <HStack gap="space-4" wrap={false} justify="end">
      {linje._status !== 'deleted' && linje._status !== 'new' && (
        <Button
          type="button"
          variant="tertiary"
          size="small"
          aria-label={`${redigerer ? 'Ferdig' : 'Endre'} ${beskrivelse}`}
          onClick={onRediger}
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
          onClick={onTilbakestill}
        >
          Angre
        </Button>
      )}
      <HandlingKnapper linje={linje} beskrivelse={beskrivelse} onSlett={onSlett} onGjenopprett={onGjenopprett} />
    </HStack>
  )
}

function TypeValg({
  label,
  typer,
  verdi,
  feltFeil,
  onChange,
  onBlur,
}: {
  label: string
  typer: Opptjeningstype[]
  verdi: string | null
  feltFeil: FeltFeil
  onChange: (verdi: string | null) => void
  onBlur: () => void
}) {
  const valg =
    !verdi || typer.some(type => type.code === verdi) ? typer : [...typer, { code: verdi, description: verdi }]
  return (
    <Select
      label={label}
      hideLabel
      size="small"
      value={verdi ?? ''}
      style={FELT_STIL}
      {...feltFeil}
      onChange={event => onChange(event.target.value || null)}
      onBlur={onBlur}
    >
      {!verdi && <option value="">Velg {label.toLowerCase()}</option>}
      {valg.map(type => (
        <option key={type.code} value={type.code}>
          {type.description}
        </option>
      ))}
    </Select>
  )
}

export function ForstegangstjenesteSeksjon({
  tjeneste,
  perioder,
  periodetyper,
  tjenestetyper,
  feil,
  visAlleFeil,
  readOnly,
  onRegistrer,
  onOppdaterTjeneste,
  onTilbakestillTjeneste,
  onSlettTjeneste,
  onGjenopprettTjeneste,
  onLeggTilPeriode,
  onOppdaterPeriode,
  onTilbakestillPeriode,
  onSlettPeriode,
  onGjenopprettPeriode,
}: Props) {
  const [iRedigering, setIRedigering] = useState<Set<string>>(() => new Set())
  const [berort, setBerort] = useState<Set<string>>(() => new Set())

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
  const beror = (id: string, felt: string) =>
    setBerort(prev => (prev.has(`${id}|${felt}`) ? prev : new Set(prev).add(`${id}|${felt}`)))
  const visFeil = (id: string, felt: string) => visAlleFeil || berort.has(`${id}|*`) || berort.has(`${id}|${felt}`)

  if (!tjeneste) {
    return (
      <VStack gap="space-16">
        <BodyShort>Ingen førstegangstjeneste registrert.</BodyShort>
        {!readOnly && (
          <HStack>
            <Button
              type="button"
              size="small"
              variant="secondary"
              icon={<PlusIcon aria-hidden />}
              onClick={onRegistrer}
            >
              Registrer førstegangstjeneste
            </Button>
          </HStack>
        )}
      </VStack>
    )
  }

  const tjenesteSlettet = tjeneste._status === 'deleted'
  const visEndring =
    !readOnly || tjeneste._status !== 'original' || perioder.some(periode => periode._status !== 'original')
  const visHandlinger = !readOnly

  const rad = <T extends string>(
    linje: { _id: string; _status: LinjeStatus },
    felter: readonly (readonly [T, string])[],
    linjeFeil: Partial<Record<T, string>>,
    celler: (feltFeil: (felt: T) => FeltFeil, celleStil: CSSProperties) => ReactNode,
    handlinger: ReactNode,
  ) => {
    const synligeFeil = felter.map(([felt]) => felt).filter(felt => linjeFeil[felt] && visFeil(linje._id, felt))
    const meldinger = [...new Set(synligeFeil.map(felt => linjeFeil[felt] as string))]
    const feilId = `forstegangstjeneste-feil-${linje._id}`
    const feltFeil = (felt: T): FeltFeil =>
      synligeFeil.includes(felt) ? { error: true, 'aria-describedby': feilId } : {}
    const kantStil: CSSProperties = meldinger.length > 0 ? { borderBottom: 'none' } : {}
    const celleStil = linje._status === 'deleted' ? { ...kantStil, ...SLETTET_STIL } : kantStil
    const antallKolonner = felter.length + (visEndring ? 1 : 0) + (visHandlinger ? 1 : 0)
    return [
      <Table.Row key={linje._id}>
        {celler(feltFeil, celleStil)}
        {visEndring && (
          <Table.DataCell style={kantStil}>
            <StatusTag status={linje._status} />
          </Table.DataCell>
        )}
        {visHandlinger && <Table.DataCell style={kantStil}>{handlinger}</Table.DataCell>}
      </Table.Row>,
      ...(meldinger.length > 0
        ? [<FeilRad key={`${linje._id}-feil`} id={feilId} meldinger={meldinger} antallKolonner={antallKolonner} />]
        : []),
    ]
  }

  const tjenesteRedigerer =
    !readOnly && !tjenesteSlettet && (tjeneste._status === 'new' || iRedigering.has(tjeneste._id))
  const tjenesteVerdier = visteVerdier(tjeneste)
  const tjenesteTid = tidsrom(tjenesteVerdier.tjenestestartDato, tjenesteVerdier.dimitteringDato)
  const tjenesteOriginal = tjeneste._status === 'modified' ? tjeneste._original : null

  const tjenesteRader = rad(
    tjeneste,
    TJENESTE_FELTER,
    feil.tjeneste,
    (feltFeil, celleStil) =>
      TJENESTE_FELTER.map(([felt, label]) => (
        <Table.DataCell key={felt} style={celleStil}>
          {tjenesteRedigerer ? (
            <DatoFelt
              label={label}
              value={tjeneste[felt]}
              {...feltFeil(felt)}
              onChange={verdi => onOppdaterTjeneste(felt, verdi)}
              onBlur={() => beror(tjeneste._id, felt)}
            />
          ) : (
            visVerdi(
              formaterDato(tjenesteVerdier[felt]),
              tjenesteOriginal ? formaterDato(tjenesteOriginal[felt]) : undefined,
            )
          )}
        </Table.DataCell>
      )),
    <RadHandlinger
      linje={tjeneste}
      beskrivelse="førstegangstjeneste"
      redigerer={tjenesteRedigerer}
      onRediger={() => {
        if (tjenesteRedigerer) beror(tjeneste._id, '*')
        settRedigering(tjeneste._id, !tjenesteRedigerer)
      }}
      onTilbakestill={() => {
        onTilbakestillTjeneste()
        settRedigering(tjeneste._id, false)
      }}
      onSlett={() => {
        setIRedigering(new Set())
        onSlettTjeneste()
      }}
      onGjenopprett={onGjenopprettTjeneste}
    />,
  )

  const periodeRader = perioder.flatMap(periode => {
    const redigerer =
      !readOnly && periode._status !== 'deleted' && (periode._status === 'new' || iRedigering.has(periode._id))
    const verdier = visteVerdier(periode)
    const original = periode._status === 'modified' ? periode._original : null
    const beskrivelse = verdier.fomDato ? `periode fra ${formaterDato(verdier.fomDato)}` : 'ny periode'
    const typer: Partial<Record<PeriodeFeilFelt, Opptjeningstype[]>> = {
      periodeType: periodetyper,
      tjenesteType: tjenestetyper,
    }
    return rad(
      periode,
      PERIODE_FELTER,
      feil.perioder[periode._id] ?? {},
      (feltFeil, celleStil) =>
        PERIODE_FELTER.map(([felt, label]) => {
          const typeliste = typer[felt]
          let innhold: ReactNode
          if (redigerer && typeliste) {
            innhold = (
              <TypeValg
                label={label}
                typer={typeliste}
                verdi={periode[felt]}
                feltFeil={feltFeil(felt)}
                onChange={verdi => onOppdaterPeriode(periode._id, felt, verdi)}
                onBlur={() => beror(periode._id, felt)}
              />
            )
          } else if (redigerer) {
            innhold = (
              <DatoFelt
                label={label}
                value={periode[felt]}
                {...feltFeil(felt)}
                onChange={verdi => onOppdaterPeriode(periode._id, felt, verdi)}
                onBlur={() => beror(periode._id, felt)}
              />
            )
          } else {
            const vis = (verdi: string | null) => (typeliste ? typeLabel(typeliste, verdi) : formaterDato(verdi))
            innhold = visVerdi(vis(verdier[felt]), original ? vis(original[felt]) : undefined)
          }
          return (
            <Table.DataCell key={felt} style={celleStil}>
              {innhold}
            </Table.DataCell>
          )
        }),
      tjenesteSlettet ? null : (
        <RadHandlinger
          linje={periode}
          beskrivelse={beskrivelse}
          redigerer={redigerer}
          onRediger={() => {
            if (redigerer) beror(periode._id, '*')
            settRedigering(periode._id, !redigerer)
          }}
          onTilbakestill={() => {
            onTilbakestillPeriode(periode._id)
            settRedigering(periode._id, false)
          }}
          onSlett={id => {
            settRedigering(id, false)
            onSlettPeriode(id)
          }}
          onGjenopprett={onGjenopprettPeriode}
        />
      ),
    )
  })

  const kolonnehoder = (
    <>
      {visEndring && <Table.HeaderCell style={{ width: ENDRING_BREDDE }}>Endring</Table.HeaderCell>}
      {visHandlinger && <Table.HeaderCell aria-label="Handlinger" style={{ width: HANDLING_BREDDE }} />}
    </>
  )

  return (
    <VStack gap="space-24">
      <VStack gap="space-8">
        <Heading size="xsmall" level="3">
          Tjenestetid
        </Heading>
        <Box style={{ overflowX: 'auto' }} tabIndex={0} role="region" aria-label="Førstegangstjeneste">
          <Table
            size="small"
            aria-label="Førstegangstjeneste"
            style={{ tableLayout: 'fixed', width: '100%', minWidth: '40rem' }}
          >
            <Table.Header>
              <Table.Row>
                {TJENESTE_FELTER.map(([felt, label]) => (
                  <Table.HeaderCell key={felt}>{label}</Table.HeaderCell>
                ))}
                {kolonnehoder}
              </Table.Row>
            </Table.Header>
            <Table.Body>{tjenesteRader}</Table.Body>
          </Table>
        </Box>
        {tjenesteSlettet && (
          <BodyShort>
            {`Hele førstegangstjenesten${tjenesteTid ? ` (${tjenesteTid})` : ''} slettes fra Opptjeningsregisteret.`}
          </BodyShort>
        )}
      </VStack>

      <VStack gap="space-8">
        <Heading size="xsmall" level="3">
          Perioder
        </Heading>
        {perioder.length === 0 ? (
          <BodyShort>Ingen perioder registrert.</BodyShort>
        ) : (
          <Box style={{ overflowX: 'auto' }} tabIndex={0} role="region" aria-label="Perioder">
            <Table
              size="small"
              aria-label="Perioder"
              style={{ tableLayout: 'fixed', width: '100%', minWidth: '56rem' }}
            >
              <Table.Header>
                <Table.Row>
                  {PERIODE_FELTER.map(([felt, label]) => (
                    <Table.HeaderCell
                      key={felt}
                      style={felt === 'fomDato' || felt === 'tomDato' ? { width: DATO_BREDDE } : undefined}
                    >
                      {label}
                    </Table.HeaderCell>
                  ))}
                  {kolonnehoder}
                </Table.Row>
              </Table.Header>
              <Table.Body>{periodeRader}</Table.Body>
            </Table>
          </Box>
        )}
        {feil.manglerPeriode && visAlleFeil && (
          <ErrorMessage size="small" showIcon>
            {feil.manglerPeriode}
          </ErrorMessage>
        )}
        {!readOnly && !tjenesteSlettet && (
          <HStack>
            <Button
              type="button"
              size="small"
              variant="secondary"
              icon={<PlusIcon aria-hidden />}
              onClick={onLeggTilPeriode}
              disabled={periodetyper.length === 0 || tjenestetyper.length === 0}
            >
              Legg til periode
            </Button>
          </HStack>
        )}
      </VStack>
    </VStack>
  )
}
