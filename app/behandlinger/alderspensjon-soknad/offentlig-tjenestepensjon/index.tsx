import { BodyLong, Button, Heading, HStack, Page, VStack } from '@navikt/ds-react'
import { useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import { createBehandlingApi } from '~/api/behandling-api'
import commonStyles from '~/common.module.css'
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

// Updated types to reflect backend schema
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
  afpOffentligStatus: AldeAfpOffentligStatus
} | null

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

export async function action() {
  return null
}

export default function OffentligTjenestepensjonRoute({ loaderData }: Route.ComponentProps) {
  const { grunnlag, vurdering, readOnly, pensjonsoversiktUrl, psakOppgaveoversikt, visMedMulighetForVurdering } =
    loaderData
  const { aktivitet, behandling, avbrytAktivitet } = useOutletContext<AktivitetOutletContext>()

  if (visMedMulighetForVurdering) {
    return (
      <Component
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

const AfpLivsvarigVurdering = (props: Props) => {
  return (
    <div>
      <h1>AfpLivsvarig</h1>
    </div>
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
        <VStack gap="space-40">
          <VStack align="center" gap="space-8">
            <Heading size="medium" level="1">
              Venter på svar fra {soknad?.tpInfo.tpNavn}
            </Heading>
            <BodyLong align="center">
              Det er søkt om livsvarig AFP for offentlig sektor. Vi vil automatisk forsøke igjen{' '}
              {formatDateToNorwegian(aktivitet.utsattTil, {
                showTime: true,
                onlyTimeIfSameDate: true,
              })}{' '}
              for å sjekke status på søknaden. Delautomatisk saksbehandling vil fortsette ved mottatt svar fra
              tjenestepensjonsleverandør.
            </BodyLong>
          </VStack>
          <VStack gap="4">
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
            <Button as="a" size="small" variant="tertiary" onClick={avbrytAktivitet}>
              Avbryt behandling i pilot
            </Button>
          </VStack>
        </VStack>
      </Page.Block>
    )
  }

  if (props.grunnlag.afpOffentligStatus.some(isSoknad)) {
    // biome-ignore lint/style/noNonNullAssertion: Vil alltid finnes en søknad
    const soknad = props.grunnlag.afpOffentligStatus.find(isSoknad)!
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
    const ukjent = props.grunnlag.afpOffentligStatus.find(isUkjent)
    return <div>Må fylle ut skjema</div>
  }
}

export const Component = AfpLivsvarigVurdering
