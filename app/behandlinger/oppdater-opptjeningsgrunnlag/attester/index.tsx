import { InformationSquareIcon } from '@navikt/aksel-icons'
import {
  BodyShort,
  Button,
  CopyButton,
  Heading,
  HStack,
  InfoCard,
  Page,
  Radio,
  RadioGroup,
  Table,
  Tag,
  VStack,
} from '@navikt/ds-react'
import { useState } from 'react'
import { data, Form, redirect, useNavigation, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import { createBehandlingApi } from '~/api/behandling-api'
import { fetchOpptjeningstyper } from '~/api/opptjeningstyper-api.server'
import styles from '~/common.module.css'
import { userContext } from '~/context/user-context'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import { formatCurrencyNok } from '~/utils/currency'
import type {
  DagpengerBackendDTO,
  Endringstype,
  ForstegangstjenesteBackendDTO,
  InntektBackendDTO,
  OppdaterOpptjeningVurdering,
  OpptjeningstyperResponse,
} from '../oppdater-grunnlag/oppdater-grunnlag-types'
import type { Route } from './+types'

type AttesterGrunnlag = {
  vurdering: OppdaterOpptjeningVurdering
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

function EndringstypeTag({ endringstype }: { endringstype: Endringstype }) {
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
  return (
    <Tag variant="error" size="small">
      Slettet
    </Tag>
  )
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { navident } = context.get(userContext)
  const { behandlingId, aktivitetId } = params
  const api = createAktivitetApi({ request, behandlingId, aktivitetId })

  const [grunnlag, opptjeningstyper] = await Promise.all([
    api.hentGrunnlagsdata<AttesterGrunnlag>(),
    fetchOpptjeningstyper(request),
  ])

  return { navident, grunnlag, opptjeningstyper }
}

enum AttesteringUtfall {
  GODKJENN = 'GODKJENN',
  IKKE_GODKJENN = 'IKKE_GODKJENN',
}

export async function action({ params, request }: Route.ActionArgs) {
  const { behandlingId } = params
  const behandlingApi = createBehandlingApi({ request, behandlingId })

  const formData = await request.formData()
  const utfall = formData.get('utfall') as AttesteringUtfall

  if (utfall === AttesteringUtfall.GODKJENN) {
    await behandlingApi.attester()
    return redirect(`/behandling/${behandlingId}/attestert-og-iverksatt`)
  } else if (utfall === AttesteringUtfall.IKKE_GODKJENN) {
    const begrunnelse = formData.get('begrunnelse') as string

    if (begrunnelse) {
      await behandlingApi.returnerTilSaksbehandler(begrunnelse)
      return redirect(`/behandling/${behandlingId}/attestering-returnert-til-saksbehandler`)
    } else {
      return data(
        {
          errors: { begrunnelse: 'Begrunnelse må fylles ut' },
          data: {
            utfall,
            begrunnelse,
          },
        },
        { status: 400 },
      )
    }
  }
}

export default function AttesterRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { errors, data: actionResultData } = actionData || {}
  const { grunnlag, opptjeningstyper } = loaderData
  const { avbrytAktivitet } = useOutletContext<AktivitetOutletContext>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state !== 'idle' && navigation.formData != null
  const [utfall, setUtfall] = useState<string>('')

  const vurdering = grunnlag.vurdering

  type InntektMedEndring = { endringstype: Endringstype; inntekt: InntektBackendDTO }
  type DagpengerMedEndring = { endringstype: Endringstype; dagpenger: DagpengerBackendDTO }
  type ForstegangstjenesteMedEndring = { endringstype: Endringstype; ft: ForstegangstjenesteBackendDTO }

  const inntekter: InntektMedEndring[] = (vurdering?.inntektEndringer ?? []).flatMap(e =>
    e.inntektListe.map(i => ({ endringstype: e.endringstype, inntekt: i })),
  )

  const dagpenger: DagpengerMedEndring[] = (vurdering?.dagpengerEndringer ?? []).flatMap(e =>
    e.dagpengerListe.map(d => ({ endringstype: e.endringstype, dagpenger: d })),
  )

  const forstegangstjeneste: ForstegangstjenesteMedEndring[] = (vurdering?.forstegangstjenesteEndringer ?? []).map(
    e => ({ endringstype: e.endringstype, ft: e.forstegangstjeneste }),
  )

  const harData = inntekter.length + dagpenger.length + forstegangstjeneste.length > 0

  return (
    <Page.Block gutters className={styles.page}>
      <Heading size="medium" level="2">
        Attester oppdatering av opptjeningsgrunnlag
      </Heading>

      <VStack gap="space-32">
        {vurdering?.sakId != null && (
          <HStack gap="space-4" align="center">
            <BodyShort weight="semibold">Saksnummer:</BodyShort>
            <CopyButton
              size="small"
              copyText={String(vurdering.sakId)}
              text={String(vurdering.sakId)}
              activeText="Kopiert!"
              iconPosition="right"
            />
          </HStack>
        )}
        {harData ? (
          <>
            <InfoCard data-color="info">
              <InfoCard.Header icon={<InformationSquareIcon aria-hidden />}>
                <InfoCard.Title as="h3">Endringer til attestering</InfoCard.Title>
              </InfoCard.Header>
              <InfoCard.Content>Endringene vil først bli gjeldende ved godkjenning.</InfoCard.Content>
            </InfoCard>

            <VStack gap="space-32">
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
                            {d.uavkortetDagpengegrunnlag != null
                              ? formatCurrencyNok(Number(d.uavkortetDagpengegrunnlag))
                              : '–'}
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
                            <Table.DataCell>
                              {periode ? typeLabel(opptjeningstyper, periode.tjenesteType) : '–'}
                            </Table.DataCell>
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
          </>
        ) : (
          <BodyShort>Ingen endringer registrert.</BodyShort>
        )}

        <Form method="post">
          <VStack gap="space-24">
            <RadioGroup legend="Utfall" name="utfall" value={utfall} onChange={setUtfall}>
              <Radio value="GODKJENN">Godkjenn</Radio>
              <Radio value="IKKE_GODKJENN">Returner til saksbehandler</Radio>
            </RadioGroup>

            {utfall === 'IKKE_GODKJENN' && (
              <RadioGroup
                legend="Velg begrunnelse"
                name="begrunnelse"
                error={errors?.begrunnelse}
                defaultValue={actionResultData?.begrunnelse}
              >
                <Radio size="small" value="Feil i vedtak">
                  Feil i vedtak
                </Radio>

                <Radio size="small" value="Forvaltningsnotat utilstrekkelig">
                  Forvaltningsnotat utilstrekkelig
                </Radio>

                <Radio size="small" value="Hent inn nytt grunnlag">
                  Hent inn nytt grunnlag
                </Radio>

                <Radio size="small" value="Saksbehandlerstandard ikke fulgt">
                  Saksbehandlerstandard ikke fulgt
                </Radio>
              </RadioGroup>
            )}

            <VStack gap="space-8" align="start">
              <Button type="submit" variant="primary" size="small" loading={isSubmitting}>
                Bekreft
              </Button>
              <Button type="button" variant="tertiary" size="small" onClick={avbrytAktivitet} disabled={isSubmitting}>
                Avbryt behandling
              </Button>
            </VStack>
          </VStack>
        </Form>
      </VStack>
    </Page.Block>
  )
}
