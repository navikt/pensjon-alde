import { BugIcon, PersonCircleIcon, RobotSmileIcon } from '@navikt/aksel-icons'
import { BodyLong, BodyShort, Box, Button, HStack, Modal, Process, Show, Textarea, VStack } from '@navikt/ds-react'
import React, { useEffect, useRef, useState } from 'react'
import {
  Form,
  Outlet,
  redirect,
  useFetcher,
  useNavigate,
  useParams,
  useRevalidator,
  useSearchParams,
} from 'react-router'
import { createBehandlingApi } from '~/api/behandling-api'
import FeilendeBehandling from '~/components/FeilendeBehandling'
import AldeLoader from '~/components/Loader'
import { settingsContext } from '~/context/settings-context'
import { BehandlingEventsContext, LIVE_POLL_INTERVAL_MS, useBehandlingEvents } from '~/hooks/use-behandling-events'
import {
  type AktivitetDTO,
  AktivitetStatus,
  AldeBehandlingStatus,
  type BehandlingDTO,
  BehandlingStatus,
} from '~/types/behandling'
import type { Route } from './+types/$behandlingId'
import behandlingStyles from './$behandlingId.module.css'

const POLL_INTERVAL_MS = 1500
const POLL_MAX_MS = 120_000

/**
 * Poller hvert POLL_INTERVAL_MS uten Kafka-strøm. Med strøm polles det sjeldnere som et sikkerhetsnett,
 * i tilfelle en melding går tapt eller Kafka-consumeren stopper uten at strømmen lukkes.
 */
export function skalPolle({ live, sistRevalidert, now }: { live: boolean; sistRevalidert: number; now: number }) {
  return !live || now - sistRevalidert >= LIVE_POLL_INTERVAL_MS
}

export function skalViseFeilende(behandling: BehandlingDTO): boolean {
  return behandling.status === BehandlingStatus.FEILENDE
}

export function harEndretStatus(event: BehandlingDTO, behandling: BehandlingDTO): boolean {
  return event.aldeBehandlingStatus !== behandling.aldeBehandlingStatus || event.status !== behandling.status
}

export function finnAktivitetSomSkalVises(aktiviteter: AktivitetDTO[]): AktivitetDTO | undefined {
  const erAktivOgVenter = (aktivitet: AktivitetDTO) =>
    !aktivitet.behandletFerdigMaskinelt &&
    (aktivitet.status === AktivitetStatus.UNDER_BEHANDLING ||
      aktivitet.status === AktivitetStatus.FEILET ||
      aktivitet.status === AktivitetStatus.OPPRETTET)

  return (
    aktiviteter.find(aktivitet => erAktivOgVenter(aktivitet) && aktivitet.handlerName && aktivitet.friendlyName) ??
    aktiviteter.find(aktivitet => erAktivOgVenter(aktivitet) && aktivitet.handlerName)
  )
}

function aktivitetPath(behandlingId: string | number, aktivitet: AktivitetDTO) {
  return aktivitet.handlerName === 'attestering'
    ? `/behandling/${behandlingId}/attestering`
    : `/behandling/${behandlingId}/aktivitet/${aktivitet.aktivitetId}`
}

export function getNesteAktivitetPathFraEvent(event: BehandlingDTO, justCompletedId: string | null): string | null {
  if (
    event.aldeBehandlingStatus !== AldeBehandlingStatus.VENTER_SAKSBEHANDLER ||
    event.status === BehandlingStatus.FEILENDE
  ) {
    return null
  }

  const aktivitet = finnAktivitetSomSkalVises(event.aktiviteter)
  if (!aktivitet || aktivitet.aktivitetId.toString() === justCompletedId) {
    return null
  }

  return aktivitetPath(event.behandlingId, aktivitet)
}

export type EventHandling = { type: 'naviger'; path: string } | { type: 'revalider' } | { type: 'ignorer' }

/**
 * Avgjør hva vi gjør med en Kafka-melding mens maskinen jobber:
 * - naviger: neste aktivitet for saksbehandler er kjent, gå direkte dit
 * - revalider: maskinen har stoppet uten en aktivitet vi kan navigere til (feil, attestering, fullført osv.),
 *   så loaderen må avgjøre hvor vi skal
 * - ignorer: maskinen jobber fortsatt
 */
