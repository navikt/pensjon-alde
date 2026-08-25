import { InformationSquareIcon } from '@navikt/aksel-icons'
import { BodyShort, Heading, InfoCard, Table, Tag, VStack } from '@navikt/ds-react'
import { useMemo } from 'react'
import { Fnr } from '~/components/Fnr'
import { CopyableValue } from '~/components/shared/CopyableValue'
import { formatCurrencyNok } from '~/utils/currency'
import { EndringsOppsummering } from './EndringsOppsummering'
import { endringSummaryFraVurdering } from './oppdater-grunnlag/oppdater-grunnlag.utils'
import type {
  DagpengerBackendDTO,
  Endringstype,
  ForstegangstjenesteBackendDTO,
  InntektBackendDTO,
  OmsorgBackendDTO,
  OppdaterOpptjeningGrunnlag,
  OppdaterOpptjeningVurdering,
  OpptjeningstyperResponse,
} from './oppdater-grunnlag/oppdater-grunnlag-types'
import { typeLabel } from './opptjeningstyper.utils'

export function EndringstypeTag({ endringstype }: { endringstype: Endringstype }) {
  if (endringstype === 'OPPRETT')
    return (
      <Tag variant="success" size="small">
        Ny
      </Tag>
    )
  if (endringstype === 'OPPDATER')
    return (
      <Tag variant="warning" size="small">
        Endret
      </Tag>
    )
  if (endringstype === 'SLETT')
    return (
      <Tag variant="error" size="small">
        Slettet
      </Tag>
    )
  return null
}

interface OppdaterOpptjeningEndringerProps {
  vurdering: OppdaterOpptjeningVurdering | null
  opptjeningstyper: OpptjeningstyperResponse
  opptjeningsGrunnlag?: OppdaterOpptjeningGrunnlag['opptjeningsGrunnlagDto']
}

