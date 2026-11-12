import { BugIcon, PersonCircleIcon, RobotSmileIcon } from '@navikt/aksel-icons'
import { BodyLong, BodyShort, Box, Button, HStack, Modal, Process, Show, Textarea, VStack } from '@navikt/ds-react'
import React, { useEffect, useRef, useState } from 'react'
import {
  Form,
  Outlet,
  redirect,
  useFetcher,
  useLocation,
  useNavigate,
  useNavigation,
  useParams,
  useRevalidator,
  useSearchParams,
} from 'react-router'
import { createBehandlingApi } from '~/api/behandling-api'
import {
  aktiviteterForVisning,
  finnAktivitetUnderBehandling,
  skalPolle,
  velgEventHandling,
  venterPaEndring,
} from '~/behandling-events/event-handling'
import FeilendeBehandling from '~/components/FeilendeBehandling'
import AldeLoader from '~/components/Loader'
import { settingsContext } from '~/context/settings-context'
import { BehandlingEventsContext, useBehandlingEvents } from '~/hooks/use-behandling-events'
import { useIsSubmitting } from '~/hooks/use-is-submitting'
import { AktivitetStatus, AldeBehandlingStatus, type BehandlingDTO, BehandlingStatus } from '~/types/behandling'
import {
  aktivitetPath,
  finnAktivitetSomSkalVises,
  kanGaTilbakeTilSaksbehandler,
  venterSaksbehandlerPaAktivitet,
} from '~/utils/aktivitet-navigering'
import { FORRIGE_KJORING_PARAM, utenForrigeKjoring, venterPaNyKjoring } from '~/utils/fortsett-behandling'
import type { Route } from './+types/$behandlingId'
import behandlingStyles from './$behandlingId.module.css'

export { kunForrigeKjoringFjernet as shouldRevalidate } from '~/utils/fortsett-behandling'

const POLL_INTERVAL_MS = 1500
const POLL_MAX_MS = 120_000

export function skalViseFeilende(behandling: BehandlingDTO): boolean {
  return behandling.status === BehandlingStatus.FEILENDE
}

