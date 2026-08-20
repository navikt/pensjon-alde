import { ExternalLinkIcon, PersonIcon } from '@navikt/aksel-icons'
import {
  BodyLong,
  BodyShort,
  Box,
  Button,
  CopyButton,
  Heading,
  HStack,
  Link,
  Radio,
  RadioGroup,
  ReadMore,
  VStack,
} from '@navikt/ds-react'
import { useMemo, useState } from 'react'
import { Form, redirect, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import { createBehandlingApi } from '~/api/behandling-api'
import AktivitetVurderingLayout from '~/components/shared/AktivitetVurderingLayout'
import BegrunnelseField from '~/components/shared/BegrunnelseField'
import { userContext } from '~/context/user-context'
import { Features } from '~/features'
import { useIsSubmitting } from '~/hooks/use-is-submitting'
import type { AktivitetComponentProps } from '~/types/aktivitet-component'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import { buildUrl } from '~/utils/build-url'
import { formatCurrencyNok } from '~/utils/currency'
import { formatDateToNorwegian } from '~/utils/date'
import { env } from '~/utils/env.server'
import { parseForm, radiogroup, string } from '~/utils/parse-form'
import { isFeatureEnabled } from '~/utils/unleash.server'
import type { Route } from './+types'
import type {
  KontrollerInntektsopplysningerForEpsGrunnlag,
  KontrollerInntektsopplysningerForEpsVurdering,
} from './types'

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params

  const behandlingApi = createBehandlingApi({
    request,
    behandlingId,
  })

  const aktivtetApi = createAktivitetApi({
    request,
    behandlingId,
    aktivitetId,
  })

  const behandling = await behandlingApi.hentBehandling()
  const grunnlag = await aktivtetApi.hentGrunnlagsdata<KontrollerInntektsopplysningerForEpsGrunnlag>()

  // const vurdering = await api.hentVurdering<KontrollerInntektsopplysningerForEpsVurdering>()
  const vurdering = null

  const modiaUrl = buildUrl(env.modia, request, { fnr: behandling.fnr })

  const { enhet } = context.get(userContext)
  const visNotat = isFeatureEnabled(Features.NOTAT, { enhetId: enhet })

  return {
    modiaUrl,
    grunnlag,
    vurdering,
    visNotat,
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

  const vurdering = parseForm<KontrollerInntektsopplysningerForEpsVurdering>(formData, {
    epsInntektOver2G: radiogroup({ over2G: true, under2G: false }),
    // TODO: Rydd opp string parsing
    begrunnelse: string,
  })

  await api.lagreVurdering(vurdering)
  return redirect(`/behandling/${behandlingId}?justCompleted=${aktivitetId}`)
}

const KontrollerInntektsopplysningerForEPSRoute = ({ loaderData }: Route.ComponentProps) => {
  const { aktivitet, behandling, avbrytAktivitet } = useOutletContext<AktivitetOutletContext>()
  const { grunnlag, vurdering, modiaUrl, visNotat } = loaderData

  return (
    <KontrollerInntektsopplysningerForEPS
      readOnly={false}
      grunnlag={grunnlag}
      modiaUrl={modiaUrl}
      vurdering={vurdering}
      aktivitet={aktivitet}
      behandling={behandling}
      avbrytAktivitet={avbrytAktivitet}
      visNotat={visNotat}
    />
  )
}

type KontrollerInntektsopplysningerForEPSInterface = AktivitetComponentProps<
  KontrollerInntektsopplysningerForEpsGrunnlag,
  KontrollerInntektsopplysningerForEpsVurdering
> & {
  modiaUrl: string
}

const KontrollerInntektsopplysningerForEPS: React.FC<KontrollerInntektsopplysningerForEPSInterface> = ({
  modiaUrl,
  grunnlag,
  aktivitet,
  readOnly,
  avbrytAktivitet,
  vurdering,
  begrunnelse,
  visNotat,
}) => {
  const isSubmitting = useIsSubmitting()
  const defaultValue = vurdering ? (vurdering.epsInntektOver2G ? 'over2G' : 'under2G') : undefined
  const [selectedValue, setSelectedValue] = useState(defaultValue)
  const oppgittInntektNum = parseFloat(grunnlag.oppgittInntekt)
  const grunnbelopNum = parseFloat(grunnlag.grunnbelop)
  const oppgittInntektIG = oppgittInntektNum ? Math.round((oppgittInntektNum / grunnbelopNum) * 100) / 100 : 0

  const epsType = useMemo(() => {
    switch (grunnlag.epsType) {
      case 'SAMBOER':
        return { capitalized: 'Samboer', lowercase: 'samboer', posessive: 'Samboers' }
      case 'EKTEFELLE':
        return { capitalized: 'Ektefelle', lowercase: 'ektefelle', posessive: 'Ektefelles' }
      case 'PARTNER':
        return { capitalized: 'Partner', lowercase: 'partner', posessive: 'Partners' }
      default:
        return { capitalized: 'EPS', lowercase: 'EPS', posessive: 'EPS' }
    }
  }, [grunnlag.epsType])

  const detailsContent = (
    <VStack gap="space-40">
      <BodyLong style={{ maxWidth: '576px' }}>
        Søkeren har oppgitt at {epsType.posessive.toLocaleLowerCase()} inntekt er under 2G. Estimert inntekt til samboer
        er over 2G. Kontroller {epsType.posessive.toLocaleLowerCase()} inntekt.
      </BodyLong>

      <HStack gap="space-40">
        <Box width="300px">
          <VStack gap="space-40">
            <div>
              <Heading level="2" size="small">
                Søkt om alderspensjon fra
              </Heading>
              <BodyShort>{formatDateToNorwegian(grunnlag.onsketVirkningsdato)}</BodyShort>
            </div>
            <div>
              <Heading level="2" size="small">
                <HStack gap="space-8" align="center">
                  <PersonIcon aria-hidden />
                  {epsType.capitalized}
                </HStack>
              </Heading>

              <HStack gap="space-8" align="center">
                <BodyShort>{grunnlag.epsInformasjon.fnr}</BodyShort>
                <CopyButton copyText={grunnlag.epsInformasjon.fnr} size="small" data-color="accent" />
              </HStack>

              <BodyShort>
                {grunnlag.epsInformasjon.etternavn}, {grunnlag.epsInformasjon.fornavn}
              </BodyShort>
            </div>
            <VStack gap="space-12">
              <div>
                <Heading level="2" size="small">
                  {epsType.posessive} årsinntekt
                </Heading>
                <BodyShort size="small" textColor="subtle">
                  G per 1. mai 2025 er benyttet.
                </BodyShort>
              </div>
              <div>
                <Heading level="3" size="xsmall">
                  Brukeroppgitt
                </Heading>
                <BodyShort>
                  {formatCurrencyNok(grunnlag.oppgittInntekt)} = <strong>{oppgittInntektIG} G</strong>
                </BodyShort>
              </div>

              <div>
                <Heading level="3" size="xsmall">
                  Estimert
                </Heading>
                <BodyShort>{grunnlag.estimertInntektOver2g ? 'Over 2G' : 'Under 2G'}</BodyShort>
                <ReadMore size="small" header="Slik estimeres årsinntekt">
                  Estimert årsinntekt er basert på de 4 siste tilgjengelige månedene fra A-inntekt.
                </ReadMore>
              </div>
            </VStack>
          </VStack>
        </Box>

        {!readOnly && (
          <div>
            <Box borderWidth="1" borderColor="neutral-subtleA" borderRadius="16" padding="space-16" maxWidth="16em">
              <Heading level="2" size="small" spacing>
                Kontakt søker
              </Heading>

              <VStack gap="space-12">
                <div>
                  <Heading level="3" size="xsmall">
                    Reservert mot digital varsling
                  </Heading>
                  <BodyShort>{grunnlag.sokerKontaktinfo.reservertMotDigitalVarsling ? 'Ja' : 'Nei'}</BodyShort>
                </div>
                <div>
                  <Heading level="3" size="xsmall">
                    Aktiv digital bruker
                  </Heading>
                  <BodyShort>{grunnlag.sokerKontaktinfo.aktivDigitalt ? 'Ja' : 'Nei'}</BodyShort>
                </div>
                <div>
                  <Link href={modiaUrl} target="_blank">
                    Modia <ExternalLinkIcon />
                  </Link>
                </div>
              </VStack>
            </Box>
          </div>
        )}
      </HStack>
    </VStack>
  )

  const sidebar = (
    <Form method="post" className="decision-form">
      <VStack gap="space-24">
        <div>
          <Heading level="2" size="small" spacing>
            Vurder inntekt
          </Heading>
          <BodyLong>Ved inntekt over 2G må kravet tas til manuell behandling for å registrere inntekt.</BodyLong>
        </div>

        <VStack gap="space-24">
          <RadioGroup
            legend="Vurder inntekt"
            hideLegend
            name="epsInntektOver2G"
            value={selectedValue}
            readOnly={readOnly}
            size="small"
            onChange={setSelectedValue}
          >
            <Radio value="over2G">Over 2G - ta saken til manuell</Radio>
            <Radio value="under2G">Under 2G - fortsett behandling</Radio>
          </RadioGroup>

          {visNotat && <BegrunnelseField readOnly={readOnly} defaultValue={begrunnelse} />}

          {!readOnly && (
            <VStack gap="space-12">
              <Button type="submit" variant="primary" size="small" loading={isSubmitting} disabled={!selectedValue}>
                Fortsett behandling
              </Button>
              <Button type="button" variant="tertiary" size="small" onClick={avbrytAktivitet} disabled={isSubmitting}>
                Avbryt del-auto behandling
              </Button>
            </VStack>
          )}
        </VStack>
      </VStack>
    </Form>
  )

  return (
    <AktivitetVurderingLayout aktivitet={aktivitet} sidebar={sidebar}>
      {detailsContent}
    </AktivitetVurderingLayout>
  )
}

export const Component = KontrollerInntektsopplysningerForEPS
export default KontrollerInntektsopplysningerForEPSRoute