export function OppdaterOpptjeningEndringer({
  vurdering,
  opptjeningstyper,
  opptjeningsGrunnlag,
}: OppdaterOpptjeningEndringerProps) {
  type InntektMedEndring = { endringstype: Endringstype; inntekt: InntektBackendDTO }
  type DagpengerMedEndring = { endringstype: Endringstype; dagpenger: DagpengerBackendDTO }
  type OmsorgMedEndring = { endringstype: Endringstype; omsorg: OmsorgBackendDTO }
  type ForstegangstjenesteMedEndring = { endringstype: Endringstype; ft: ForstegangstjenesteBackendDTO }

  const inntekter: InntektMedEndring[] = (vurdering?.inntektEndringer ?? []).flatMap(e =>
    e.inntektListe.map(i => ({ endringstype: e.endringstype, inntekt: i })),
  )

  const dagpenger: DagpengerMedEndring[] = (vurdering?.dagpengerEndringer ?? []).flatMap(e =>
    e.dagpengerListe.map(d => ({ endringstype: e.endringstype, dagpenger: d })),
  )

  const omsorg: OmsorgMedEndring[] = (vurdering?.omsorgEndringer ?? []).flatMap(e =>
    e.omsorgListe.map(o => ({ endringstype: e.endringstype, omsorg: o })),
  )

  const forstegangstjeneste: ForstegangstjenesteMedEndring[] = (vurdering?.forstegangstjenesteEndringer ?? []).map(
    e => ({ endringstype: e.endringstype, ft: e.forstegangstjeneste }),
  )

  const harData = inntekter.length + dagpenger.length + omsorg.length + forstegangstjeneste.length > 0

  const summary = useMemo(
    () => endringSummaryFraVurdering(vurdering, opptjeningsGrunnlag, opptjeningstyper),
    [vurdering, opptjeningsGrunnlag, opptjeningstyper],
  )

  if (!harData) {
    return <BodyShort>Ingen endringer registrert.</BodyShort>
  }

  return (
    <VStack gap="space-28">
      {vurdering?.sakId != null && (
        <CopyableValue
          title="Saksnummer:"
          text={String(vurdering.sakId)}
          textColor="default"
          textWeight="semibold"
          textSize="medium"
          value={String(vurdering.sakId)}
          useAccentColor={false}
        />
      )}

      <InfoCard data-color="info">
        <InfoCard.Header icon={<InformationSquareIcon aria-hidden />}>
          <InfoCard.Title as="h3">Oppsummering av endringene</InfoCard.Title>
        </InfoCard.Header>
        <InfoCard.Content>
          <BodyShort spacing>Endringene vil først bli gjeldende ved godkjenning.</BodyShort>

          <EndringsOppsummering summary={summary} />
        </InfoCard.Content>
      </InfoCard>

      {inntekter.length > 0 && (
        <div>
          <Heading size="xsmall" level="4" spacing>
            Inntekter
          </Heading>
          <Table size="small" style={{ width: '100%' }}>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell style={{ width: '7rem' }}>Endring</Table.HeaderCell>
                <Table.HeaderCell>Type</Table.HeaderCell>
                <Table.HeaderCell>År</Table.HeaderCell>
                <Table.HeaderCell>Beløp</Table.HeaderCell>
                <Table.HeaderCell>Skattekommune</Table.HeaderCell>
                <Table.HeaderCell>Kilde</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {inntekter.map(({ endringstype, inntekt: i }) => (
                <Table.Row key={`${endringstype}-${i.inntektType}-${i.inntektAr}-${i.inntektId ?? ''}`}>
                  <Table.DataCell>
                    <EndringstypeTag endringstype={endringstype} />
                  </Table.DataCell>
                  <Table.DataCell>{typeLabel(opptjeningstyper, i.inntektType)}</Table.DataCell>
                  <Table.DataCell>{i.inntektAr}</Table.DataCell>
                  <Table.DataCell>{i.belop != null ? formatCurrencyNok(Number(i.belop)) : '–'}</Table.DataCell>
                  <Table.DataCell>{i.kommune ?? '–'}</Table.DataCell>
                  <Table.DataCell>{i.kilde ?? '–'}</Table.DataCell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}

      {dagpenger.length > 0 && (
        <div>
          <Heading size="xsmall" level="4" spacing>
            Dagpenger
          </Heading>
          <Table size="small" style={{ width: '100%' }}>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell style={{ width: '7rem' }}>Endring</Table.HeaderCell>
                <Table.HeaderCell>Type</Table.HeaderCell>
                <Table.HeaderCell>År</Table.HeaderCell>
                <Table.HeaderCell>Uavkortet grunnlag</Table.HeaderCell>
                <Table.HeaderCell>Utbetalte dagpenger</Table.HeaderCell>
                <Table.HeaderCell>Ferietillegg</Table.HeaderCell>
                <Table.HeaderCell>Barnetillegg</Table.HeaderCell>
                <Table.HeaderCell>Kilde</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {dagpenger.map(({ endringstype, dagpenger: d }) => (
                <Table.Row key={`${endringstype}-${d.dagpengerType}-${d.ar}-${d.dagpengerId ?? ''}`}>
                  <Table.DataCell>
                    <EndringstypeTag endringstype={endringstype} />
                  </Table.DataCell>
                  <Table.DataCell>{typeLabel(opptjeningstyper, d.dagpengerType)}</Table.DataCell>
                  <Table.DataCell>{d.ar}</Table.DataCell>
                  <Table.DataCell>
                    {d.uavkortetDagpengegrunnlag != null ? formatCurrencyNok(Number(d.uavkortetDagpengegrunnlag)) : '–'}
                  </Table.DataCell>
                  <Table.DataCell>
                    {d.utbetalteDagpenger != null ? formatCurrencyNok(Number(d.utbetalteDagpenger)) : '–'}
                  </Table.DataCell>
                  <Table.DataCell>
                    {d.ferietillegg != null ? formatCurrencyNok(Number(d.ferietillegg)) : '–'}
                  </Table.DataCell>
                  <Table.DataCell>
                    {d.barnetillegg != null ? formatCurrencyNok(Number(d.barnetillegg)) : '–'}
                  </Table.DataCell>
                  <Table.DataCell>{d.kilde ?? '–'}</Table.DataCell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}

      {omsorg.length > 0 && (
        <div>
          <Heading size="xsmall" level="4" spacing>
            Omsorg
          </Heading>
          <Table size="small" style={{ width: '100%' }}>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell style={{ width: '7rem' }}>Endring</Table.HeaderCell>
                <Table.HeaderCell>Type</Table.HeaderCell>
                <Table.HeaderCell>År</Table.HeaderCell>
                <Table.HeaderCell>Omsorg for (fnr)</Table.HeaderCell>
                <Table.HeaderCell>Kilde</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {omsorg.map(({ endringstype, omsorg: o }) => (
                <Table.Row key={`${endringstype}-${o.omsorgType}-${o.ar}-${o.omsorgId ?? o.fnrOmsorgFor ?? ''}`}>
                  <Table.DataCell>
                    <EndringstypeTag endringstype={endringstype} />
                  </Table.DataCell>
                  <Table.DataCell>{typeLabel(opptjeningstyper, o.omsorgType)}</Table.DataCell>
                  <Table.DataCell>{o.ar}</Table.DataCell>
                  <Table.DataCell>{o.fnrOmsorgFor ? <Fnr value={o.fnrOmsorgFor} /> : '–'}</Table.DataCell>
                  <Table.DataCell>{o.kilde ?? '–'}</Table.DataCell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}

      {forstegangstjeneste.length > 0 && (
        <div>
          <Heading size="xsmall" level="4" spacing>
            Førstegangstjeneste
          </Heading>
          <Table size="small" style={{ width: '100%' }}>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell style={{ width: '7rem' }}>Endring</Table.HeaderCell>
                <Table.HeaderCell>Type</Table.HeaderCell>
                <Table.HeaderCell>Periodetype</Table.HeaderCell>
                <Table.HeaderCell>FOM</Table.HeaderCell>
                <Table.HeaderCell>TOM</Table.HeaderCell>
                <Table.HeaderCell>Kilde</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {forstegangstjeneste.map(({ endringstype, ft }) => {
                const periode = ft.forstegangstjenestePeriodeListe[0]
                return (
                  <Table.Row key={`${endringstype}-${ft.tjenestestartDato}-${ft.forstegangstjenesteId ?? ''}`}>
                    <Table.DataCell>
                      <EndringstypeTag endringstype={endringstype} />
                    </Table.DataCell>
                    <Table.DataCell>{periode ? typeLabel(opptjeningstyper, periode.tjenesteType) : '–'}</Table.DataCell>
                    <Table.DataCell>
                      {periode?.periodeType ? typeLabel(opptjeningstyper, periode.periodeType) : '–'}
                    </Table.DataCell>
                    <Table.DataCell>{ft.tjenestestartDato ?? '–'}</Table.DataCell>
                    <Table.DataCell>{ft.dimitteringDato ?? '–'}</Table.DataCell>
                    <Table.DataCell>{ft.kilde ?? '–'}</Table.DataCell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table>
        </div>
      )}
    </VStack>
  )
}
