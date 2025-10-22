import {
  Box,
  Button,
  Dropdown,
  Heading,
  HStack,
  Label,
  Page,
  Radio,
  RadioGroup,
  Textarea,
  VStack,
} from '@navikt/ds-react'
import React from 'react'
import { Form, redirect, useOutletContext } from 'react-router'
import { createBehandlingApi } from '~/api/behandling-api'
import type { AktivitetAtt } from '~/api/behandling-api/types'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import type { AktivitetDTO, BehandlingDTO } from '~/types/behandling'
import { getAllServerComponents } from '~/utils/component-discovery'
import type { Route } from './+types'
import './attestering.css'
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
    .map(aktivitet => ({
      ...aktivitet,
      hasComponent: serverComponents.has(aktivitet.handlerName),
    }))

  if (behandling.sisteSaksbehandlerNavident === navident) {
    return redirect(`/behandling/${behandlingId}/venter-attestering`)
  }

  return {
    aktiviteter: parsedData,
  }
}

enum AttesteringUtfall {
  GODKJENT = 'GODKJENT',
  IKKE_GODKJENT = 'IKKE_GODKJENT',
}

export const action = async ({ params, request }: Route.ActionArgs) => {
  const { behandlingId } = params

  const formData = await request.formData()
  const attesteringUtfall = formData.get('utfall') as AttesteringUtfall

  const behandlingApi = createBehandlingApi({ request, behandlingId })
  if (attesteringUtfall === AttesteringUtfall.GODKJENT) {
    await behandlingApi.attester()
  } else if (attesteringUtfall === AttesteringUtfall.IKKE_GODKJENT) {
    const begrunnelse = formData.get('begrunnelse') as string
    if (begrunnelse) {
      await behandlingApi.returnerTilSaksbehandler(begrunnelse)
    } else {
      throw new Error('Begrunnelse må fylles ut')
    }
  }

  return redirect(`/behandling/${behandlingId}/attestert-og-iverksatt`)
}

export default function Attestering({ loaderData }: Route.ComponentProps) {
  const { aktiviteter } = loaderData
  const { behandling } = useOutletContext<AktivitetOutletContext>()

  const components = getAllServerComponents()

  // biome-ignore lint/correctness/noNestedComponentDefinitions: <explanation>
  const AktivitetAttestering = () => {
    const [utfall, setUtfall] = React.useState<AttesteringUtfall>()

    return (
      <Box.New as="div" paddingBlock="space-48 0">
        <VStack gap="space-48">
          <Dropdown.Menu.Divider />
          <Form method="POST">
            <VStack gap="5">
              <RadioGroup legend="Beslutning" name="utfall" onChange={setUtfall}>
                <Radio size="small" value={AttesteringUtfall.GODKJENT}>
                  Godkjent
                </Radio>
                <Radio size="small" value={AttesteringUtfall.IKKE_GODKJENT}>
                  Ikke godkjent
                </Radio>
              </RadioGroup>
              {utfall === AttesteringUtfall.IKKE_GODKJENT && (
                <Textarea size="small" label="Begrunnelse" name="begrunnelse" />
              )}
              {utfall && (
                <Button size="small" type="submit">
                  {utfall === AttesteringUtfall.IKKE_GODKJENT ? 'Returner til saksbehandler' : 'Iverksett'}
                </Button>
              )}
            </VStack>
          </Form>
        </VStack>
      </Box.New>
    )
  }

  return (
    <Page.Block gutters>
      <VStack gap="5">
        <Heading level="1" size="large">
          Oppgaven er til attestering
        </Heading>

        {aktiviteter.map(aktivitet => {
          const Component = components.get(aktivitet.handlerName)

          return Component ? (
            <div id={aktivitet.handlerName} key={aktivitet.aktivitetId}>
              <Box.New padding="2">
                <HStack gap="8">
                  <VStack>
                    <Label>Vurdert av</Label>
                    <div>
                      {aktivitet.vurdertAvBrukerNavn} ({aktivitet.vurdertAvBrukerId})
                    </div>
                  </VStack>
                  <VStack>
                    <Label>Tidspunkt for vurdering</Label>
                    <div>{formatDateToNorwegian(aktivitet.vurdertTidspunkt, { showTime: true })}</div>
                  </VStack>
                </HStack>
              </Box.New>
              <div className="component-area">
                <div className="component">
                  <Component
                    readOnly={true}
                    grunnlag={aktivitet.grunnlag}
                    vurdering={aktivitet.vurdering}
                    aktivitet={aktivitet.aktivitet}
                    behandling={behandling}
                    AttesteringKomponent={<AktivitetAttestering />}
                  />
                </div>
              </div>
            </div>
          ) : null
        })}
      </VStack>
    </Page.Block>
  )
}
