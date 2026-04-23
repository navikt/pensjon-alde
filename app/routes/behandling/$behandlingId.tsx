import { BugIcon, ExternalLinkIcon, PersonCircleIcon, PersonIcon, RobotSmileIcon } from '@navikt/aksel-icons'
import {
  BodyLong,
  BodyShort,
  Box,
  Button,
  CopyButton,
  HStack,
  Label,
  Modal,
  Page,
  Process,
  Show,
  Spacer,
  Tag,
  Textarea,
  VStack,
} from '@navikt/ds-react'
import React, { useEffect, useRef } from 'react'
import {
  Form,
  Outlet,
  redirect,
  useNavigate,
  useOutletContext,
  useParams,
  useRevalidator,
  useRouteLoaderData,
} from 'react-router'
import { createBehandlingApi } from '~/api/behandling-api'
import { Fnr } from '~/components/Fnr'
import AldeLoader from '~/components/Loader'
import { settingsContext } from '~/context/settings-context'
import { userContext } from '~/context/user-context'
import { Header } from '~/layout/Header/Header'
import type { RootOutletContext, loader as rootLoader } from '~/root'
import { AktivitetStatus, AldeBehandlingStatus, type BehandlingDTO, BehandlingStatus } from '~/types/behandling'
import { buildUrl } from '~/utils/build-url'
import { formatDateToAge, formatDateToNorwegian } from '~/utils/date'
import { env } from '~/utils/env.server'
import type { Route } from './+types/$behandlingId'
import behandlingStyles from './$behandlingId.module.css'

export function getRedirectPath({
  pathname,
  behandlingId,
  behandling,
  navident,
  justCompletedId,
}: {
  pathname: string
  behandlingId: string
  behandling: BehandlingDTO
  navident: string
  justCompletedId: string | null
}): string | null {
  const exactBehandlingRoute = pathname === `/behandling/${behandlingId}`

  if (!exactBehandlingRoute) {
    return null
  }

  if (behandling.aldeBehandlingStatus === AldeBehandlingStatus.FULLFORT) {
    return `/behandling/${behandlingId}/oppsummering`
  }

  if (behandling.aldeBehandlingStatus === AldeBehandlingStatus.AUTOMATISK_TIL_MANUELL) {
    return `/behandling/${behandlingId}/avbrutt-automatisk`
  }

  if (behandling.aldeBehandlingStatus === AldeBehandlingStatus.AVBRUTT_AV_BRUKER) {
    return `/behandling/${behandlingId}/avbrutt-manuelt`
  }

  if (
    behandling.aldeBehandlingStatus === AldeBehandlingStatus.VENTER_ATTESTERING &&
    behandling.sisteSaksbehandlerNavident === navident
  ) {
    return `/behandling/${behandlingId}/venter-attestering`
  }

  if (behandling.aktiviteter.length > 0) {
    let aktivitetSomSkalVises = behandling.aktiviteter.find(
      aktivitet =>
        (aktivitet.status === AktivitetStatus.UNDER_BEHANDLING || aktivitet.status === AktivitetStatus.FEILET) &&
        aktivitet.handlerName &&
        aktivitet.friendlyName,
    )
    if (!aktivitetSomSkalVises) {
      aktivitetSomSkalVises = behandling.aktiviteter.find(
        aktivitet =>
          aktivitet.status === AktivitetStatus.UNDER_BEHANDLING || aktivitet.status === AktivitetStatus.FEILET,
      )
    }
    if (aktivitetSomSkalVises?.handlerName === 'attestering') {
      return `/behandling/${behandlingId}/attestering`
    }
    const shouldRefetchAfterCompletion =
      aktivitetSomSkalVises && justCompletedId && aktivitetSomSkalVises.aktivitetId?.toString() === justCompletedId
    if (aktivitetSomSkalVises && !shouldRefetchAfterCompletion) {
      return `/behandling/${behandlingId}/aktivitet/${aktivitetSomSkalVises.aktivitetId}`
    }
  }
  return null
}

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `Behandling ${params.behandlingId}` }, { name: 'description', content: 'Behandling detaljer' }]
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { aktivitetId, behandlingId } = params
  const url = new URL(request.url)
  const { navident } = context.get(userContext)

  const { showStepper, showMetadata } = context.get(settingsContext)
  const justCompletedId = url.searchParams.get('justCompleted')

  const api = createBehandlingApi({ request, behandlingId })
  const behandling = await api.hentBehandling()

  const urls = {
    oppgaveoversikt: buildUrl(env.psakOppgaveoversikt, request, {}),
    pensjonsoversikt: behandling.sakId
      ? buildUrl(env.psakSakUrlTemplate, request, { sakId: behandling.sakId })
      : undefined,
  }

  const isOppsummering = url.pathname.includes('/oppsummering')
  const isAttestering = url.pathname.includes('/attestering')

  const behandlingJobber =
    behandling.aldeBehandlingStatus === AldeBehandlingStatus.VENTER_MASKINELL &&
    (!behandling.utsattTil || new Date(behandling.utsattTil) < new Date())

  const redirectPath = getRedirectPath({
    pathname: url.pathname,
    behandlingId,
    behandling,
    navident,
    justCompletedId,
  })
  if (redirectPath) {
    return redirect(redirectPath)
  }

  return {
    aktivitetId: aktivitetId,
    behandling,
    behandlingId,
    behandlingJobber:
      behandlingJobber ||
      (behandling.aktiviteter.find(a => a.aktivitetId?.toString() === justCompletedId) && justCompletedId),
    isOppsummering,
    isAttestering,
    showStepper: showStepper && !isOppsummering,
    showMetadata,
    urls,
  }
}

