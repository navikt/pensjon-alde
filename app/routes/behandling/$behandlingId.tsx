import { BodyShort, Box, CopyButton, HStack, Label, Loader, Page, Stepper, Tag, VStack } from '@navikt/ds-react'
import React, { useEffect, useRef } from 'react'
import { Outlet, redirect, useNavigate, useParams, useRevalidator } from 'react-router'
import { useFetch2 } from '~/utils/use-fetch/use-fetch'
import type { BehandlingDTO } from '../../types/behandling'
import { AktivitetStatus, AldeBehandlingStatus, BehandlingStatus } from '../../types/behandling'
import { formatDateToNorwegian } from '../../utils/date'
import { buildAktivitetRedirectUrl } from '../../utils/handler-discovery'
import type { Route } from './+types/$behandlingId'

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `Behandling ${params.behandlingId}` }, { name: 'description', content: 'Behandling detaljer' }]
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingId } = params
  const url = new URL(request.url)
  const justCompletedId = url.searchParams.get('justCompleted')

  const penUrl = `${process.env.PEN_URL!}/api/saksbehandling/alde`
  let behandling = await useFetch2<BehandlingDTO>(request, `${penUrl}/behandling/${behandlingId}`)

  if (!params.aktivitetId && behandling.aktiviteter.length > 0) {
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

    if (aktivitetSomSkalVises && justCompletedId && aktivitetSomSkalVises.aktivitetId?.toString() === justCompletedId) {
      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 500))
        // biome-ignore lint/correctness/useHookAtTopLevel: Not a hook!
        behandling = await useFetch2<BehandlingDTO>(request, `${penUrl}/behandling/${behandlingId}`)

        aktivitetSomSkalVises = behandling.aktiviteter.find(
          aktivitet =>
            (aktivitet.status === AktivitetStatus.UNDER_BEHANDLING || aktivitet.status === AktivitetStatus.FEILET) &&
            aktivitet.aktivitetId?.toString() !== justCompletedId,
        )

        if (aktivitetSomSkalVises) break
      }
    }

    if (aktivitetSomSkalVises) {
      return redirect(`/behandling/${behandlingId}/aktivitet/${aktivitetSomSkalVises.aktivitetId}`)
    }
  }

  return {
    behandlingId,
    behandling,
  }
}

export default function Behandling({ loaderData }: Route.ComponentProps) {
  const { behandling } = loaderData
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

  const activeStepIndex = currentAktivitetId
    ? visibleAktiviteter.findIndex(a => a.aktivitetId?.toString() === currentAktivitetId)
    : 0

  const behandlingJobber =
    behandling.aldeBehandlingStatus === AldeBehandlingStatus.VENTER_MASKINELL &&
    (!behandling.utsattTil || new Date(behandling.utsattTil) < new Date())

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

        {visibleAktiviteter.length > 0 && (
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
                {visibleAktiviteter.map((aktivitet, index) => (
                  <Stepper.Step
                    key={aktivitet.aktivitetId}
                    completed={aktivitet.status === AktivitetStatus.FULLFORT}
                    onClick={() => {
                      const implementationUrl = buildAktivitetRedirectUrl(
                        params.behandlingId!.toString(),
                        aktivitet.aktivitetId!.toString(),
                        loaderData.behandling,
                        aktivitet,
                      )
                      // Navigate to the implementation URL if it exists, otherwise to the base aktivitet URL
                      navigate(implementationUrl || `aktivitet/${aktivitet.aktivitetId}`)
                    }}
                    style={{ cursor: 'pointer' }}
                    data-step-index={index}
                  >
                    {aktivitet.friendlyName!}
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
