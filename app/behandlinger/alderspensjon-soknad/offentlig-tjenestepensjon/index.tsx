import { BodyLong, BodyShort, Heading, HStack, Label, Table, VStack } from '@navikt/ds-react'
import { useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import AktivitetVurderingLayout from '~/components/shared/AktivitetVurderingLayout'
import type { AktivitetComponentProps } from '~/types/aktivitet-component'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import { formatDateToNorwegian } from '~/utils/date'
import type { Route } from './+types'

export function meta() {
  return [{ title: 'Offentlig tjenestepensjon' }, { name: 'description', content: 'Offentlig tjenestepensjon' }]
}

export type BelopData = {
  belop: number
  fomDato: string
}

export type Innvilget = {
  type?: 'Innvilget'
  tpNummer: number
  belop: BelopData[]
  startdato: string
  sistRegulert: number
}

export type Soknad = {
  type?: 'Soknad'
  tpNummer: number
  onsketVirkningsdato: string
}

export type Ingen = {
  type?: 'Ingen'
}

export type Ukjent = {
  type?: 'Ukjent'
  tpNummer: number
}

export type AldeAfpOffentligStatus = Innvilget | Soknad | Ingen | Ukjent

export type OffentligTjenestepensjonGrunnlag = {
  afpOffentligStatus: AldeAfpOffentligStatus[]
}

export type OffentligTjenestepensjonVurdering = {
  afpOffentligStatus: AldeAfpOffentligStatus
} | null

const hasProp = (obj: unknown, prop: string): boolean => typeof obj === 'object' && obj !== null && prop in obj

const isInnvilget = (s: AldeAfpOffentligStatus): s is Innvilget => hasProp(s, 'belop') && hasProp(s, 'startdato')

const isSoknad = (s: AldeAfpOffentligStatus): s is Soknad => hasProp(s, 'onsketVirkningsdato')

const isUkjent = (s: AldeAfpOffentligStatus): s is Ukjent => hasProp(s, 'tpNummer') && !isInnvilget(s) && !isSoknad(s)

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params

  const api = createAktivitetApi({ request, behandlingId, aktivitetId })

  const grunnlag = await api.hentGrunnlagsdata<OffentligTjenestepensjonGrunnlag>()
  const vurdering = await api.hentVurdering<OffentligTjenestepensjonVurdering>()

  return {
    readOnly: false,
    grunnlag,
    vurdering,
  }
}

export async function action() {
  return null
}

export default function OffentligTjenestepensjonRoute({ loaderData }: Route.ComponentProps) {
  const { grunnlag, vurdering, readOnly } = loaderData
  const { aktivitet, behandling } = useOutletContext<AktivitetOutletContext>()

  return (
    <OffentligTjenestepensjonComponent
      readOnly={readOnly}
      grunnlag={grunnlag}
      vurdering={vurdering}
      aktivitet={aktivitet}
      behandling={behandling}
    />
  )
}

function statusKey(s: AldeAfpOffentligStatus) {
  if (isInnvilget(s)) return `innvilget-${s.tpNummer}-${s.startdato}-${s.sistRegulert}`
  if (isSoknad(s)) return `soknad-${s.tpNummer}-${s.onsketVirkningsdato}`
  if (isUkjent(s)) return `ukjent-${s.tpNummer}`
  return 'ingen'
}

function belopKey(b: BelopData) {
  return `${b.fomDato}-${b.belop}`
}

const hasStatuses = (g: unknown): g is OffentligTjenestepensjonGrunnlag =>
  typeof g === 'object' && g !== null && 'afpOffentligStatus' in g

function OffentligTjenestepensjonComponent({
  grunnlag,
  vurdering,
  aktivitet,
}: AktivitetComponentProps<OffentligTjenestepensjonGrunnlag, OffentligTjenestepensjonVurdering>) {
  const statuses = hasStatuses(grunnlag) ? grunnlag.afpOffentligStatus : []

  return (
    <AktivitetVurderingLayout aktivitet={aktivitet} sidebar={null}>
      <AktivitetVurderingLayout.Section>
        <VStack gap="2">
          <Heading size="xsmall" level="2">
            Offentlig tjenestepensjon
          </Heading>
          {statuses.length > 0 ? (
            <VStack gap="6">
              {statuses.map(s => (
                <VStack key={statusKey(s)} gap="2">
                  {isInnvilget(s) && (
                    <VStack gap="2">
                      <HStack gap="2" align="center">
                        <Label>Innvilget</Label>
                        <BodyShort>TP-nummer: {s.tpNummer}</BodyShort>
                      </HStack>
                      <BodyShort>Startdato: {formatDateToNorwegian(s.startdato)}</BodyShort>
                      <BodyShort>Sist regulert: {s.sistRegulert}</BodyShort>
                      {s.belop?.length ? (
                        <div>
                          <Label as="p">Beløp</Label>
                          <Table size="small">
                            <Table.Header>
                              <Table.Row>
                                <Table.HeaderCell scope="col">Fra og med</Table.HeaderCell>
                                <Table.HeaderCell scope="col">Beløp</Table.HeaderCell>
                              </Table.Row>
                            </Table.Header>
                            <Table.Body>
                              {s.belop.map(b => (
                                <Table.Row key={belopKey(b)}>
                                  <Table.DataCell>{formatDateToNorwegian(b.fomDato)}</Table.DataCell>
                                  <Table.DataCell>{b.belop.toLocaleString('nb-NO')}</Table.DataCell>
                                </Table.Row>
                              ))}
                            </Table.Body>
                          </Table>
                        </div>
                      ) : null}
                    </VStack>
                  )}
                  {isSoknad(s) && (
                    <VStack gap="2">
                      <HStack gap="2" align="center">
                        <Label>Søknad</Label>
                        <BodyShort>TP-nummer: {s.tpNummer}</BodyShort>
                      </HStack>
                      <BodyShort>Ønsket virkningsdato: {formatDateToNorwegian(s.onsketVirkningsdato)}</BodyShort>
                    </VStack>
                  )}
                  {!isInnvilget(s) && !isSoknad(s) && (
                    <VStack gap="2">
                      <HStack gap="2" align="center">
                        <Label>{isUkjent(s) ? 'Ukjent status' : 'Ingen'}</Label>
                        {isUkjent(s) && <BodyShort>TP-nummer: {s.tpNummer}</BodyShort>}
                      </HStack>
                      {!isUkjent(s) && <BodyLong>Ingen offentlig tjenestepensjon registrert.</BodyLong>}
                    </VStack>
                  )}
                </VStack>
              ))}
            </VStack>
          ) : (
            <BodyLong>Ingen informasjon om offentlig tjenestepensjon.</BodyLong>
          )}
        </VStack>
      </AktivitetVurderingLayout.Section>

      {vurdering && (
        <AktivitetVurderingLayout.Section>
          <VStack gap="2">
            <Heading size="xsmall" level="2">
              Vurdering
            </Heading>
            {isInnvilget(vurdering.afpOffentligStatus) && <BodyShort>Innvilget offentlig tjenestepensjon</BodyShort>}
            {isSoknad(vurdering.afpOffentligStatus) && <BodyShort>Det foreligger søknad</BodyShort>}
            {!isInnvilget(vurdering.afpOffentligStatus) && !isSoknad(vurdering.afpOffentligStatus) && (
              <BodyShort>Ingen eller ukjent status</BodyShort>
            )}
          </VStack>
        </AktivitetVurderingLayout.Section>
      )}
    </AktivitetVurderingLayout>
  )
}

export const Component = OffentligTjenestepensjonComponent
