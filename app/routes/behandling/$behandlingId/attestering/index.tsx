import {
  BodyShort,
  Box,
  Button,
  Checkbox,
  Heading,
  HStack,
  Label,
  Page,
  Radio,
  RadioGroup,
  VStack,
} from '@navikt/ds-react'
import React, { useEffect, useRef } from 'react'
import { data, Form, redirect, useOutletContext } from 'react-router'
import { createBehandlingApi } from '~/api/behandling-api'
import type { AktivitetAtt } from '~/api/behandling-api/types'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import { type AktivitetDTO, AldeBehandlingStatus, type BehandlingDTO } from '~/types/behandling'
import { getAllServerComponents } from '~/utils/component-discovery'
import type { Route } from './+types'
import './attestering.css'
import { ArrowDownIcon } from '@navikt/aksel-icons'
import { userContext } from '~/context/user-context'
import { formatDateToNorwegian } from '~/utils/date'

interface AktivitetTilAttestering {
  aktivitetId: number
  handlerName: string
  friendlyName: string
  grunnlag: string
  vurdering: string
  aktivitet: AktivitetDTO
  vurdertTidspunkt?: string
  vurdertAvBrukerId?: string
  vurdertAvBrukerNavn?: string
}

const enhanceAttesteringAktivitet =
  (beh: BehandlingDTO) =>
  (aktivitet: AktivitetAtt): AktivitetTilAttestering => {
    const behandlingAktivitet = beh.aktiviteter.find(ba => ba.aktivitetId === aktivitet.aktivitetId)
    if (!behandlingAktivitet) {
      throw new Error(
        `Aktivitet ${aktivitet.aktivitetId} not found in behandling ${JSON.stringify(beh.aktiviteter, null, 2)}`,
      )
    }
    return {
      aktivitetId: behandlingAktivitet.aktivitetId,
      handlerName: behandlingAktivitet.handlerName,
      friendlyName: behandlingAktivitet.friendlyName,
      grunnlag: aktivitet.grunnlag ? JSON.parse(aktivitet.grunnlag) : null,
      vurdering: aktivitet.vurdering ? JSON.parse(aktivitet.vurdering) : null,
      aktivitet: behandlingAktivitet,
      vurdertTidspunkt: aktivitet.vurdertTidspunkt,
      vurdertAvBrukerId: aktivitet.vurdertAvBrukerId,
      vurdertAvBrukerNavn: aktivitet.vurdertAvBrukerNavn,
    }
  }

export const loader = async ({ params, request, context }: Route.LoaderArgs) => {
  const { behandlingId } = params
  const { navident } = context.get(userContext)
  const behandlingApi = createBehandlingApi({
    request,
    behandlingId,
  })
  const behandling = await behandlingApi.hentBehandling()
  const attesteringData = await behandlingApi.hentAttesteringsdata()

  const serverComponents = getAllServerComponents()

  const parsedData = attesteringData.aktiviter
    .map(enhanceAttesteringAktivitet(behandling))
    .filter(aktivitet => aktivitet.grunnlag || aktivitet.vurdering)
    .filter(aktivitet => aktivitet.handlerName !== 'send-til-attestering')
    .filter(aktivitet => aktivitet.handlerName !== 'attestering')
    .filter(aktivitet => aktivitet.vurdertAvBrukerId)
    .map(aktivitet => ({
      ...aktivitet,
      hasComponent: serverComponents.has(aktivitet.handlerName),
    }))

  if (behandling.sisteSaksbehandlerNavident === navident) {
    return redirect(`/behandling/${behandlingId}/venter-attestering`)
  } else if (behandling.aldeBehandlingStatus !== AldeBehandlingStatus.VENTER_ATTESTERING) {
    return redirect(`/behandling/${behandlingId}`)
  } else {
    return {
      aktiviteter: parsedData,
    }
  }
}

enum AttesteringUtfall {
  GODKJENN = 'GODKJENN',
  IKKE_GODKJENN = 'IKKE_GODKJENN',
}

export const action = async ({ params, request }: Route.ActionArgs) => {
  const { behandlingId } = params

  const formData = await request.formData()
  const utfall = formData.get('utfall') as AttesteringUtfall

  const behandlingApi = createBehandlingApi({ request, behandlingId })
  if (utfall === AttesteringUtfall.GODKJENN) {
    await behandlingApi.attester()
    return redirect(`/behandling/${behandlingId}/attestert-og-iverksatt`)
  } else if (utfall === AttesteringUtfall.IKKE_GODKJENN) {
    const begrunnelse = formData.get('begrunnelse') as string

    if (begrunnelse) {
      await behandlingApi.returnerTilSaksbehandler(begrunnelse)
      return redirect(`/behandling/${behandlingId}/attestering-returnert-til-saksbehandler`)
    } else {
      return data(
        {
          errors: { begrunnelse: 'Begrunnelse må fylles ut' },
          data: {
            utfall,
            begrunnelse,
          },
        },
        { status: 400 },
      )
    }
  }
}

