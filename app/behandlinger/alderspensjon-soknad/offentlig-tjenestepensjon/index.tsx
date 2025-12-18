import { BodyLong, BodyShort, Button, Heading, HStack, Page, Radio, RadioGroup, VStack } from '@navikt/ds-react'
import { Form, redirect, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import { createBehandlingApi } from '~/api/behandling-api'
import commonStyles from '~/common.module.css'
import AktivitetVurderingLayout from '~/components/shared/AktivitetVurderingLayout'
import { Features } from '~/features'
import type { AktivitetComponentProps } from '~/types/aktivitet-component'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import type { AktivitetDTO } from '~/types/behandling'
import { buildUrl } from '~/utils/build-url'
import { formatDateToNorwegian } from '~/utils/date'
import { env } from '~/utils/env.server'

import { isFeatureEnabled } from '../../../utils/unleash.server'
import type { Route } from './+types'

export function meta() {
  return [{ title: 'Offentlig tjenestepensjon' }, { name: 'description', content: 'Offentlig tjenestepensjon' }]
}

export type AldeTjenestepensjonInformasjon = {
  tpNummer: number
  tpNavn: string
}

export type BelopData = {
  belop: number
  fomDato: string
}

export type Innvilget = {
  status: 'innvilget'
  tpInfo: AldeTjenestepensjonInformasjon
  belop: BelopData[]
  startdato: string
  sistRegulert: number
}

export type Soknad = {
  status: 'soknad'
  tpInfo: AldeTjenestepensjonInformasjon
  onsketVirkningsdato: string
}

export type Ingen = {
  status: 'ingen'
}

export type Ukjent = {
  status: 'ukjent'
  tpInfo: AldeTjenestepensjonInformasjon
}

export type AldeAfpOffentligStatus = Innvilget | Soknad | Ingen | Ukjent

export type OffentligTjenestepensjonGrunnlag = {
  afpOffentligStatus: AldeAfpOffentligStatus[]
}

export type OffentligTjenestepensjonVurdering = {
  valgtTpLeverandor: {
    tpNummer: number
    tpNavn: string
  }
}

const isSoknad = (s: AldeAfpOffentligStatus): s is Soknad => s.status === 'soknad'
const isUkjent = (s: AldeAfpOffentligStatus): s is Ukjent => s.status === 'ukjent'

export type Props = AktivitetComponentProps<OffentligTjenestepensjonGrunnlag, OffentligTjenestepensjonVurdering> & {
  pensjonsoversiktUrl?: string
  psakOppgaveoversikt?: string
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params

  const visMedMulighetForVurdering = isFeatureEnabled(Features.AFP_LIVSVARIG_MED_VURDERING)

  const api = createAktivitetApi({ request, behandlingId, aktivitetId })
  const behandling = await createBehandlingApi({ request, behandlingId }).hentBehandling()

  const grunnlag = await api.hentGrunnlagsdata<OffentligTjenestepensjonGrunnlag>()
  const vurdering = await api.hentVurdering<OffentligTjenestepensjonVurdering>()

  return {
    readOnly: false,
    grunnlag,
    vurdering,
    visMedMulighetForVurdering,
    pensjonsoversiktUrl: buildUrl(env.psakSakUrlTemplate, request, { sakId: behandling.sakId }),
    psakOppgaveoversikt: buildUrl(env.psakOppgaveoversikt, request, {}),
  }
}

export async function action({ params, request }: Route.ActionArgs) {
  const { behandlingId, aktivitetId } = params
  const api = createAktivitetApi({
    request,
    behandlingId,
    aktivitetId,
  })
  const formData = await request.formData()

  const tpNummerStr = formData.get('tpLeverandor') as string
  const tpNummer = parseInt(tpNummerStr, 10)

  const grunnlag = await api.hentGrunnlagsdata<OffentligTjenestepensjonGrunnlag>()
  const tpLeverandor = grunnlag.afpOffentligStatus.find(
    status =>
      (status.status === 'ukjent' || status.status === 'soknad' || status.status === 'innvilget') &&
      status.tpInfo.tpNummer === tpNummer,
  )

  if (!tpLeverandor || tpLeverandor.status === 'ingen') {
    throw new Error('Invalid TP leverandør selected')
  }

  const vurdering: OffentligTjenestepensjonVurdering = {
    valgtTpLeverandor: {
      tpNummer: tpLeverandor.tpInfo.tpNummer,
      tpNavn: tpLeverandor.tpInfo.tpNavn,
    },
  }

  await api.lagreVurdering(vurdering)
  return redirect(`/behandling/${behandlingId}?justCompleted=${aktivitetId}`)
}

export default function OffentligTjenestepensjonRoute({ loaderData }: Route.ComponentProps) {
  const { grunnlag, vurdering, readOnly, pensjonsoversiktUrl, psakOppgaveoversikt, visMedMulighetForVurdering } =
    loaderData
  const { aktivitet, behandling, avbrytAktivitet } = useOutletContext<AktivitetOutletContext>()

  if (visMedMulighetForVurdering) {
    return (
      <AfpLivsvarigVurdering
        readOnly={readOnly}
        grunnlag={grunnlag}
        vurdering={vurdering}
        aktivitet={aktivitet}
        behandling={behandling}
        pensjonsoversiktUrl={pensjonsoversiktUrl}
        psakOppgaveoversikt={psakOppgaveoversikt}
        avbrytAktivitet={avbrytAktivitet}
      />
    )
  } else {
    return (
      <AfpLivsvarigVenter
        readOnly={readOnly}
        grunnlag={grunnlag}
        vurdering={vurdering}
        aktivitet={aktivitet}
        behandling={behandling}
        pensjonsoversiktUrl={pensjonsoversiktUrl}
        psakOppgaveoversikt={psakOppgaveoversikt}
        avbrytAktivitet={avbrytAktivitet}
      />
    )
  }
}

function AfpLivsvarigVurdering(props: Props) {
  const { grunnlag, vurdering, readOnly, aktivitet, avbrytAktivitet } = props

  const tpLeverandorer = grunnlag.afpOffentligStatus.filter(
    status => status.status === 'ukjent' || status.status === 'soknad' || status.status === 'innvilget',
  )

  const detailsContent = (
    <VStack gap="space-40">
      <BodyLong style={{ maxWidth: '576px' }}>
        Bruker har registrerte TP-leverandører. Velg hvilken leverandør som skal brukes for AFP offentlig.
      </BodyLong>

      <VStack gap="space-24">
        <div>
          <Heading level="2" size="small">
            Registrerte TP-leverandører
          </Heading>
          <BodyShort size="small" textColor="subtle">
            Informasjon fra TP-registeret
          </BodyShort>
        </div>

        {tpLeverandorer.map(leverandor => (
          <VStack key={leverandor.tpInfo.tpNummer} gap="space-8">
            <div>
              <Heading level="3" size="xsmall">
                {leverandor.tpInfo.tpNavn}
              </Heading>
              <BodyShort size="small" textColor="subtle">
                TP-nummer: {leverandor.tpInfo.tpNummer}
              </BodyShort>
            </div>
            <div>
              <BodyShort weight="semibold">Status:</BodyShort>
              <BodyShort>
                {leverandor.status === 'innvilget' && 'Innvilget'}
                {leverandor.status === 'soknad' && 'Søknad sendt'}
                {leverandor.status === 'ukjent' && 'Ukjent status'}
              </BodyShort>
            </div>
            {leverandor.status === 'innvilget' && (
              <>
                <div>
                  <BodyShort weight="semibold">Startdato:</BodyShort>
                  <BodyShort>{formatDateToNorwegian(leverandor.startdato)}</BodyShort>
                </div>
                {leverandor.belop.length > 0 && (
                  <div>
                    <BodyShort weight="semibold">Beløp:</BodyShort>
                    {leverandor.belop.map(b => (
                      <BodyShort key={`${leverandor.tpInfo.tpNummer}-${b.fomDato}`}>
                        {b.belop} kr f.o.m. {formatDateToNorwegian(b.fomDato)}
                      </BodyShort>
                    ))}
                  </div>
                )}
              </>
            )}
            {leverandor.status === 'soknad' && (
              <div>
                <BodyShort weight="semibold">Ønsket virkningsdato:</BodyShort>
                <BodyShort>{formatDateToNorwegian(leverandor.onsketVirkningsdato)}</BodyShort>
              </div>
            )}
          </VStack>
        ))}
      </VStack>
    </VStack>
  )

  const sidebar = (
    <Form method="post" className="decision-form">
      <VStack gap="6">
        <div>
          <Heading level="2" size="small" spacing>
            Velg TP-leverandør
          </Heading>
          <BodyLong>Velg hvilken TP-leverandør som skal benyttes for AFP offentlig.</BodyLong>
        </div>

        {!readOnly ? (
          <VStack gap="6">
            <RadioGroup
              legend="TP-leverandør"
              name="tpLeverandor"
              defaultValue={vurdering?.valgtTpLeverandor?.tpNummer?.toString()}
              size="small"
            >
              {tpLeverandorer.map(leverandor => (
                <Radio key={leverandor.tpInfo.tpNummer} value={leverandor.tpInfo.tpNummer.toString()}>
                  {leverandor.tpInfo.tpNavn}
                </Radio>
              ))}
            </RadioGroup>

            <VStack gap="2">
              <Button type="submit" variant="primary" size="small">
                Fortsett behandling
              </Button>
              <Button type="button" variant="tertiary" size="small" onClick={avbrytAktivitet}>
                Avbryt behandling i pilot
              </Button>
            </VStack>
          </VStack>
        ) : (
          <VStack gap="6">
            <BodyShort weight="semibold">Valgt: {vurdering?.valgtTpLeverandor?.tpNavn || 'Ingen valgt'}</BodyShort>
          </VStack>
        )}
      </VStack>
    </Form>
  )

  return (
    <AktivitetVurderingLayout aktivitet={aktivitet} sidebar={sidebar}>
      {detailsContent}
    </AktivitetVurderingLayout>
  )
}

function AfpLivsvarigVenter(props: Props) {
  function VenterSoknad({
    soknad,
    aktivitet,
    pensjonsoversiktUrl,
    psakOppgaveoversikt,
    avbrytAktivitet,
  }: {
    soknad: Soknad
    aktivitet: AktivitetDTO
    pensjonsoversiktUrl?: string
    psakOppgaveoversikt?: string
    avbrytAktivitet: () => void
  }) {
    return (
      <Page.Block gutters className={`${commonStyles.page} ${commonStyles.center}`} width="text">
        <VStack gap="space-40" align="center">
          <VStack align="center" gap="space-16">
            <Heading size="medium" level="1">
              Venter på svar fra {soknad?.tpInfo.tpNavn}
            </Heading>
            <VStack gap="space-40">
              <BodyLong align="center">
                Det er søkt om livsvarig AFP for offentlig sektor. Maskinen sender saken til attestering når
                tjenestepensjonsleverandør har svart.{' '}
              </BodyLong>
              <VStack align="center">
                <Heading size="small" level="3" align="center" spacing>
                  Hvorfor venter vi på tjenestepensjonsleverandør?
                </Heading>

                <BodyLong align="center">
                  Søkeren har ikke nok opptjening til å få innvilget alderspensjon alene, men kan ha rett til
                  alderspensjon om den kombineres med livsvarig AFP.
                </BodyLong>
              </VStack>
            </VStack>
            <VStack align="center">
              <BodyShort size="small" color="subtle">
                Sist oppdatert {formatDateToNorwegian(aktivitet.sisteAktiveringsdato, { showTime: true })}
              </BodyShort>
              <BodyShort size="small" color="subtle">
                Neste oppdatering {formatDateToNorwegian(aktivitet.utsattTil, { showTime: true })}
              </BodyShort>
            </VStack>
          </VStack>
          <HStack gap="2" justify="center">
            {pensjonsoversiktUrl && (
              <Button size="small" as="a" href={pensjonsoversiktUrl}>
                Til Pensjonsoversikt
              </Button>
            )}
            {psakOppgaveoversikt && (
              <Button as="a" size="small" href={psakOppgaveoversikt} variant="secondary">
                Til Oppgavelisten
              </Button>
            )}
          </HStack>
          <div>
            <Button as="a" size="small" variant="tertiary" onClick={avbrytAktivitet}>
              Avbryt behandling i pilot
            </Button>
          </div>
        </VStack>
      </Page.Block>
    )
  }

  if (props.grunnlag.afpOffentligStatus.some(isSoknad)) {
    const soknad = props.grunnlag.afpOffentligStatus.find(isSoknad)
    if (!soknad) return null
    return (
      <VenterSoknad
        soknad={soknad}
        aktivitet={props.aktivitet}
        pensjonsoversiktUrl={props.pensjonsoversiktUrl}
        psakOppgaveoversikt={props.psakOppgaveoversikt}
        avbrytAktivitet={props.avbrytAktivitet}
      />
    )
  } else if (props.grunnlag.afpOffentligStatus.some(isUkjent)) {
    return <div>Må fylle ut skjema</div>
  }

  return null
}

export const Component = AfpLivsvarigVurdering
