import { ExternalLinkIcon, PersonIcon } from '@navikt/aksel-icons'
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
  Spacer,
  Stepper,
  Tag,
  Textarea,
  VStack,
} from '@navikt/ds-react'
import React, { useEffect, useRef } from 'react'
import { Form, Outlet, redirect, useNavigate, useParams, useRevalidator } from 'react-router'
import { createBehandlingApi } from '~/api/behandling-api'
import AldeLoader from '~/components/Loader'
import { settingsContext } from '~/context/settings-context'
import { AktivitetStatus, AldeBehandlingStatus, BehandlingStatus } from '~/types/behandling'
import { buildUrl } from '~/utils/build-url'
import { formatDateToAge, formatDateToNorwegian } from '~/utils/date'
import { env } from '~/utils/env.server'
import type { Route } from './+types/$behandlingId'

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `Behandling ${params.behandlingId}` }, { name: 'description', content: 'Behandling detaljer' }]
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { aktivitetId, behandlingId } = params
  const url = new URL(request.url)

  const { showStepper, showMetadata } = context.get(settingsContext)
  const justCompletedId = url.searchParams.get('justCompleted')

  const api = createBehandlingApi({ request, behandlingId })
  const behandling = await api.hentBehandling()
  const soker = await api.hentSoker()

  const isOppsummering = url.pathname.includes('/oppsummering')
  const isAttestering = url.pathname.includes('/attestering')

  const behandlingJobber =
    behandling.aldeBehandlingStatus === AldeBehandlingStatus.VENTER_MASKINELL &&
    (!behandling.utsattTil || new Date(behandling.utsattTil) < new Date())

  // TODO: Rydd opp logikk, flytte oppsummering?
  let aktivitetSomSkalVises = null
  if (!aktivitetSomSkalVises && behandling.aldeBehandlingStatus === AldeBehandlingStatus.FULLFORT && !isOppsummering) {
    return redirect(`/behandling/${behandlingId}/oppsummering`)
  } else if (!isOppsummering && !isAttestering) {
    if (!params.aktivitetId && behandling.aktiviteter.length > 0) {
      aktivitetSomSkalVises = behandling.aktiviteter.find(
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

      // TODO: Må ha en annen måte å vite hva som er attestering fra AldeAktivitet
      if (aktivitetSomSkalVises?.handlerName === 'attestering') {
        return redirect(`/behandling/${behandlingId}/attestering`)
      }

      const shouldRefetchAfterCompletion =
        aktivitetSomSkalVises && justCompletedId && aktivitetSomSkalVises.aktivitetId?.toString() === justCompletedId

      if (aktivitetSomSkalVises && !shouldRefetchAfterCompletion) {
        return redirect(`/behandling/${behandlingId}/aktivitet/${aktivitetSomSkalVises.aktivitetId}`)
      }
    }
  }

  return {
    aktivitetId: aktivitetId,
    behandling,
    behandlingId,
    behandlingJobber:
      behandlingJobber ||
      (aktivitetSomSkalVises && justCompletedId && aktivitetSomSkalVises.aktivitetId?.toString() === justCompletedId),
    isOppsummering,
    isAttestering,
    showStepper: showStepper && !isOppsummering && !isAttestering,
    showMetadata,
    soker,
    psakUrl: buildUrl(env.psakSakUrlTemplate, { sakId: behandling.sakId }),
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

  return redirect(`/behandling/${behandlingId}/oppsummering`)
}

export default function Behandling({ loaderData }: Route.ComponentProps) {
  const { aktivitetId, behandling, behandlingJobber, showStepper, showMetadata, soker, isOppsummering, psakUrl } =
    loaderData
  const params = useParams()
  const currentAktivitetId = params.aktivitetId
  const navigate = useNavigate()
  const stepperContainerRef = useRef<HTMLDivElement>(null)
  const revalidator = useRevalidator()
  const ref = useRef<HTMLDialogElement>(null)

  // Prepare the visible aktiviteter (sorted and filtered)
  const visibleAktiviteter = React.useMemo(
    () =>
      behandling.aktiviteter
        .slice()
        .sort((a, b) => a.type.localeCompare(b.type))
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
        },
      ]
    }
    return aktivitetSteps
  }, [visibleAktiviteter, behandlingJobber])

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
    <Box.New asChild background={'default'}>
      <Page>
        <Box.New
          paddingInline="10"
          paddingBlock="2"
          borderWidth="1 0"
          background="neutral-soft"
          borderColor="neutral-subtle"
        >
          <HStack align="center" gap="1">
            <HStack align="center">
              <PersonIcon fontSize="1.5em" /> {soker.fnr}
              <CopyButton size="small" variant="action" copyText={soker.fnr ?? ''} />
            </HStack>
            <span>/</span>
            {soker.etternavn}, {soker.fornavn} {soker.mellomnavn}
            <span>/</span>
            Født: {formatDateToNorwegian(soker.fodselsdato)} ({formatDateToAge(soker.fodselsdato)})
            <Spacer />
            {behandling.friendlyName}
            <span>/</span>
            <HStack align="center">
              {behandling.sakId}
              <CopyButton size="small" variant="action" copyText={behandling.sakId?.toString() ?? ''} />
            </HStack>
          </HStack>
        </Box.New>
        {showMetadata && (
          <Box.New padding="4" borderWidth="1 0">
            <HStack gap="6" align="center">
              <VStack>
                <Label size="small">Behandling</Label>
                <BodyShort>{behandling.friendlyName}</BodyShort>
              </VStack>

              <VStack>
                <Label size="small">Status</Label>
                <Tag
                  variant={
                    behandling.status === BehandlingStatus.FERDIG
                      ? 'success'
                      : behandling.status === BehandlingStatus.FEILET
                        ? 'error'
                        : 'info'
                  }
                  size="small"
                >
                  {behandling.aldeBehandlingStatus}
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
                  <CopyButton text={behandling.sakId.toString()} copyText={behandling.sakId.toString()} size="small" />
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
                  onClick={() => window.open(psakUrl, '_blank')}
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

        {allSteps.length > 0 && showStepper && (
          <Box.New padding="space-12">
            <div
              ref={stepperContainerRef}
              style={{
                overflowX: 'auto',
                overflowY: 'hidden',
                scrollbarWidth: 'thin',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <Stepper orientation="horizontal" activeStep={activeStepIndex + 1} style={{ minWidth: 'max-content' }}>
                {allSteps.map((step, index) => (
                  <Stepper.Step
                    key={step.aktivitetId}
                    completed={step.status === AktivitetStatus.FULLFORT}
                    onClick={() => {
                      if (!step.redirectUrl) return

                      navigate(step.redirectUrl)
                    }}
                    style={{ cursor: 'pointer' }}
                    data-step-index={index}
                  >
                    {step.friendlyName ?? ''}
                  </Stepper.Step>
                ))}
              </Stepper>
            </div>
          </Box.New>
        )}

        {behandlingJobber ? <AldeLoader /> : <Outlet context={{ behandling }} />}

        <Modal ref={ref} header={{ heading: 'Er du sikker på du vil ta til manuell?' }}>
          <Form method="post">
            <input hidden name="aktivitetId" value={aktivitetId} />
            <Modal.Body>
              <VStack gap="4">
                <BodyLong>
                  Beklager at du ikke kunne fullføre denne behandlingen her. Vi vil gjerne lære så vi kan gjøre dette
                  bedre. Ikke skriv personopplysninger.
                </BodyLong>

                <Textarea label="Tilbakemelding (frivillig)" name="begrunnelse" />
              </VStack>
            </Modal.Body>
            <Modal.Footer>
              <Button type="submit" variant="danger" onClick={() => ref.current?.close()}>
                Ta til manuell
              </Button>
              <Button type="button" variant="secondary" onClick={() => ref.current?.close()}>
                Avbryt
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </Page>
    </Box.New>
  )
}