export default function Attestering({ loaderData, actionData }: Route.ComponentProps) {
  const { aktiviteter } = loaderData
  const { behandling } = useOutletContext<AktivitetOutletContext>()
  const { errors, data } = actionData || {}

  const components = getAllServerComponents()
  const [utfall, setUtfall] = React.useState<AttesteringUtfall | undefined>(data?.utfall)

  const begrunnelseRef = React.useRef<HTMLFieldSetElement>(null)

  const attesteringViewRef = React.useRef<HTMLDivElement>(null)

  const aktiviteterRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  const onSjekketClick = (aktivitetId: number, checked: boolean) => {
    if (!checked) return

    const currentIndex = aktiviteter.findIndex(a => a.aktivitetId === aktivitetId)
    const nextAktivitet = aktiviteter[currentIndex + 1]
    if (nextAktivitet) {
      const nextElement = aktiviteterRefs.current.get(nextAktivitet.aktivitetId)
      nextElement?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      attesteringViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  useEffect(() => {
    if (utfall !== undefined) {
      attesteringViewRef.current?.scrollIntoView()
    }
  }, [utfall])

  const AktivitetAttestering = () => {
    return (
      <Box.New background="brand-blue-soft" borderRadius="xlarge" padding="space-28" as="div" ref={attesteringViewRef}>
        <Form method="POST">
          <VStack gap="space-40">
            <Heading level="2" size="medium">
              Attestering
            </Heading>
            <RadioGroup legend="Beslutning" name="utfall" onChange={setUtfall} value={utfall}>
              <Radio size="small" value={AttesteringUtfall.GODKJENN}>
                Godkjenn
              </Radio>
              <Radio size="small" value={AttesteringUtfall.IKKE_GODKJENN}>
                Ikke godkjenn
              </Radio>
            </RadioGroup>
            {utfall === AttesteringUtfall.IKKE_GODKJENN && (
              <RadioGroup
                ref={begrunnelseRef}
                legend="Velg begrunnelse"
                name="begrunnelse"
                error={errors?.begrunnelse}
                defaultValue={data?.begrunnelse}
              >
                <Radio size="small" value="Feil i vedtak">
                  Feil i vedtak
                </Radio>

                <Radio size="small" value="Forvaltningsnotat utilstrekkelig">
                  Forvaltningsnotat utilstrekkelig
                </Radio>

                <Radio size="small" value="Hent inn nytt grunnlag">
                  Hent inn nytt grunnlag
                </Radio>

                <Radio size="small" value="Saksbehandlerstandard ikke fulgt">
                  Saksbehandlerstandard ikke fulgt
                </Radio>
              </RadioGroup>
            )}
            {utfall && (
              <div>
                <Button size="small" type="submit">
                  {utfall === AttesteringUtfall.IKKE_GODKJENN ? 'Returner til saksbehandler' : 'Attester og iverksett'}
                </Button>
              </div>
            )}
          </VStack>
        </Form>
      </Box.New>
    )
  }

  return (
    <Page.Block gutters width="xl">
      <VStack gap="space-28">
        <Heading level="1" size="large" style={{ paddingTop: '2rem' }}>
          Oppgaven er til attestering
        </Heading>
        <VStack gap="space-56">
          {aktiviteter.map(aktivitet => {
            const Component = components.get(aktivitet.handlerName)

            return Component ? (
              <VStack
                key={aktivitet.aktivitetId}
                ref={el => {
                  if (el) {
                    aktiviteterRefs.current.set(aktivitet.aktivitetId, el)
                  }
                }}
              >
                <Box.New
                  borderColor="neutral-subtleA"
                  borderWidth="1 1 0 1"
                  padding="space-28"
                  borderRadius="xlarge xlarge 0 0"
                >
                  <div className="component-area">
                    <div className="component">
                      <Component
                        readOnly={true}
                        grunnlag={aktivitet.grunnlag}
                        vurdering={aktivitet.vurdering}
                        aktivitet={aktivitet.aktivitet}
                        behandling={behandling}
                      />
                    </div>
                  </div>
                </Box.New>
                <Box.New
                  background="neutral-softA"
                  borderWidth="0 1 1 1"
                  borderRadius="0 0 xlarge xlarge"
                  borderColor="neutral-subtleA"
                  paddingBlock="space-20"
                  paddingInline="space-28"
                >
                  <HStack gap="8" align="center" justify="space-between">
                    <VStack>
                      <Label>Saksbehandler</Label>
                      <div>
                        {aktivitet.vurdertAvBrukerNavn} ({aktivitet.vurdertAvBrukerId})
                      </div>
                      <BodyShort textColor="subtle" size="small">
                        {formatDateToNorwegian(aktivitet.vurdertTidspunkt, { showTime: true })}
                      </BodyShort>
                    </VStack>
                    {aktiviteter.length > 1 && (
                      <div>
                        <Button
                          variant="secondary"
                          size="small"
                          icon={<ArrowDownIcon aria-hidden />}
                          onClick={() => onSjekketClick(aktivitet.aktivitetId, true)}
                        >
                          Videre
                        </Button>
                        <Checkbox onChange={e => onSjekketClick(aktivitet.aktivitetId, e.target.checked)}>
                          Sjekket
                        </Checkbox>
                      </div>
                    )}
                  </HStack>
                </Box.New>
              </VStack>
            ) : null
          })}
        </VStack>
        <AktivitetAttestering />
      </VStack>
    </Page.Block>
  )
}
