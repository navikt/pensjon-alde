import { PlusIcon, TrashIcon } from '@navikt/aksel-icons'
import {
  Alert,
  BodyShort,
  Box,
  Button,
  DatePicker,
  Heading,
  HStack,
  Page,
  Select,
  Table,
  Tag,
  TextField,
  useDatepicker,
  VStack,
} from '@navikt/ds-react'
import { useMemo, useState } from 'react'
import { data, Form, redirect, useNavigation, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import { isApiError } from '~/api/error.types'
import { fetchOpptjeningstyper } from '~/api/opptjeningstyper-api.server'
import styles from '~/common.module.css'
import { userContext } from '~/context/user-context'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import { formatCurrencyNok } from '~/utils/currency'
import type { Route } from './+types'
import type {
  DagpengerBackendDTO,
  DagpengerDTO,
  ForstegangstjenesteBackendDTO,
  ForstegangstjenesteDTO,
  HentetVurdering,
  InntektBackendDTO,
  InntektDTO,
  OmsorgBackendDTO,
  OmsorgDTO,
  OppdaterOpptjeningGrunnlag,
  OppdaterOpptjeningVurdering,
  OpptjeningstyperResponse,
} from './oppdater-grunnlag-types'

export function meta() {
  return [{ title: 'Oppdater pensjonsgivende inntekt' }]
}

const REQUIRED_KOMMUNE: Partial<Record<string, string>> = {
  DIP_JSF: '0301',
  DIP_LON: '0301',
  DIP_SEL: '0301',
  SJO_JSF: '2312',
  SJO_LON: '2312',
  SJO_SEL: '2312',
  SVA_JSF: '2100',
  SVA_LON: '2100',
  SVA_SEL: '2100',
  SVA_PGI_LOENN: '2100',
  SVA_PGI_LOENN_PD: '2100',
  SVA_PGI_NAERING: '2100',
  SVA_PGI_NAERING_FFF: '2100',
  UTE_JSF: '2101',
  UTE_LON: '2101',
  UTE_SEL: '2101',
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params
  const api = createAktivitetApi({ request, behandlingId, aktivitetId })
  const { navident } = context.get(userContext)

  let grunnlag: OppdaterOpptjeningGrunnlag = {}
  let readOnly = false

  try {
    grunnlag = await api.hentGrunnlagsdata<OppdaterOpptjeningGrunnlag>()
  } catch (error) {
    if (isApiError(error) && error.data.status === 403) {
      readOnly = true
    } else {
      throw error
    }
  }

  const [vurdering, opptjeningstyper] = await Promise.all([
    api.hentVurdering<HentetVurdering>(),
    fetchOpptjeningstyper(request),
  ])

  return { grunnlag, vurdering, opptjeningstyper, navident, readOnly }
}

export async function action({ params, request }: Route.ActionArgs) {
  const { behandlingId, aktivitetId } = params
  const api = createAktivitetApi({ request, behandlingId, aktivitetId })

  const formData = await request.formData()
  const sakIdRaw = formData.get('sakId')
  const payloadRaw = formData.get('payload')

  if (!payloadRaw) {
    return data({ errors: { _form: 'Mangler skjemadata' } }, { status: 400 })
  }

  let payload: OppdaterOpptjeningVurdering

  try {
    payload = JSON.parse(payloadRaw as string)
  } catch {
    return data({ errors: { _form: 'Ugyldig skjemadata' } }, { status: 400 })
  }

  const validationErrors: string[] = []

  const alleInntekter = (payload.inntektEndringer ?? [])
    .filter(e => e.endringstype !== 'SLETT')
    .flatMap(e => e.inntektListe)
  for (const inntekt of alleInntekter) {
    const required = REQUIRED_KOMMUNE[inntekt.inntektType]
    if (required && inntekt.kommune?.trim() !== required) {
      validationErrors.push(`Skattekommune for ${inntekt.inntektType} må være ${required}`)
    }
  }

  const alleFt = (payload.forstegangstjenesteEndringer ?? [])
    .filter(e => e.endringstype !== 'SLETT')
    .map(e => e.forstegangstjeneste)
  for (const ft of alleFt) {
    if (ft.tjenestestartDato && ft.tjenestestartDato < '2010-01-01') {
      validationErrors.push('Tjenestestartdato for førstegangstjeneste kan ikke være før 01.01.2010')
    }
  }

  if (validationErrors.length > 0) {
    return data({ errors: { _form: validationErrors.join('. ') } }, { status: 400 })
  }

  payload.dagpengerEndringer = (payload.dagpengerEndringer ?? []).map(e => ({
    ...e,
    dagpengerListe: e.dagpengerListe.map(d =>
      d.dagpengerType === 'DP_FF' ? { ...d, uavkortetDagpengegrunnlag: null, ferietillegg: null } : d,
    ),
  }))

  const vurdering: OppdaterOpptjeningVurdering = {
    ...(sakIdRaw ? { sakId: Number(sakIdRaw) } : {}),
    ...payload,
  }

  try {
    await api.lagreVurdering(vurdering)
    return redirect(`/behandling/${behandlingId}?justCompleted=${aktivitetId}`)
  } catch {
    return data({ errors: { _form: 'Det oppstod en feil ved lagring' } }, { status: 500 })
  }
}

type LinjeStatus = 'original' | 'new' | 'modified' | 'deleted'

type InntektLinjeState = InntektDTO & { _id: string; _status: LinjeStatus; _original: InntektDTO | null }
type DagpengerLinjeState = DagpengerDTO & { _id: string; _status: LinjeStatus; _original: DagpengerDTO | null }
type OmsorgLinjeState = OmsorgDTO & { _id: string; _status: LinjeStatus; _original: OmsorgDTO | null }
type ForstegangstjenesteLinjeState = ForstegangstjenesteDTO & {
  _id: string
  _status: LinjeStatus
  _original: ForstegangstjenesteDTO | null
}

function tilLinjeState<T extends object>(dto: T): T & { _id: string; _status: LinjeStatus; _original: T } {
  return { ...dto, _id: crypto.randomUUID(), _status: 'original' as LinjeStatus, _original: { ...dto } as T }
}

function beregnStatus<T extends object>(
  linje: T & { _status: LinjeStatus; _original: T | null },
  felter: (keyof T)[],
): LinjeStatus {
  if (linje._status === 'new' || linje._status === 'deleted') return linje._status
  if (!linje._original) return 'new'
  const orig = linje._original
  const endret = felter.some(k => (linje[k] ?? null) !== (orig[k] ?? null))
  return endret ? 'modified' : 'original'
}

const INNTEKT_FELTER: (keyof InntektDTO)[] = ['inntektType', 'inntektAr', 'belop', 'kommune']
const DAGPENGER_FELTER: (keyof DagpengerDTO)[] = [
  'inntektType',
  'inntektAr',
  'uavkortetDagpengegrunnlag',
  'utbetalteDagpenger',
  'ferietillegg',
  'barnetillegg',
]
const FORSTEGANGSTJENESTE_FELTER: (keyof ForstegangstjenesteDTO)[] = ['inntektType', 'periodeType', 'fom', 'tom']

function nyInntektLinje(defaultType: string, navident: string): InntektLinjeState {
  return {
    _id: crypto.randomUUID(),
    _status: 'new',
    _original: null,
    inntektType: defaultType,
    inntektAr: new Date().getFullYear(),
    belop: null,
    kilde: navident,
    kommune: REQUIRED_KOMMUNE[defaultType] ?? null,
  }
}

function nyDagpengerLinje(navident: string): DagpengerLinjeState {
  return {
    _id: crypto.randomUUID(),
    _status: 'new',
    _original: null,
    inntektType: 'DP',
    inntektAr: new Date().getFullYear(),
    uavkortetDagpengegrunnlag: null,
    utbetalteDagpenger: null,
    ferietillegg: null,
    barnetillegg: null,
    kilde: navident,
  }
}

function nyForstegangstjenesteLinje(navident: string): ForstegangstjenesteLinjeState {
  return {
    _id: crypto.randomUUID(),
    _status: 'new',
    _original: null,
    inntektType: 'MIL',
    periodeType: null,
    fom: '',
    tom: '',
    kilde: navident,
  }
}

type EndringSummaryItem = {
  id: string
  kategori: string
  label: string
  endringer?: string[]
}

function typeLabel(opptjeningstyper: OpptjeningstyperResponse, code: string): string {
  const alle = [
    ...opptjeningstyper.inntekt.typer,
    ...opptjeningstyper.omsorg.typer,
    ...opptjeningstyper.dagpenger.typer,
    ...opptjeningstyper.forstegangstjeneste.typer,
    ...opptjeningstyper.forstegangstjeneste.subTyper,
  ]
  return alle.find(t => t.code === code)?.description ?? code
}

function inntektEndringer(linje: InntektLinjeState, opptjeningstyper: OpptjeningstyperResponse): string[] {
  if (!linje._original) return []
  const orig = linje._original
  const felter: string[] = []
  if (linje.inntektType !== orig.inntektType) {
    felter.push(
      `Inntektstype: ${typeLabel(opptjeningstyper, orig.inntektType)} → ${typeLabel(opptjeningstyper, linje.inntektType)}`,
    )
  }
  if (linje.inntektAr !== orig.inntektAr) {
    felter.push(`År: ${orig.inntektAr} → ${linje.inntektAr}`)
  }
  if ((linje.belop ?? null) !== (orig.belop ?? null)) {
    const fra = orig.belop != null ? formatCurrencyNok(orig.belop) : '–'
    const til = linje.belop != null ? formatCurrencyNok(linje.belop) : '–'
    felter.push(`Beløp: ${fra} → ${til}`)
  }
  if ((linje.kommune ?? null) !== (orig.kommune ?? null)) {
    felter.push(`Skattekommune: ${orig.kommune ?? '–'} → ${linje.kommune ?? '–'}`)
  }
  return felter
}

function dagpengerEndringer(linje: DagpengerLinjeState, opptjeningstyper: OpptjeningstyperResponse): string[] {
  if (!linje._original) return []
  const orig = linje._original
  const felter: string[] = []
  if (linje.inntektType !== orig.inntektType) {
    felter.push(
      `Type: ${typeLabel(opptjeningstyper, orig.inntektType)} → ${typeLabel(opptjeningstyper, linje.inntektType)}`,
    )
  }
  if (linje.inntektAr !== orig.inntektAr) {
    felter.push(`År: ${orig.inntektAr} → ${linje.inntektAr}`)
  }
  if (
    (linje.uavkortetDagpengegrunnlag ?? null) !== (orig.uavkortetDagpengegrunnlag ?? null) &&
    linje.inntektType !== 'DP_FF'
  ) {
    const fra = orig.uavkortetDagpengegrunnlag != null ? formatCurrencyNok(orig.uavkortetDagpengegrunnlag) : '–'
    const til = linje.uavkortetDagpengegrunnlag != null ? formatCurrencyNok(linje.uavkortetDagpengegrunnlag) : '–'
    felter.push(`Uavkortet grunnlag: ${fra} → ${til}`)
  }
  if ((linje.utbetalteDagpenger ?? null) !== (orig.utbetalteDagpenger ?? null)) {
    const fra = orig.utbetalteDagpenger != null ? formatCurrencyNok(orig.utbetalteDagpenger) : '–'
    const til = linje.utbetalteDagpenger != null ? formatCurrencyNok(linje.utbetalteDagpenger) : '–'
    felter.push(`Utbetalte dagpenger: ${fra} → ${til}`)
  }
  if ((linje.ferietillegg ?? null) !== (orig.ferietillegg ?? null) && linje.inntektType !== 'DP_FF') {
    const fra = orig.ferietillegg != null ? formatCurrencyNok(orig.ferietillegg) : '–'
    const til = linje.ferietillegg != null ? formatCurrencyNok(linje.ferietillegg) : '–'
    felter.push(`Ferietillegg: ${fra} → ${til}`)
  }
  if ((linje.barnetillegg ?? null) !== (orig.barnetillegg ?? null)) {
    const fra = orig.barnetillegg != null ? formatCurrencyNok(orig.barnetillegg) : '–'
    const til = linje.barnetillegg != null ? formatCurrencyNok(linje.barnetillegg) : '–'
    felter.push(`Barnetillegg: ${fra} → ${til}`)
  }
  return felter
}

function forstegangstjenesteEndringer(
  linje: ForstegangstjenesteLinjeState,
  opptjeningstyper: OpptjeningstyperResponse,
): string[] {
  if (!linje._original) return []
  const orig = linje._original
  const felter: string[] = []
  if (linje.inntektType !== orig.inntektType) {
    felter.push(
      `Type: ${typeLabel(opptjeningstyper, orig.inntektType)} → ${typeLabel(opptjeningstyper, linje.inntektType)}`,
    )
  }
  if ((linje.periodeType ?? null) !== (orig.periodeType ?? null)) {
    const fra = orig.periodeType ? typeLabel(opptjeningstyper, orig.periodeType) : '–'
    const til = linje.periodeType ? typeLabel(opptjeningstyper, linje.periodeType) : '–'
    felter.push(`Periodetype: ${fra} → ${til}`)
  }
  if (linje.fom !== orig.fom) {
    felter.push(`FOM: ${orig.fom || '–'} → ${linje.fom || '–'}`)
  }
  if (linje.tom !== orig.tom) {
    felter.push(`TOM: ${orig.tom || '–'} → ${linje.tom || '–'}`)
  }
  return felter
}

function toInntektBackend(l: InntektLinjeState, fnr: string): InntektBackendDTO {
  return {
    inntektId: l.inntektId ?? null,
    fnr,
    kilde: l.kilde ?? null,
    kommune: l.kommune ?? null,
    piMerke: null,
    inntektAr: Number(l.inntektAr),
    belop: l.belop != null ? String(Number(l.belop)) : null,
    inntektType: l.inntektType,
  }
}

function toDagpengerBackend(l: DagpengerLinjeState, fnr: string): DagpengerBackendDTO {
  const isFF = l.inntektType === 'DP_FF'
  return {
    dagpengerId: l.opptjeningId ?? null,
    fnr,
    dagpengerType: l.inntektType,
    rapportType: null,
    kilde: l.kilde ?? null,
    ar: Number(l.inntektAr),
    utbetalteDagpenger: l.utbetalteDagpenger != null ? String(Number(l.utbetalteDagpenger)) : null,
    uavkortetDagpengegrunnlag: isFF
      ? null
      : l.uavkortetDagpengegrunnlag != null
        ? String(Number(l.uavkortetDagpengegrunnlag))
        : null,
    ferietillegg: isFF ? null : l.ferietillegg != null ? String(Number(l.ferietillegg)) : null,
    barnetillegg: l.barnetillegg != null ? String(Number(l.barnetillegg)) : null,
  }
}

function toOmsorgBackend(l: OmsorgLinjeState, fnr: string): OmsorgBackendDTO {
  return {
    omsorgId: l.opptjeningId ?? null,
    fnr,
    fnrOmsorgFor: null,
    omsorgType: l.inntektType,
    kilde: l.kilde ?? null,
    ar: Number(l.inntektAr),
  }
}

function toForstegangstjenesteBackend(l: ForstegangstjenesteLinjeState, fnr: string): ForstegangstjenesteBackendDTO {
  return {
    forstegangstjenesteId: l.opptjeningId ?? null,
    fnr,
    kilde: l.kilde ?? null,
    rapportType: null,
    tjenestestartDato: l.fom || null,
    dimitteringDato: l.tom || null,
    forstegangstjenestePeriodeListe: [
      {
        forstegangstjenestePeriodeId: null,
        periodeType: l.periodeType ?? null,
        tjenesteType: l.inntektType,
        fomDato: l.fom,
        tomDato: l.tom,
      },
    ],
  }
}

function StatusTag({ status }: { status: LinjeStatus }) {
  if (status === 'new')
    return (
      <Tag variant="success" size="small">
        Ny
      </Tag>
    )
  if (status === 'modified')
    return (
      <Tag variant="warning" size="small">
        Endret
      </Tag>
    )
  if (status === 'deleted')
    return (
      <Tag variant="error" size="small">
        Slettet
      </Tag>
    )
  return null
}

function HandlingKnapper({
  linje,
  onSlett,
  onGjenopprett,
}: {
  linje: { _id: string; _status: LinjeStatus }
  onSlett: (id: string) => void
  onGjenopprett: (id: string) => void
}) {
  if (linje._status === 'deleted') {
    return (
      <Button type="button" variant="tertiary" size="small" onClick={() => onGjenopprett(linje._id)}>
        Gjenopprett
      </Button>
    )
  }
  return (
    <Button
      type="button"
      variant="tertiary-neutral"
      size="small"
      icon={<TrashIcon aria-hidden />}
      onClick={() => onSlett(linje._id)}
    >
      Slett
    </Button>
  )
}

function InntekterSeksjon({
  linjer,
  opptjeningstyper,
  readOnly,
  kommuneFeil,
  onLeggTil,
  onSlett,
  onGjenopprett,
  onOppdater,
}: {
  linjer: InntektLinjeState[]
  opptjeningstyper: OpptjeningstyperResponse
  readOnly: boolean
  kommuneFeil: Record<string, string>
  onLeggTil: () => void
  onSlett: (id: string) => void
  onGjenopprett: (id: string) => void
  onOppdater: (id: string, felt: keyof InntektDTO, verdi: string) => void
}) {
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
                <Table.HeaderCell>Kilde</Table.HeaderCell>
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
                          value={linje.inntektAr.toString()}
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
                    <Table.DataCell>
                      {readOnly ? (
                        (linje.kilde ?? '–')
                      ) : (
                        <TextField
                          label="Kilde"
                          hideLabel
                          value={linje.kilde ?? ''}
                          size="small"
                          disabled
                          style={{ width: '5.5rem' }}
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

function DagpengerSeksjon({
  linjer,
  opptjeningstyper,
  readOnly,
  onLeggTil,
  onSlett,
  onGjenopprett,
  onOppdater,
}: {
  linjer: DagpengerLinjeState[]
  opptjeningstyper: OpptjeningstyperResponse
  readOnly: boolean
  onLeggTil: () => void
  onSlett: (id: string) => void
  onGjenopprett: (id: string) => void
  onOppdater: (id: string, felt: keyof DagpengerDTO, verdi: string) => void
}) {
  const sortert = useMemo(() => [...linjer].sort((a, b) => a.inntektAr - b.inntektAr), [linjer])
  const erFF = (inntektType: string) => inntektType === 'DP_FF'

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
                <Table.HeaderCell>Kilde</Table.HeaderCell>
                {!readOnly && <Table.HeaderCell>Status</Table.HeaderCell>}
                {!readOnly && <Table.HeaderCell />}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {sortert.map(linje => {
                const erSlettet = linje._status === 'deleted'
                const ff = erFF(linje.inntektType)
                return (
                  <Table.Row key={linje._id} style={erSlettet ? { opacity: 0.45 } : undefined}>
                    <Table.DataCell>
                      {readOnly ? (
                        (opptjeningstyper.dagpenger.typer.find(t => t.code === linje.inntektType)?.description ??
                        linje.inntektType)
                      ) : (
                        <Select
                          label="Type"
                          size="small"
                          hideLabel
                          value={linje.inntektType}
                          onChange={e => onOppdater(linje._id, 'inntektType', e.target.value)}
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
                        linje.inntektAr
                      ) : (
                        <TextField
                          label="År"
                          hideLabel
                          value={linje.inntektAr.toString()}
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
                          disabled={erSlettet || ff}
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
                          disabled={erSlettet || ff}
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
                    <Table.DataCell>
                      {readOnly ? (
                        (linje.kilde ?? '–')
                      ) : (
                        <TextField
                          label="Kilde"
                          hideLabel
                          value={linje.kilde ?? ''}
                          size="small"
                          disabled
                          style={{ width: '5.5rem' }}
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

function OmsorgSeksjon({
  linjer,
  opptjeningstyper,
  readOnly,
  onSlett,
  onGjenopprett,
}: {
  linjer: OmsorgLinjeState[]
  opptjeningstyper: OpptjeningstyperResponse
  readOnly: boolean
  onSlett: (id: string) => void
  onGjenopprett: (id: string) => void
}) {
  const sortert = useMemo(() => [...linjer].sort((a, b) => a.inntektAr - b.inntektAr), [linjer])

  if (linjer.length === 0) return null

  return (
    <Box>
      <Heading size="small" level="3" spacing>
        Omsorg
      </Heading>
      <Box style={{ overflowX: 'auto' }}>
        <Table size="small">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Type</Table.HeaderCell>
              <Table.HeaderCell>År</Table.HeaderCell>
              <Table.HeaderCell>Beløp</Table.HeaderCell>
              <Table.HeaderCell>Kilde</Table.HeaderCell>
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
                    {opptjeningstyper.omsorg.typer.find(t => t.code === linje.inntektType)?.description ??
                      linje.inntektType}
                  </Table.DataCell>
                  <Table.DataCell>{linje.inntektAr}</Table.DataCell>
                  <Table.DataCell>{linje.belop != null ? formatCurrencyNok(linje.belop) : '–'}</Table.DataCell>
                  <Table.DataCell>{linje.kilde ?? '–'}</Table.DataCell>
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
    </Box>
  )
}

function parseIsoDate(iso: string): Date | undefined {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d)
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function DatoVelgerCell({
  value,
  label,
  disabled,
  error,
  fromDate,
  onChange,
}: {
  value: string
  label: string
  disabled?: boolean
  error?: string
  fromDate?: Date
  onChange: (val: string) => void
}) {
  const { inputProps, datepickerProps } = useDatepicker({
    defaultSelected: value ? parseIsoDate(value) : undefined,
    fromDate,
    onDateChange: date => onChange(date ? toIsoDate(date) : ''),
  })
  return (
    <DatePicker dropdownCaption {...datepickerProps}>
      <DatePicker.Input {...inputProps} label={label} hideLabel size="small" disabled={disabled} error={error} />
    </DatePicker>
  )
}

function ForstegangstjenesteSeksjon({
  linjer,
  opptjeningstyper,
  readOnly,
  fomFeil,
  onLeggTil,
  onSlett,
  onGjenopprett,
  onOppdater,
}: {
  linjer: ForstegangstjenesteLinjeState[]
  opptjeningstyper: OpptjeningstyperResponse
  readOnly: boolean
  fomFeil: Record<string, string>
  onLeggTil: () => void
  onSlett: (id: string) => void
  onGjenopprett: (id: string) => void
  onOppdater: (id: string, felt: keyof ForstegangstjenesteDTO, verdi: string) => void
}) {
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
                <Table.HeaderCell>Kilde</Table.HeaderCell>
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
                        (opptjeningstyper.forstegangstjeneste.typer.find(t => t.code === linje.inntektType)
                          ?.description ?? linje.inntektType)
                      ) : (
                        <Select
                          label="Type"
                          size="small"
                          hideLabel
                          value={linje.inntektType}
                          onChange={e => onOppdater(linje._id, 'inntektType', e.target.value)}
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
                        linje.fom || '–'
                      ) : (
                        <DatoVelgerCell
                          value={linje.fom}
                          label="FOM"
                          disabled={erSlettet}
                          error={!erSlettet ? fomFeil[linje._id] : undefined}
                          fromDate={new Date(2010, 0, 1)}
                          onChange={val => onOppdater(linje._id, 'fom', val)}
                        />
                      )}
                    </Table.DataCell>
                    <Table.DataCell>
                      {readOnly ? (
                        linje.tom || '–'
                      ) : (
                        <DatoVelgerCell
                          value={linje.tom}
                          label="TOM"
                          disabled={erSlettet}
                          onChange={val => onOppdater(linje._id, 'tom', val)}
                        />
                      )}
                    </Table.DataCell>
                    <Table.DataCell>
                      {readOnly ? (
                        (linje.kilde ?? '–')
                      ) : (
                        <TextField
                          label="Kilde"
                          hideLabel
                          value={linje.kilde ?? ''}
                          size="small"
                          disabled
                          style={{ width: '5.5rem' }}
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

export default function OppdaterGrunnlagRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { grunnlag, vurdering, opptjeningstyper, navident, readOnly } = loaderData
  const { errors } = actionData || {}
  const { avbrytAktivitet } = useOutletContext<AktivitetOutletContext>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state !== 'idle' && navigation.formData != null

  const saker = grunnlag.saker ?? []
  const [selectedSakId, setSelectedSakId] = useState('')
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const sakIdFeil = saker.length > 0 && !selectedSakId ? 'Du må velge en sak før du kan lagre' : undefined

  const defaultInntektType = opptjeningstyper.inntekt.typer[0]?.code ?? ''

  const grunnlagDto = grunnlag.opptjeningsGrunnlagDto

  const [inntektLinjer, setInntektLinjer] = useState<InntektLinjeState[]>(() => {
    const fraVurdering = vurdering?.inntektListe ?? []
    if (fraVurdering.length > 0) return fraVurdering.map(tilLinjeState)
    const fraGrunnlag = grunnlagDto?.inntektListe ?? []
    if (fraGrunnlag.length > 0) return fraGrunnlag.map(tilLinjeState)
    return [nyInntektLinje(defaultInntektType, navident)]
  })

  const [dagpengerLinjer, setDagpengerLinjer] = useState<DagpengerLinjeState[]>(() => {
    const fraVurdering = vurdering?.dagpengerListe ?? []
    if (fraVurdering.length > 0) return fraVurdering.map(tilLinjeState)
    return (grunnlagDto?.dagpengerListe ?? []).map(tilLinjeState)
  })

  const [omsorgLinjer, setOmsorgLinjer] = useState<OmsorgLinjeState[]>(() => {
    const fraVurdering = vurdering?.omsorgListe ?? []
    if (fraVurdering.length > 0) return fraVurdering.map(tilLinjeState)
    return (grunnlagDto?.omsorgListe ?? []).map(tilLinjeState)
  })

  const [forstegangstjenesteLinjer, setForstegangstjenesteLinjer] = useState<ForstegangstjenesteLinjeState[]>(() => {
    const fraVurdering = vurdering?.forstegangstjenesteListe ?? []
    if (fraVurdering.length > 0) return fraVurdering.map(tilLinjeState)
    return (grunnlagDto?.forstegangstjenesteListe ?? []).map(tilLinjeState)
  })

  const slettInntektLinje = (id: string) =>
    setInntektLinjer(prev => {
      const linje = prev.find(l => l._id === id)
      if (!linje) return prev
      if (linje._status === 'new') return prev.filter(l => l._id !== id)
      return prev.map(l => (l._id === id ? { ...l, _status: 'deleted' as const, kilde: navident } : l))
    })

  const gjenopprettInntektLinje = (id: string) =>
    setInntektLinjer(prev =>
      prev.map(l => {
        if (l._id !== id) return l
        const restored = { ...l, _status: 'original' as const }
        return { ...restored, _status: beregnStatus(restored, INNTEKT_FELTER) }
      }),
    )

  const slettDagpengerLinje = (id: string) =>
    setDagpengerLinjer(prev => {
      const linje = prev.find(l => l._id === id)
      if (!linje) return prev
      if (linje._status === 'new') return prev.filter(l => l._id !== id)
      return prev.map(l => (l._id === id ? { ...l, _status: 'deleted' as const, kilde: navident } : l))
    })

  const gjenopprettDagpengerLinje = (id: string) =>
    setDagpengerLinjer(prev =>
      prev.map(l => {
        if (l._id !== id) return l
        const restored = { ...l, _status: 'original' as const }
        return { ...restored, _status: beregnStatus(restored, DAGPENGER_FELTER) }
      }),
    )

  const slettOmsorgLinje = (id: string) =>
    setOmsorgLinjer(prev => {
      const linje = prev.find(l => l._id === id)
      if (!linje) return prev
      if (linje._status === 'new') return prev.filter(l => l._id !== id)
      return prev.map(l => (l._id === id ? { ...l, _status: 'deleted' as const, kilde: navident } : l))
    })

  const gjenopprettOmsorgLinje = (id: string) =>
    setOmsorgLinjer(prev =>
      prev.map(l => {
        if (l._id !== id) return l
        const restored = { ...l, _status: 'original' as const }
        return { ...restored, _status: beregnStatus(restored, ['inntektType', 'inntektAr', 'belop', 'kilde']) }
      }),
    )

  const slettForstegangstjenesteLinje = (id: string) =>
    setForstegangstjenesteLinjer(prev => {
      const linje = prev.find(l => l._id === id)
      if (!linje) return prev
      if (linje._status === 'new') return prev.filter(l => l._id !== id)
      return prev.map(l => (l._id === id ? { ...l, _status: 'deleted' as const, kilde: navident } : l))
    })

  const gjenopprettForstegangstjenesteLinje = (id: string) =>
    setForstegangstjenesteLinjer(prev =>
      prev.map(l => {
        if (l._id !== id) return l
        const restored = { ...l, _status: 'original' as const }
        return { ...restored, _status: beregnStatus(restored, FORSTEGANGSTJENESTE_FELTER) }
      }),
    )

  const oppdaterInntektLinje = (id: string, felt: keyof InntektDTO, verdi: string) => {
    setInntektLinjer(prev =>
      prev.map(l => {
        if (l._id !== id) return l
        let updated: InntektLinjeState
        if (felt === 'inntektAr') {
          const n = Number(verdi.replace(/\D/g, ''))
          updated = { ...l, inntektAr: n || l.inntektAr }
        } else if (felt === 'belop') {
          const clean = verdi.replace(/\D/g, '')
          updated = { ...l, belop: clean ? Number(clean) : null }
        } else if (felt === 'inntektType') {
          const requiredKommune = REQUIRED_KOMMUNE[verdi]
          updated = { ...l, inntektType: verdi, ...(requiredKommune !== undefined ? { kommune: requiredKommune } : {}) }
        } else {
          updated = { ...l, [felt]: verdi || null }
        }
        const status = beregnStatus({ ...updated, kilde: navident }, INNTEKT_FELTER)
        const kilde = status === 'original' ? (l._original?.kilde ?? navident) : navident
        return { ...updated, kilde, _status: status }
      }),
    )
  }

  const oppdaterDagpengerLinje = (id: string, felt: keyof DagpengerDTO, verdi: string) => {
    setDagpengerLinjer(prev =>
      prev.map(l => {
        if (l._id !== id) return l
        const NUMERIC: (keyof DagpengerDTO)[] = [
          'uavkortetDagpengegrunnlag',
          'utbetalteDagpenger',
          'ferietillegg',
          'barnetillegg',
        ]
        let updated: DagpengerLinjeState
        if (felt === 'inntektType') {
          if (l._original && verdi === l._original.inntektType) {
            updated = { ...l, ...l._original, _id: l._id, _status: l._status, _original: l._original }
          } else {
            updated = { ...l, inntektType: verdi }
          }
        } else if (felt === 'inntektAr') {
          const n = Number(verdi.replace(/\D/g, ''))
          updated = { ...l, inntektAr: n || l.inntektAr }
        } else if (NUMERIC.includes(felt)) {
          const clean = verdi.replace(/\D/g, '')
          updated = { ...l, [felt]: clean ? Number(clean) : null }
        } else {
          updated = { ...l, [felt]: verdi || null }
        }
        const status = beregnStatus({ ...updated, kilde: navident }, DAGPENGER_FELTER)
        const kilde = status === 'original' ? (l._original?.kilde ?? navident) : navident
        return { ...updated, kilde, _status: status }
      }),
    )
  }

  const oppdaterForstegangstjenesteLinje = (id: string, felt: keyof ForstegangstjenesteDTO, verdi: string) => {
    setForstegangstjenesteLinjer(prev =>
      prev.map(l => {
        if (l._id !== id) return l
        const updated: ForstegangstjenesteLinjeState = { ...l, [felt]: verdi || null }
        const status = beregnStatus({ ...updated, kilde: navident }, FORSTEGANGSTJENESTE_FELTER)
        const kilde = status === 'original' ? (l._original?.kilde ?? navident) : navident
        return { ...updated, kilde, _status: status }
      }),
    )
  }

  const inntektKommuneFeil = useMemo(() => {
    const feil: Record<string, string> = {}
    for (const linje of inntektLinjer) {
      if (linje._status === 'deleted') continue
      const required = REQUIRED_KOMMUNE[linje.inntektType]
      if (required && linje.kommune?.trim() !== required) {
        feil[linje._id] = `Skattekommune for denne inntektstypen må være ${required}`
      }
    }
    return feil
  }, [inntektLinjer])

  const forstegangstjenesteFomFeil = useMemo(() => {
    const feil: Record<string, string> = {}
    for (const linje of forstegangstjenesteLinjer) {
      if (linje._status === 'deleted') continue
      if (linje.fom && linje.fom < '2010-01-01') {
        feil[linje._id] = 'Tjenestestartdato kan ikke være før 01.01.2010'
      }
    }
    return feil
  }, [forstegangstjenesteLinjer])

  const harKlientFeil = Object.keys(inntektKommuneFeil).length > 0 || Object.keys(forstegangstjenesteFomFeil).length > 0

  const endringSummary = useMemo<{
    nye: EndringSummaryItem[]
    endrede: EndringSummaryItem[]
    slettede: EndringSummaryItem[]
  }>(
    () => ({
      nye: [
        ...inntektLinjer
          .filter(l => l._status === 'new')
          .map(l => ({
            id: l._id,
            kategori: 'Inntekt',
            label: `${typeLabel(opptjeningstyper, l.inntektType)} (${l.inntektAr})${l.belop != null ? ` – ${formatCurrencyNok(l.belop)}` : ''}`,
          })),
        ...dagpengerLinjer
          .filter(l => l._status === 'new')
          .map(l => ({
            id: l._id,
            kategori: 'Dagpenger',
            label: [
              `${typeLabel(opptjeningstyper, l.inntektType)} (${l.inntektAr})`,
              l.inntektType !== 'DP_FF' &&
                l.uavkortetDagpengegrunnlag != null &&
                `grunnlag: ${formatCurrencyNok(l.uavkortetDagpengegrunnlag)}`,
              l.utbetalteDagpenger != null && `utbetalt: ${formatCurrencyNok(l.utbetalteDagpenger)}`,
              l.inntektType !== 'DP_FF' && l.ferietillegg != null && `ferie: ${formatCurrencyNok(l.ferietillegg)}`,
              l.barnetillegg != null && `barn: ${formatCurrencyNok(l.barnetillegg)}`,
            ]
              .filter(Boolean)
              .join(' – '),
          })),
        ...forstegangstjenesteLinjer
          .filter(l => l._status === 'new')
          .map(l => ({
            id: l._id,
            kategori: 'Førstegangstjeneste',
            label: `${typeLabel(opptjeningstyper, l.inntektType)}${l.periodeType ? ` / ${typeLabel(opptjeningstyper, l.periodeType)}` : ''} – ${l.fom || '?'} til ${l.tom || '?'}`,
          })),
      ],
      endrede: [
        ...inntektLinjer
          .filter(l => l._status === 'modified')
          .map(l => ({
            id: l._id,
            kategori: 'Inntekt',
            label: `${typeLabel(opptjeningstyper, l.inntektType)} (${l.inntektAr})`,
            endringer: inntektEndringer(l, opptjeningstyper),
          })),
        ...dagpengerLinjer
          .filter(l => l._status === 'modified')
          .map(l => ({
            id: l._id,
            kategori: 'Dagpenger',
            label: `${typeLabel(opptjeningstyper, l.inntektType)} (${l.inntektAr})`,
            endringer: dagpengerEndringer(l, opptjeningstyper),
          })),
        ...forstegangstjenesteLinjer
          .filter(l => l._status === 'modified')
          .map(l => ({
            id: l._id,
            kategori: 'Førstegangstjeneste',
            label: `${typeLabel(opptjeningstyper, l.inntektType)} (${l.fom?.slice(0, 4) ?? '?'})`,
            endringer: forstegangstjenesteEndringer(l, opptjeningstyper),
          })),
      ],
      slettede: [
        ...inntektLinjer
          .filter(l => l._status === 'deleted')
          .map(l => ({
            id: l._id,
            kategori: 'Inntekt',
            label: `${typeLabel(opptjeningstyper, l.inntektType)} (${l.inntektAr})${l.belop != null ? ` – ${formatCurrencyNok(l.belop)}` : ''}`,
          })),
        ...dagpengerLinjer
          .filter(l => l._status === 'deleted')
          .map(l => ({
            id: l._id,
            kategori: 'Dagpenger',
            label: [
              `${typeLabel(opptjeningstyper, l.inntektType)} (${l.inntektAr})`,
              l.inntektType !== 'DP_FF' &&
                l.uavkortetDagpengegrunnlag != null &&
                `grunnlag: ${formatCurrencyNok(l.uavkortetDagpengegrunnlag)}`,
              l.utbetalteDagpenger != null && `utbetalt: ${formatCurrencyNok(l.utbetalteDagpenger)}`,
              l.inntektType !== 'DP_FF' && l.ferietillegg != null && `ferie: ${formatCurrencyNok(l.ferietillegg)}`,
              l.barnetillegg != null && `barn: ${formatCurrencyNok(l.barnetillegg)}`,
            ]
              .filter(Boolean)
              .join(' – '),
          })),
        ...omsorgLinjer
          .filter(l => l._status === 'deleted')
          .map(l => ({
            id: l._id,
            kategori: 'Omsorg',
            label: `${typeLabel(opptjeningstyper, l.inntektType)} (${l.inntektAr})${l.belop != null ? ` – ${formatCurrencyNok(l.belop)}` : ''}`,
          })),
        ...forstegangstjenesteLinjer
          .filter(l => l._status === 'deleted')
          .map(l => ({
            id: l._id,
            kategori: 'Førstegangstjeneste',
            label: `${typeLabel(opptjeningstyper, l.inntektType)}${l.periodeType ? ` / ${typeLabel(opptjeningstyper, l.periodeType)}` : ''} – ${l.fom || '?'} til ${l.tom || '?'}`,
          })),
      ],
    }),
    [inntektLinjer, dagpengerLinjer, omsorgLinjer, forstegangstjenesteLinjer, opptjeningstyper],
  )

  const harEndringer = endringSummary.nye.length + endringSummary.endrede.length + endringSummary.slettede.length > 0

  const payload = useMemo(() => {
    const fnr = grunnlag.opptjeningsGrunnlagDto?.fnr ?? ''

    const byStatus = <T extends { _status: LinjeStatus }>(linjer: T[]) => ({
      nye: linjer.filter(l => l._status === 'new'),
      endrede: linjer.filter(l => l._status === 'modified'),
      slettede: linjer.filter(l => l._status === 'deleted'),
    })

    const inntekt = byStatus(inntektLinjer)
    const dagpenger = byStatus(dagpengerLinjer)
    const omsorg = byStatus(omsorgLinjer)
    const ft = byStatus(forstegangstjenesteLinjer)

    return JSON.stringify({
      fnr,
      inntektEndringer: [
        ...(inntekt.nye.length > 0
          ? [{ endringstype: 'OPPRETT', inntektListe: inntekt.nye.map(l => toInntektBackend(l, fnr)) }]
          : []),
        ...(inntekt.endrede.length > 0
          ? [{ endringstype: 'OPPDATER', inntektListe: inntekt.endrede.map(l => toInntektBackend(l, fnr)) }]
          : []),
        ...(inntekt.slettede.length > 0
          ? [{ endringstype: 'SLETT', inntektListe: inntekt.slettede.map(l => toInntektBackend(l, fnr)) }]
          : []),
      ],
      dagpengerEndringer: [
        ...(dagpenger.nye.length > 0
          ? [{ endringstype: 'OPPRETT', dagpengerListe: dagpenger.nye.map(l => toDagpengerBackend(l, fnr)) }]
          : []),
        ...(dagpenger.endrede.length > 0
          ? [{ endringstype: 'OPPDATER', dagpengerListe: dagpenger.endrede.map(l => toDagpengerBackend(l, fnr)) }]
          : []),
        ...(dagpenger.slettede.length > 0
          ? [{ endringstype: 'SLETT', dagpengerListe: dagpenger.slettede.map(l => toDagpengerBackend(l, fnr)) }]
          : []),
      ],
      omsorgEndringer: [
        ...(omsorg.slettede.length > 0
          ? [{ endringstype: 'SLETT', omsorgListe: omsorg.slettede.map(l => toOmsorgBackend(l, fnr)) }]
          : []),
      ],
      forstegangstjenesteEndringer: [
        ...ft.nye.map(l => ({ endringstype: 'OPPRETT', forstegangstjeneste: toForstegangstjenesteBackend(l, fnr) })),
        ...ft.endrede.map(l => ({
          endringstype: 'OPPDATER',
          forstegangstjeneste: toForstegangstjenesteBackend(l, fnr),
        })),
        ...ft.slettede.map(l => ({ endringstype: 'SLETT', forstegangstjeneste: toForstegangstjenesteBackend(l, fnr) })),
      ],
    })
  }, [grunnlag, inntektLinjer, dagpengerLinjer, omsorgLinjer, forstegangstjenesteLinjer])

  const seksjoner = (
    <VStack gap="space-24">
      <InntekterSeksjon
        linjer={inntektLinjer}
        opptjeningstyper={opptjeningstyper}
        readOnly={readOnly}
        kommuneFeil={inntektKommuneFeil}
        onLeggTil={() => setInntektLinjer(prev => [...prev, nyInntektLinje(defaultInntektType, navident)])}
        onSlett={slettInntektLinje}
        onGjenopprett={gjenopprettInntektLinje}
        onOppdater={oppdaterInntektLinje}
      />
      <DagpengerSeksjon
        linjer={dagpengerLinjer}
        opptjeningstyper={opptjeningstyper}
        readOnly={readOnly}
        onLeggTil={() => setDagpengerLinjer(prev => [...prev, nyDagpengerLinje(navident)])}
        onSlett={slettDagpengerLinje}
        onGjenopprett={gjenopprettDagpengerLinje}
        onOppdater={oppdaterDagpengerLinje}
      />
      <OmsorgSeksjon
        linjer={omsorgLinjer}
        opptjeningstyper={opptjeningstyper}
        readOnly={readOnly}
        onSlett={slettOmsorgLinje}
        onGjenopprett={gjenopprettOmsorgLinje}
      />
      <ForstegangstjenesteSeksjon
        linjer={forstegangstjenesteLinjer}
        opptjeningstyper={opptjeningstyper}
        readOnly={readOnly}
        fomFeil={forstegangstjenesteFomFeil}
        onLeggTil={() => setForstegangstjenesteLinjer(prev => [...prev, nyForstegangstjenesteLinje(navident)])}
        onSlett={slettForstegangstjenesteLinje}
        onGjenopprett={gjenopprettForstegangstjenesteLinje}
        onOppdater={oppdaterForstegangstjenesteLinje}
      />
    </VStack>
  )

  return (
    <Page.Block gutters className={styles.page}>
      <VStack gap="space-32">
        <Heading size="medium" level="2">
          Oppdater pensjonsgivende inntekt
        </Heading>

        {readOnly && (
          <Alert variant="info">
            Kun saksbehandlere med tilleggsrolle «Spesial PGI» kan gjøre endringer i Opptjeningsregisteret.
          </Alert>
        )}

        {errors?._form && <Alert variant="error">{errors._form}</Alert>}

        {readOnly ? (
          seksjoner
        ) : (
          <Form
            method="post"
            onSubmit={e => {
              setHasAttemptedSubmit(true)
              if (!harEndringer) e.preventDefault()
            }}
          >
            <VStack gap="space-24">
              {saker.length > 0 && (
                <Box>
                  <Heading size="small" level="3" spacing>
                    Velg sak
                  </Heading>
                  <Select
                    label="Sak"
                    name="sakId"
                    size="small"
                    value={selectedSakId}
                    onChange={e => setSelectedSakId(e.target.value)}
                  >
                    <option value="">Velg sak</option>
                    {saker.map(sak => (
                      <option key={sak.sakId} value={sak.sakId}>
                        {sak.sakId}
                        {sak.sakType ? ` – ${sak.sakType}` : ''}
                        {sak.sakStatus ? ` (${sak.sakStatus})` : ''}
                      </option>
                    ))}
                  </Select>
                </Box>
              )}

              {seksjoner}

              {harEndringer && (
                <Alert variant="info">
                  <Heading size="xsmall" level="3" spacing>
                    Endringer som vil bli lagret
                  </Heading>
                  <VStack gap="space-12">
                    {endringSummary.nye.length > 0 && (
                      <div>
                        <strong>Nye linjer ({endringSummary.nye.length})</strong>
                        <ul>
                          {endringSummary.nye.map(item => (
                            <li key={item.id}>
                              {item.kategori}: {item.label}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {endringSummary.endrede.length > 0 && (
                      <div>
                        <strong>Endrede linjer ({endringSummary.endrede.length})</strong>
                        <ul>
                          {endringSummary.endrede.map(item => (
                            <li key={item.id}>
                              {item.kategori}: {item.label}
                              {item.endringer && item.endringer.length > 0 && (
                                <ul>
                                  {item.endringer.map(e => (
                                    <li key={e}>{e}</li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {endringSummary.slettede.length > 0 && (
                      <div>
                        <strong>Slettede linjer ({endringSummary.slettede.length})</strong>
                        <ul>
                          {endringSummary.slettede.map(item => (
                            <li key={item.id}>
                              {item.kategori}: {item.label}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </VStack>
                </Alert>
              )}

              <input type="hidden" name="payload" value={payload} />

              {sakIdFeil && <Alert variant="error">{sakIdFeil}</Alert>}

              {hasAttemptedSubmit && !harEndringer && (
                <Alert variant="warning">Ingen endringer er registrert. Gjør minst én endring før du lagrer.</Alert>
              )}

              <HStack gap="space-8">
                <Button
                  type="submit"
                  variant="primary"
                  size="small"
                  loading={isSubmitting}
                  disabled={harKlientFeil || !!sakIdFeil}
                >
                  Lagre og gå videre
                </Button>
                <Button type="button" variant="tertiary" size="small" onClick={avbrytAktivitet} disabled={isSubmitting}>
                  Avbryt behandling
                </Button>
                {/* DEBUG */}
                <Button
                  type="button"
                  variant="tertiary-neutral"
                  size="small"
                  onClick={() => console.log('[DEBUG payload]', JSON.parse(payload))}
                >
                  Log payload
                </Button>
              </HStack>
            </VStack>
          </Form>
        )}
      </VStack>
    </Page.Block>
  )
}