export async function action({ params, request }: Route.ActionArgs) {
  const { behandlingId } = params
  const formData = await request.formData()

  const api = createBehandlingApi({ request, behandlingId })

  const formAktivitetId = formData.get('aktivitetId')

  let aktivitetId: number | undefined
  if (typeof formAktivitetId === 'string') {
    aktivitetId = +formAktivitetId
  }

  await api.avbrytBehandling({
    vistAktivitetId: aktivitetId,
    begrunnelse: formData.get('begrunnelse')?.toString(),
  })

  return redirect(`/behandling/${behandlingId}`)
}

export default function Behandling({ loaderData }: Route.ComponentProps) {
  const { aktivitetId, behandling, behandlingJobber, showStepper, showMetadata, isAttestering, isOppsummering, urls } =
    loaderData
  const params = useParams()
  const currentAktivitetId = params.aktivitetId
  const navigate = useNavigate()
  const stepperContainerRef = useRef<HTMLDivElement>(null)
  const revalidator = useRevalidator()
  const ref = useRef<HTMLDialogElement>(null)

  const root = useRouteLoaderData<typeof rootLoader>('root')
  if (!root) throw new Error('Root loader data not found')

  const { me, verdandeAktivitetUrl, verdandeBehandlingUrl, telemetry } = root
  const { setDarkmode, isDarkmode } = useOutletContext<RootOutletContext>()

  const avbrytAktivitet = () => ref.current?.showModal()

  // Prepare the visible aktiviteter (sorted and filtered)
  const visibleAktiviteter = React.useMemo(
    () =>
      behandling.aktiviteter
        .slice()
        .sort((a, b) => a.opprettet.localeCompare(b.opprettet))
        .filter(aktivitet => aktivitet.friendlyName),
    [behandling.aktiviteter],
  )

  // Create steps with redirect URLs
  const allSteps = React.useMemo(() => {
    const aktivitetSteps = visibleAktiviteter.map(aktivitet => ({
      ...aktivitet,
      redirectUrl: `aktivitet/${aktivitet.aktivitetId}`,
    }))

    if (behandlingJobber) {
      return [
        ...aktivitetSteps,
        {
          aktivitetId: 'jobber',
          friendlyName: 'Jobber...',
          status: null,
          redirectUrl: null,
          behandletFerdigMaskinelt: undefined,
          handlerName: undefined,
        },
      ]
    }
    return aktivitetSteps
  }, [visibleAktiviteter, behandlingJobber])

  function finnProcessIcon(step: (typeof allSteps)[0]) {
    if (!step.handlerName) {
      return <BugIcon />
    } else if (step.behandletFerdigMaskinelt) {
      return <RobotSmileIcon />
    } else if (step.status === AktivitetStatus.FULLFORT) {
      return <PersonCircleIcon />
    }
  }

  function finnStatus(step: (typeof allSteps)[0]) {
    console.log('finnStatus', {
      currentAktivitetId,
      aktivitetId: step.aktivitetId,
    })
    if (isAttestering && step.handlerName === 'attestering') {
      return 'active'
    } else if (currentAktivitetId === step.aktivitetId.toString()) {
      return 'active'
    } else if (step.status === AktivitetStatus.FULLFORT) {
      return 'completed'
    } else {
      return 'uncompleted'
    }
  }

  const activeStepIndex = behandlingJobber
    ? allSteps.length - 1
    : currentAktivitetId
      ? allSteps.findIndex(a => a.aktivitetId?.toString() === currentAktivitetId)
      : allSteps.length - 1

  useEffect(() => {
    if (behandlingJobber) {
      let pollCount = 0
      const intervalId = setInterval(() => {
        pollCount++
        revalidator.revalidate()

        if (pollCount >= 10) {
          clearInterval(intervalId)
        }
      }, 1000)

      return () => clearInterval(intervalId)
    }
  }, [behandlingJobber, revalidator])

  useEffect(() => {
    if (stepperContainerRef.current && activeStepIndex >= 0) {
      const container = stepperContainerRef.current
      const activeStep = container.querySelector(`[data-step-index="${activeStepIndex}"]`) as HTMLElement

      if (activeStep) {
        const containerRect = container.getBoundingClientRect()
        const stepRect = activeStep.getBoundingClientRect()
        const scrollLeft = container.scrollLeft

        // Calculate if step is out of view
        const stepLeft = stepRect.left - containerRect.left + scrollLeft
        const stepRight = stepLeft + stepRect.width
        const containerWidth = containerRect.width

        if (stepLeft < scrollLeft) {
          container.scrollTo({ left: stepLeft - 20, behavior: 'smooth' })
        } else if (stepRight > scrollLeft + containerWidth) {
          container.scrollTo({
            left: stepRight - containerWidth + 20,
            behavior: 'smooth',
          })
        }
      }
    }
  }, [activeStepIndex])

  return (
    <div>
      <Header
        me={me}
        isDarkmode={isDarkmode}
        setDarkmode={setDarkmode}
        pensjonsoversiktUrl={urls.pensjonsoversikt}
        oppgaveoversiktUrl={urls.oppgaveoversikt}
        environment={telemetry.environment}
        verdandeAktivitetUrl={verdandeAktivitetUrl}
        verdandeBehandlingUrl={verdandeBehandlingUrl}
      />
      <Box.New asChild background={'default'}>
        <Page>
          <VStack>
            <Box.New
              paddingInline="10"
              paddingBlock="2"
              borderWidth="1 0"
              background="neutral-soft"
              borderColor="neutral-subtle"
            >
              <HStack align="center" gap="1">
                <HStack align="center">
                  <PersonIcon fontSize="1.5em" /> <Fnr value={behandling.fnr} />
                </HStack>
                <span>/</span>
                {behandling.etternavn}, {behandling.fornavn} {behandling.mellomnavn}
                <span>/</span>
                Født: {formatDateToNorwegian(behandling.fodselsdato)} ({formatDateToAge(behandling.fodselsdato)})
                <Spacer />
                {behandling.sakType}
                <span>/</span>
                <HStack align="center">
                  {behandling.sakId}
                  <CopyButton size="small" variant="action" copyText={behandling.sakId?.toString() ?? ''} />
                </HStack>
              </HStack>
            </Box.New>
          </VStack>
          {showMetadata && (
            <Box.New padding="4" borderWidth="1 0">
              <HStack gap="6" align="center">
                <VStack>
                  <Label size="small">Behandling</Label>
                  <BodyShort>{behandling.friendlyName}</BodyShort>
                </VStack>

                <VStack>
                  <Label size="small">Alde Status</Label>
                  <Tag
                    variant={behandling.aldeBehandlingStatus === AldeBehandlingStatus.FULLFORT ? 'success' : 'info'}
                    size="small"
                  >
                    {behandling.aldeBehandlingStatus}
                  </Tag>
                </VStack>

                <VStack>
                  <Label size="small">Behandling Status</Label>
                  <Tag
                    variant={
                      behandling.status === BehandlingStatus.FULLFORT
                        ? 'success'
                        : behandling.status === BehandlingStatus.FEILENDE
                          ? 'error'
                          : 'info'
                    }
                    size="small"
                  >
                    {behandling.status}
                  </Tag>
                </VStack>

                <VStack>
                  <Label size="small">Opprettet</Label>
                  <BodyShort size="small">{formatDateToNorwegian(behandling.opprettet)}</BodyShort>
                </VStack>

                {behandling.kravId && (
                  <VStack>
                    <Label size="small">Krav</Label>
                    <CopyButton
                      text={behandling.kravId.toString()}
                      copyText={behandling.kravId.toString()}
                      size="small"
                    />
                  </VStack>
                )}

                {behandling.sakId && (
                  <VStack>
                    <Label size="small">Sak</Label>
                    <CopyButton
                      text={behandling.sakId.toString()}
                      copyText={behandling.sakId.toString()}
                      size="small"
                    />
                  </VStack>
                )}

                <Spacer />

                {behandling.aldeBehandlingStatus === AldeBehandlingStatus.VENTER_SAKSBEHANDLER && !isOppsummering && (
                  <Button
                    type="submit"
                    size="small"
                    onClick={() => window.open(`/behandling/${behandling.behandlingId}/oppsummering`, '_self')}
                  >
                    Vis oppsummering
                  </Button>
                )}

                {behandling.aldeBehandlingStatus === AldeBehandlingStatus.VENTER_SAKSBEHANDLER && isOppsummering && (
                  <Button
                    type="submit"
                    size="small"
                    onClick={() => window.open(`/behandling/${behandling.behandlingId}`, '_self')}
                  >
                    Fortsett saksbehandling
                  </Button>
                )}

                {isOppsummering && behandling.aldeBehandlingStatus !== AldeBehandlingStatus.VENTER_SAKSBEHANDLER && (
                  <Button
                    type="submit"
                    size="small"
                    onClick={() => window.open(urls.pensjonsoversikt, '_blank')}
                    icon={<ExternalLinkIcon title="a11y-title" fontSize="1.5rem" />}
                    iconPosition="right"
                  >
                    Åpne pensjonsoversikten
                  </Button>
                )}

                {behandling.aldeBehandlingStatus === AldeBehandlingStatus.VENTER_SAKSBEHANDLER && (
                  <Button type="submit" size="small" variant="danger" onClick={() => ref.current?.showModal()}>
                    Ta til manuell
                  </Button>
                )}
              </HStack>
            </Box.New>
          )}

          <div className={behandlingStyles.processNameBar}>
            <BodyShort as="h2" size="small" weight="semibold">
              {behandling.processName}
            </BodyShort>
          </div>

          <HStack justify="start" wrap={false}>
            <Show asChild above="2xl">
              <Box.New
                borderWidth="0 1 0 0"
                borderColor="neutral-subtle"
                className={behandlingStyles.pennyVenstremenyBredde}
              >
                <VStack>
                  <Box.New paddingBlock="space-32" paddingInline="space-44">
                    <Process hideStatusText={true}>
                      {allSteps
                        .filter(it => showStepper || it.handlerName)
                        .map((step, _index) => (
                          <Process.Event
                            className={behandlingStyles.xsmall}
                            key={step.aktivitetId}
                            status={finnStatus(step)}
                            title={step.friendlyName}
                            onClick={() => {
                              if (!showStepper || !step.redirectUrl) return

                              navigate(step.redirectUrl)
                            }}
                            bullet={finnProcessIcon(step)}
                          ></Process.Event>
                        ))}
                    </Process>
                  </Box.New>
                </VStack>
              </Box.New>
            </Show>

            <div className={behandlingStyles.resposiveBorder}>
              <Page.Block as="main" style={{ maxWidth: 'var(--ax-breakpoint-lg)' }}>
                {behandlingJobber ? <AldeLoader /> : <Outlet context={{ behandling, avbrytAktivitet }} />}
              </Page.Block>
            </div>
          </HStack>

          <Modal ref={ref} header={{ heading: 'Vil du avbryte del-automatisk behandling?' }}>
            <Form method="post">
              <input hidden name="aktivitetId" value={aktivitetId} />
              <Modal.Body>
                <VStack gap="4">
                  <BodyLong>Saksbehandlingen vil fortsettes som manuell kravbehandling.</BodyLong>
                  <BodyLong>
                    Beklager at du ikke kunne fullføre denne behandlingen her. Vi vil gjerne lære så vi kan gjøre dette
                    bedre. Ikke skriv personopplysninger.
                  </BodyLong>

                  <Textarea label="Tilbakemelding (frivillig, ikke anonymt)" name="begrunnelse" />
                </VStack>
              </Modal.Body>
              <Modal.Footer>
                <Button type="submit" variant="primary" onClick={() => ref.current?.close()}>
                  Avbryt behandling{' '}
                </Button>
                <Button type="button" variant="secondary" onClick={() => ref.current?.close()}>
                  Fortsett del-auto behandling
                </Button>
              </Modal.Footer>
            </Form>
          </Modal>
        </Page>
      </Box.New>
    </div>
  )
}
