import { data, redirect } from 'react-router'
import { createBehandlingApi } from '~/api/behandling-api'
import type { AktivitetAtt } from '~/api/behandling-api/types'
import { userContext } from '~/context/user-context'
import { Features } from '~/features'
import { AldeBehandlingStatus, type BehandlingDTO } from '~/types/behandling'
import { buildUrl } from '~/utils/build-url'
import { getAllServerComponents } from '~/utils/component-discovery'
import { env } from '~/utils/env.server'
import { isFeatureEnabled } from '~/utils/unleash.server'
import type { Route } from './+types'
import Attestering, { type AktivitetTilAttestering, AttesteringUtfall } from './Attestering'
import VenterAttestering from './VenterAttestering'

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
      begrunnelse: aktivitet.begrunnelse,
    }
  }

export const loader = async ({ params, request, context }: Route.LoaderArgs) => {
  const { behandlingId } = params
  const { enhet } = context.get(userContext)
  const behandlingApi = createBehandlingApi({
    request,
    behandlingId,
  })
  const behandling = await behandlingApi.hentBehandling()

  if (behandling.aldeBehandlingStatus !== AldeBehandlingStatus.VENTER_ATTESTERING) {
    return redirect(`/behandling/${behandlingId}`)
  }

  const attesteringData = await behandlingApi.hentAttesteringsdata()

  if (!attesteringData.brukerKanAttestere) {
    return {
      brukerKanAttestere: false as const,
      psakOppgaveoversiktUrl: buildUrl(env.psakOppgaveoversikt, request, {}),
    }
  }

  const notatUrl =
    attesteringData.journalpostId &&
    buildUrl(env.pennyJournalpostUrlTemplate, request, { journalpostId: attesteringData.journalpostId })

  const serverComponents = getAllServerComponents()

  const visNotat = isFeatureEnabled(Features.NOTAT, { enhet: enhet })

  const parsedData = attesteringData.aktiviter
    .map(enhanceAttesteringAktivitet(behandling))
    .filter(aktivitet => aktivitet.grunnlag || aktivitet.vurdering)
    .filter(aktivitet => aktivitet.handlerName !== 'send-til-attestering')
    .filter(aktivitet => aktivitet.handlerName !== 'attestering')
    .filter(aktivitet => aktivitet.handlerName !== 'generer-notat')
    .filter(aktivitet => aktivitet.vurdertAvBrukerId)
    .sort((a, b) => (a.vurdertTidspunkt ?? '').localeCompare(b.vurdertTidspunkt ?? ''))
    .map(aktivitet => ({
      ...aktivitet,
      hasComponent: serverComponents.has(aktivitet.handlerName),
    }))

  return {
    brukerKanAttestere: true as const,
    aktiviteter: parsedData,
    notatUrl,
    visNotat,
  }
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

export default function AttesteringRoute({ loaderData, actionData }: Route.ComponentProps) {
  if (!loaderData.brukerKanAttestere) {
    return <VenterAttestering psakOppgaveoversiktUrl={loaderData.psakOppgaveoversiktUrl} />
  }

  return (
    <Attestering
      aktiviteter={loaderData.aktiviteter}
      notatUrl={loaderData.notatUrl}
      visNotat={loaderData.visNotat}
      actionData={actionData}
    />
  )
}
