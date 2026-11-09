import { BugIcon, CheckmarkHeavyIcon, RobotSmileIcon } from '@navikt/aksel-icons'
import {
  BodyLong,
  BodyShort,
  Box,
  Button,
  HStack,
  Link,
  Modal,
  Process,
  Show,
  Textarea,
  VStack,
} from '@navikt/ds-react'
import React, { useEffect, useRef, useState } from 'react'
import { Form, Outlet, Link as RouterLink, redirect, useFetcher, useParams, useRevalidator } from 'react-router'
import { createBehandlingApi } from '~/api/behandling-api'
import FeilendeBehandling from '~/components/FeilendeBehandling'
import AldeLoader from '~/components/Loader'
import { settingsContext } from '~/context/settings-context'
import {
  type AktivitetDTO,
  AktivitetGruppe,
  AktivitetStatus,
  AldeBehandlingStatus,
  type BehandlingDTO,
  BehandlingStatus,
} from '~/types/behandling'
import { erAapenAktivitet, finnAapneAktiviteterForSaksbehandler } from '~/utils/aapne-aktiviteter'
import { grupperAktiviteter } from '~/utils/aktivitet-grupper'
import type { Route } from './+types/$behandlingId'
import behandlingStyles from './$behandlingId.module.css'

const POLL_INTERVAL_MS = 1500
const POLL_MAX_MS = 120_000

export function skalViseFeilende(behandling: BehandlingDTO): boolean {
  return behandling.status === BehandlingStatus.FEILENDE
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

  if (behandling.aktiviteter.length > 0) {
    const aapneAktiviteter = behandling.aktiviteter.filter(erAapenAktivitet)
    const erIkkeNettoppFullfort = (aktivitet: AktivitetDTO) => aktivitet.aktivitetId?.toString() !== justCompletedId

    const aktivitetSomSkalVises =
      aapneAktiviteter.find(aktivitet => aktivitet.friendlyName && erIkkeNettoppFullfort(aktivitet)) ??
      aapneAktiviteter.find(erIkkeNettoppFullfort) ??
      aapneAktiviteter.find(aktivitet => aktivitet.friendlyName) ??
      aapneAktiviteter[0]
    if (aktivitetSomSkalVises?.handlerName === 'attestering') {
      return `/behandling/${behandlingId}/attestering`
    }
    const shouldRefetchAfterCompletion =
      aktivitetSomSkalVises && justCompletedId && aktivitetSomSkalVises.aktivitetId?.toString() === justCompletedId
    if (
      aktivitetSomSkalVises &&
      !shouldRefetchAfterCompletion &&
      behandling.aldeBehandlingStatus === AldeBehandlingStatus.VENTER_SAKSBEHANDLER
    ) {
      return `/behandling/${behandlingId}/aktivitet/${aktivitetSomSkalVises.aktivitetId}`
    }
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
  // TODO: fjern debug-logging
  console.log(
    `[behandling ${behandlingId}] aktiviteter:`,
    behandling.aktiviteter.map(
      ({ aktivitetId, handlerName, friendlyName, gruppe, status, behandletFerdigMaskinelt }) => ({
        aktivitetId,
        handlerName,
        friendlyName,
        gruppe,
        status,
        behandletFerdigMaskinelt,
      }),
    ),
  )

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
  const stepperContainerRef = useRef<HTMLDivElement>(null)
  const revalidator = useRevalidator()
  const revalidatorRef = useRef(revalidator)
  revalidatorRef.current = revalidator

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

  // Rekkefølgen kommer fra backend (sortert på gruppe og orden)
  const visibleAktiviteter = React.useMemo(
    () => behandling.aktiviteter.filter(aktivitet => aktivitet.friendlyName),
    [behandling.aktiviteter],
  )

  const aapneAktiviteter = React.useMemo(
    () => finnAapneAktiviteterForSaksbehandler(behandling.aktiviteter),
    [behandling.aktiviteter],
  )

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
          gruppe: aktivitetSteps.at(-1)?.gruppe,
        },
      ]
    }
    return aktivitetSteps
  }, [visibleAktiviteter, behandlingJobber])

  const stepGrupper = React.useMemo(
    () => grupperAktiviteter(allSteps.filter(it => showStepper || it.handlerName)),
    [allSteps, showStepper],
  )

  function finnLenke(step: (typeof allSteps)[0]): string | null {
    if (!step.redirectUrl) return null
    if (currentAktivitetId === step.aktivitetId.toString()) return null
    if (step.status === AktivitetStatus.FULLFORT && step.handlerName) return step.redirectUrl
    if (!showStepper && !aapneAktiviteter.some(it => it.aktivitetId === step.aktivitetId)) return null
    return step.redirectUrl
  }

  function finnProcessIcon(step: (typeof allSteps)[0]) {
    if (step.status === AktivitetStatus.FULLFORT) {
      return <CheckmarkHeavyIcon />
    } else if (!step.handlerName) {
      return <BugIcon />
    } else if (step.behandletFerdigMaskinelt) {
      return <RobotSmileIcon />
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
    const intervalId = setInterval(() => {
      if (Date.now() - startedAt > POLL_MAX_MS) {
        clearInterval(intervalId)
        setVenterPaRetry(false)
        return
      }

      if (revalidatorRef.current.state === 'idle') {
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

              <Box paddingBlock="space-24" paddingInline="space-44" as="nav" aria-label="Aktiviteter">
                <VStack gap="space-24">
                  {stepGrupper.map(gruppe => {
                    const headingId = `aktivitet-gruppe-${gruppe.gruppe}`
                    const visHeading = stepGrupper.length > 1 || gruppe.gruppe !== AktivitetGruppe.USORTET
                    return (
                      <VStack gap="space-16" key={gruppe.gruppe}>
                        {visHeading && (
                          <BodyShort as="h3" id={headingId} size="small" weight="semibold" textColor="subtle">
                            {gruppe.navn}
                          </BodyShort>
                        )}
                        <Process hideStatusText={true} aria-labelledby={visHeading ? headingId : undefined}>
                          {gruppe.aktiviteter.map(step => {
                            const lenke = finnLenke(step)
                            return (
                              <Process.Event
                                className={behandlingStyles.xsmall}
                                key={step.aktivitetId}
                                status={finnStatus(step)}
                                title={lenke ? undefined : step.friendlyName}
                                bullet={finnProcessIcon(step)}
                              >
                                {lenke && (
                                  <Link as={RouterLink} to={lenke} className={behandlingStyles.stepLenke}>
                                    {step.friendlyName}
                                  </Link>
                                )}
                              </Process.Event>
                            )
                          })}
                        </Process>
                      </VStack>
                    )
                  })}
                </VStack>
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
            <Outlet context={{ behandling, avbrytAktivitet }} />
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
