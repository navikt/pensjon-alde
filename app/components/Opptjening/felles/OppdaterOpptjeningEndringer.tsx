import { InformationSquareIcon } from '@navikt/aksel-icons'
import { BodyShort, Heading, InfoCard, Table, Tag, VStack } from '@navikt/ds-react'
import { useMemo } from 'react'
import { Fnr } from '~/components/Fnr'
import { CopyableValue } from '~/components/shared/CopyableValue'
import { AldeBehandlingStatus, type BehandlingDTO } from '~/types/behandling'
import { medOmsorgGrunnlag } from '../Omsorg/omsorg.utils'
import type { OmsorgGrunnlagDTO } from '../Omsorg/omsorg-types'
import { EndringsOppsummering } from './EndringsOppsummering'
import { endringSummaryFraVurdering } from './opptjening.utils'
import type {
  Endringstype,
  OppdaterOpptjeningGrunnlag,
  OppdaterOpptjeningVurdering,
  OpptjeningstyperResponse,
} from './opptjening-types'
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
  behandling: BehandlingDTO
  vurdering: OppdaterOpptjeningVurdering | null
  opptjeningstyper: OpptjeningstyperResponse
  opptjeningsGrunnlag?: OppdaterOpptjeningGrunnlag['opptjeningsGrunnlagDto']
}

export function OppdaterOpptjeningEndringer({
  behandling,
  vurdering,
  opptjeningstyper,
  opptjeningsGrunnlag,
}: OppdaterOpptjeningEndringerProps) {
  type OmsorgMedEndring = { endringstype: Endringstype; omsorg: OmsorgGrunnlagDTO }

  const omsorg: OmsorgMedEndring[] = (vurdering?.omsorgTilSletting ?? []).map(o => ({
    endringstype: 'SLETT',
    omsorg: medOmsorgGrunnlag(o, opptjeningsGrunnlag?.omsorgListe),
  }))

  const harData = omsorg.length > 0

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
          {behandling.aldeBehandlingStatus === AldeBehandlingStatus.VENTER_ATTESTERING && (
            <BodyShort spacing>Endringene vil først bli gjeldende ved godkjenning.</BodyShort>
          )}

          <EndringsOppsummering summary={summary} />
        </InfoCard.Content>
      </InfoCard>

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
    </VStack>
  )
}