export function vurderEvent(event: BehandlingDTO, justCompletedId: string | null, now = new Date()): EventHandling {
  const path = getNesteAktivitetPathFraEvent(event, justCompletedId)
  if (path) {
    return { type: 'naviger', path }
  }

  if (event.status === BehandlingStatus.FEILENDE) {
    return { type: 'revalider' }
  }

  if (event.aldeBehandlingStatus === AldeBehandlingStatus.VENTER_MASKINELL) {
    const utsatt = event.utsattTil !== null && new Date(event.utsattTil) >= now
    return utsatt ? { type: 'revalider' } : { type: 'ignorer' }
  }

  if (event.aldeBehandlingStatus === AldeBehandlingStatus.VENTER_SAKSBEHANDLER) {
    const aktivitet = finnAktivitetSomSkalVises(event.aktiviteter)
    // Gammel melding om aktiviteten vi nettopp fullførte
    if (aktivitet && aktivitet.aktivitetId.toString() === justCompletedId) {
      return { type: 'ignorer' }
    }
  }

  return { type: 'revalider' }
}

export function getRedirectPath({
  pathname,
  behandlingId,
  behandling,
  justCompletedId,
}: {
  pathname: string
  behandlingId: string
  behandling: BehandlingDTO
  justCompletedId: string | null
}): string | null {
  const exactBehandlingRoute = pathname === `/behandling/${behandlingId}`

  if (!exactBehandlingRoute) {
    return null
  }

  if (behandling.aldeBehandlingStatus === AldeBehandlingStatus.FULLFORT) {
    return `/behandling/${behandlingId}/oppsummering`
  }

  if (behandling.aldeBehandlingStatus === AldeBehandlingStatus.RETURNERT_TIL_SAKSBEHANDLER) {
    return `/behandling/${behandlingId}/attestering-returnert-til-saksbehandler`
  }

  if (behandling.aldeBehandlingStatus === AldeBehandlingStatus.AUTOMATISK_TIL_MANUELL) {
    return `/behandling/${behandlingId}/avbrutt-automatisk`
  }

  if (behandling.aldeBehandlingStatus === AldeBehandlingStatus.AVBRUTT_AV_BRUKER) {
    return `/behandling/${behandlingId}/avbrutt-manuelt`
  }

  if (behandling.aldeBehandlingStatus === AldeBehandlingStatus.VENTER_ATTESTERING) {
    return `/behandling/${behandlingId}/attestering`
  }

  const aktivitetSomSkalVises = finnAktivitetSomSkalVises(behandling.aktiviteter)
  if (aktivitetSomSkalVises?.handlerName === 'attestering') {
    return aktivitetPath(behandlingId, aktivitetSomSkalVises)
  }
  const shouldRefetchAfterCompletion =
    aktivitetSomSkalVises && justCompletedId && aktivitetSomSkalVises.aktivitetId?.toString() === justCompletedId
  if (
    aktivitetSomSkalVises &&
    !shouldRefetchAfterCompletion &&
    behandling.aldeBehandlingStatus === AldeBehandlingStatus.VENTER_SAKSBEHANDLER
  ) {
    return aktivitetPath(behandlingId, aktivitetSomSkalVises)
  }
  return null
}

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `Behandling ${params.behandlingId}` }, { name: 'description', content: 'Behandling detaljer' }]
}

export async function loader({ params, request, url, context }: Route.LoaderArgs) {
  const { aktivitetId, behandlingId } = params
  const { showStepper } = context.get(settingsContext)
  const justCompletedId = url.searchParams.get('justCompleted')

  const api = createBehandlingApi({ request, behandlingId })
  const behandling = await api.hentBehandling()

  const isOppsummering = url.pathname.includes('/oppsummering')
  const isAttestering = url.pathname.includes('/attestering')

  const behandlingJobber =
    behandling.aldeBehandlingStatus === AldeBehandlingStatus.VENTER_MASKINELL &&
    (!behandling.utsattTil || new Date(behandling.utsattTil) < new Date())

  const behandlingFeiler = skalViseFeilende(behandling)

  const redirectPath = getRedirectPath({
    pathname: url.pathname,
    behandlingId,
    behandling,
    justCompletedId,
  })
  if (redirectPath) {
    return redirect(redirectPath)
  }

  return {
    aktivitetId: aktivitetId,
    behandling,
    behandlingId,
    behandlingJobber: !behandlingFeiler && (Boolean(behandlingJobber) || Boolean(justCompletedId)),
    behandlingFeiler,
    isAttestering,
    showStepper: showStepper && !isOppsummering,
  }
}