export function getRedirectPath({
  pathname,
  behandlingId,
  behandling,
  venterPaKjoring = false,
}: {
  pathname: string
  behandlingId: string
  behandling: BehandlingDTO
  venterPaKjoring?: boolean
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
  if (
    aktivitetSomSkalVises &&
    !venterPaKjoring &&
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

  const api = createBehandlingApi({ request, behandlingId })
  const behandling = await api.hentBehandling()

  const isOppsummering = url.pathname.includes('/oppsummering')
  const isAttestering = url.pathname.includes('/attestering')

  const behandlingJobber =
    behandling.aldeBehandlingStatus === AldeBehandlingStatus.VENTER_MASKINELL &&
    (!behandling.utsattTil || new Date(behandling.utsattTil) < new Date())

  const behandlingFeiler = skalViseFeilende(behandling)
  const forrigeKjoring = url.searchParams.get(FORRIGE_KJORING_PARAM)
  const venter = venterPaNyKjoring(behandling, forrigeKjoring)

  let valideringFerdig = false
  if (aktivitetId && forrigeKjoring !== null) {
    const nesteSide = getRedirectPath({ pathname: `/behandling/${behandlingId}`, behandlingId, behandling })
    if (!kanGaTilbakeTilSaksbehandler(behandling, aktivitetId)) {
      return redirect(nesteSide ?? `/behandling/${behandlingId}`)
    }
    if (!venter && venterSaksbehandlerPaAktivitet(behandling, aktivitetId)) {
      // Vurderingen ble avvist: bli stående og vis valideringsfeilene. Klienten fjerner forrigeKjoring fra URL-en
      // uten å kjøre loaderne på nytt (se kunForrigeKjoringFjernet).
      valideringFerdig = true
    } else if (!venter && !behandlingJobber) {
      return redirect(nesteSide ?? `/behandling/${behandlingId}`)
    }
  }

  const venterPaValidering = Boolean(aktivitetId) && forrigeKjoring !== null && !valideringFerdig

  const redirectPath = getRedirectPath({
    pathname: url.pathname,
    behandlingId,
    behandling,
    venterPaKjoring: venter,
  })
  if (redirectPath) {
    return redirect(redirectPath)
  }

  if (aktivitetId && behandlingJobber && !behandlingFeiler && !venterPaValidering) {
    return redirect(`/behandling/${behandlingId}${url.search}`)
  }

  return {
    aktivitetId: aktivitetId,
    behandling,
    behandlingId,
    behandlingJobber: !behandlingFeiler && !venterPaValidering && (Boolean(behandlingJobber) || venter),
    venterPaValidering,
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
  const {
    aktivitetId,
    behandling,
    behandlingJobber,
    venterPaValidering,
    behandlingFeiler,
    showStepper,
    isAttestering,
  } = loaderData
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
  const forrigeKjoring = searchParams.get(FORRIGE_KJORING_PARAM)
  const location = useLocation()

  const isLoadingRef = useRef(isLoading)
  isLoadingRef.current = isLoading
  const venterPaSvar = useIsSubmitting()
  const venterPaSvarRef = useRef(venterPaSvar)
  venterPaSvarRef.current = venterPaSvar
  const currentAktivitetIdRef = useRef(currentAktivitetId)
  currentAktivitetIdRef.current = currentAktivitetId

  // En revalidering avbryter lasting som allerede pågår og starter den på nytt. Kommer det hendelser mens vi
  // laster, venter vi til lastingen er ferdig, og revaliderer bare hvis vi ikke allerede har fått svaret.
  const navigation = useNavigation()
  const opptatt = navigation.state !== 'idle' || revalidator.state !== 'idle'
  const opptattRef = useRef(opptatt)
  opptattRef.current = opptatt
  const utsattRevalideringRef = useRef(false)

  // Valideringen er ferdig og vi blir stående på aktiviteten: fjern forrigeKjoring fra URL-en.
  // shouldRevalidate (kunForrigeKjoringFjernet) sørger for at dette ikke laster dataene på nytt, og
  // hendelser som kom mens vi ventet trenger ingen revalidering, siden vi allerede har svaret.
  const valideringFerdig = forrigeKjoring !== null && currentAktivitetId !== undefined && !venterPaValidering
  useEffect(() => {
    if (!valideringFerdig) return
    utsattRevalideringRef.current = false
    navigate(
      { pathname: location.pathname, search: utenForrigeKjoring(location.search), hash: location.hash },
      { replace: true, preventScrollReset: true },
    )
  }, [valideringFerdig, navigate, location.pathname, location.search, location.hash])

  useEffect(() => {
    if (opptatt || valideringFerdig || !utsattRevalideringRef.current) return
    utsattRevalideringRef.current = false
    revalidatorRef.current.revalidate()
  }, [opptatt, valideringFerdig])

  const { live: sseLive, lastEvent } = useBehandlingEvents(behandling.behandlingId, {
    onEvent: event => {
      const handling = velgEventHandling({
        event,
        behandling,
        aktivitetId: currentAktivitetIdRef.current,
        forrigeKjoring,
        isLoading: isLoadingRef.current,
        venterPaSvar: venterPaSvarRef.current,
      })

      if (handling.type === 'naviger') {
        navigate(handling.path, { replace: true })
        return false
      }
      if (handling.type === 'revalider' && opptattRef.current) {
        utsattRevalideringRef.current = true
        return false
      }
      return handling.type === 'revalider'
    },
    onOpen: () => {
      const skalRevalidere = venterPaEndring(behandling, isLoadingRef.current, venterPaSvarRef.current)
      if (skalRevalidere && opptattRef.current) {
        utsattRevalideringRef.current = true
        return false
      }
      return skalRevalidere
    },
  })
  const sseLiveRef = useRef(sseLive)
  sseLiveRef.current = sseLive

  const sisteAktiviteter = aktiviteterForVisning({ behandling, lastEvent, isLoading, forrigeKjoring })
  const aktivitetUnderBehandling = finnAktivitetUnderBehandling(sisteAktiviteter)

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

  // Prepare the visible aktiviteter (sorted and filtered)
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

  const skalVente = isLoading || venterPaValidering

  useEffect(() => {
    if (!skalVente) return

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
  }, [skalVente])

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
            <AldeLoader aktivitetNavn={aktivitetUnderBehandling} />
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
