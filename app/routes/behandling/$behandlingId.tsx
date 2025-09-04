import { BodyShort, Box, CopyButton, HStack, Label, Loader, Page, Stepper, Tag, VStack } from '@navikt/ds-react'
import React, { useEffect, useRef } from 'react'
import { Outlet, redirect, useNavigate, useParams, useRevalidator } from 'react-router'
import { createBehandlingApi } from '~/api/behandling-api'
import { AktivitetStatus, AldeBehandlingStatus, type BehandlingDTO, BehandlingStatus } from '../../types/behandling'
import { formatDateToNorwegian } from '../../utils/date'
import type { Route } from './+types/$behandlingId'

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `Behandling ${params.behandlingId}` }, { name: 'description', content: 'Behandling detaljer' }]
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingId } = params
  const url = new URL(request.url)
  const justCompletedId = url.searchParams.get('justCompleted')

  const api = createBehandlingApi({ request, behandlingId })
  const behandling = await api.hentBehandling<BehandlingDTO>()

  let aktivitetSomSkalVises = null
  const behandlingJobber =
    behandling.aldeBehandlingStatus === AldeBehandlingStatus.VENTER_MASKINELL &&
    (!behandling.utsattTil || new Date(behandling.utsattTil) < new Date())

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

    const shouldRefetchAfterCompletion =
      aktivitetSomSkalVises && justCompletedId && aktivitetSomSkalVises.aktivitetId?.toString() === justCompletedId

    if (aktivitetSomSkalVises && !shouldRefetchAfterCompletion) {
      return redirect(`/behandling/${behandlingId}/aktivitet/${aktivitetSomSkalVises.aktivitetId}`)
    }
  }

  return {
    behandlingId,
    behandling,
    behandlingJobber:
      behandlingJobber ||
      (aktivitetSomSkalVises && justCompletedId && aktivitetSomSkalVises.aktivitetId?.toString() === justCompletedId),
  }
}

export default function Behandling({ loaderData }: Route.ComponentProps) {
  const { behandling, behandlingJobber } = loaderData
  const params = useParams()
  const currentAktivitetId = params.aktivitetId
  const navigate = useNavigate()
  const stepperContainerRef = useRef<HTMLDivElement>(null)
  const revalidator = useRevalidator()

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
                <CopyButton text={behandling.kravId.toString()} copyText={behandling.kravId.toString()} size="small" />
              </VStack>
            )}

            {behandling.sakId && (
              <VStack>
                <Label size="small">Sak</Label>
                <CopyButton text={behandling.sakId.toString()} copyText={behandling.sakId.toString()} size="small" />
              </VStack>
            )}
          </HStack>
        </Box.New>

        {allSteps.length > 0 && (
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
                    {step.friendlyName!}
                  </Stepper.Step>
                ))}
              </Stepper>
            </div>
          </Box.New>
        )}

        {behandlingJobber ? <Loader /> : <Outlet context={{ behandling }} />}
      </Page>
    </Box.New>
  )
}