export async function action({ params, request }: Route.ActionArgs) {
  const { behandlingId } = params
  const formData = await request.formData()

  const api = createBehandlingApi({ request, behandlingId })

  if (formData.get('intent') === 'retry') {
    await api.fortsett()
    return redirect(`/behandling/${behandlingId}`)
  }

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
  const { aktivitetId, behandling, behandlingJobber, behandlingFeiler, showStepper, isAttestering } = loaderData
  const retryFetcher = useFetcher()
  const [venterPaRetry, setVenterPaRetry] = useState(false)
  const isLoading = behandlingJobber || venterPaRetry
  const kjoringUuid = behandling.sisteKjoring?.uuid ?? null
  const ventetPaKjoringRef = useRef<string | null>(null)
  const params = useParams()
  const currentAktivitetId = params.aktivitetId
  const navigate = useNavigate()
  const stepperContainerRef = useRef<HTMLDivElement>(null)
  const revalidator = useRevalidator()
  const revalidatorRef = useRef(revalidator)
  revalidatorRef.current = revalidator

  const [searchParams] = useSearchParams()
  const justCompletedId = searchParams.get('justCompleted')
  const isLoadingRef = useRef(isLoading)
  isLoadingRef.current = isLoading

  // Mens maskinen jobber: naviger direkte til neste aktivitet når Kafka-meldingen sier
  // at behandlingen venter på saksbehandler. Revalider kun når maskinen har stoppet uten en
  // aktivitet vi kan navigere til. Ellers brukes meldingen bare til å vise fremdrift.
  // Når maskinen ikke jobber (f.eks. venter på attestering) revalideres det når statusen endres.
  const { live: sseLive, lastEvent } = useBehandlingEvents(behandling.behandlingId, {
    onEvent: event => {
      if (!isLoadingRef.current) return harEndretStatus(event, behandling)

      const handling = vurderEvent(event, justCompletedId)
      if (handling.type === 'naviger') {
        navigate(handling.path, { replace: true })
        return false
      }
      return handling.type === 'revalider'
    },
    onOpen: () => isLoadingRef.current,
  })
  const sseLiveRef = useRef(sseLive)
  sseLiveRef.current = sseLive

  // Bruk Kafka-meldingen om den er nyere enn data fra loaderen
  const sisteAktiviteter =
    lastEvent && lastEvent.sisteKjoringDato >= behandling.sisteKjoringDato
      ? lastEvent.aktiviteter
      : behandling.aktiviteter

  function retry() {
    ventetPaKjoringRef.current = kjoringUuid
    setVenterPaRetry(true)
    retryFetcher.submit({ intent: 'retry' }, { method: 'POST' })
  }

  useEffect(() => {
    if (!venterPaRetry) return

    if (!behandlingFeiler || kjoringUuid !== ventetPaKjoringRef.current) {
      setVenterPaRetry(false)
    }
  }, [venterPaRetry, behandlingFeiler, kjoringUuid])
  const ref = useRef<HTMLDialogElement>(null)

  const avbrytAktivitet = () => ref.current?.showModal()

  // Prepare the visible aktiviteter (sorted and filtered).
  // Bruker sisteAktiviteter slik at stepperen oppdateres fra Kafka-meldinger uten revalidering.
  const visibleAktiviteter = React.useMemo(
    () =>
      sisteAktiviteter
        .slice()
        .sort((a, b) => a.opprettet.localeCompare(b.opprettet))
        .filter(aktivitet => aktivitet.friendlyName),
    [sisteAktiviteter],
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
    if (!isLoading) return

    const startedAt = Date.now()
    let sistRevalidert = startedAt
    const intervalId = setInterval(() => {
      if (Date.now() - startedAt > POLL_MAX_MS) {
        clearInterval(intervalId)
        setVenterPaRetry(false)
        return
      }

      const now = Date.now()
      if (revalidatorRef.current.state === 'idle' && skalPolle({ live: sseLiveRef.current, sistRevalidert, now })) {
        sistRevalidert = now
        revalidatorRef.current.revalidate()
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [isLoading])

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
    <>
      <HStack justify="start" wrap={false} style={{ flex: 1 }}>
        <Show asChild above="2xl">
          <Box borderWidth="0 1 0 0" borderColor="neutral-subtle" className={behandlingStyles.pennyVenstremenyBredde}>
            <VStack>
              <Box paddingBlock="space-24" paddingInline="space-44" borderWidth="0 0 1 0" borderColor="neutral-subtle">
                <BodyShort as="h2" size="small" weight="semibold">
                  {behandling.processName}
                </BodyShort>
              </Box>

              <Box paddingBlock="space-24" paddingInline="space-44">
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
              </Box>
            </VStack>
          </Box>
        </Show>

        <main className={behandlingStyles.mainContent}>
          {isLoading ? (
            <AldeLoader />
          ) : behandlingFeiler ? (
            <FeilendeBehandling behandling={behandling} retry={retry} avbrytAktivitet={avbrytAktivitet} />
          ) : (
            <BehandlingEventsContext value={sseLive}>
              <Outlet context={{ behandling, avbrytAktivitet }} />
            </BehandlingEventsContext>
          )}
        </main>
      </HStack>

      <Modal ref={ref} header={{ heading: 'Vil du avbryte del-automatisk behandling?' }}>
        <Form method="post">
          {aktivitetId && <input type="hidden" name="aktivitetId" value={aktivitetId} />}
          <Modal.Body>
            <VStack gap="space-16">
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
    </>
  )
}
