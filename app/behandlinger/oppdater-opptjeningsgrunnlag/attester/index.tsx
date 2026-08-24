import { InformationSquareIcon } from '@navikt/aksel-icons'
import { Button, Heading, InfoCard, Page, Radio, RadioGroup, VStack } from '@navikt/ds-react'
import { useState } from 'react'
import { data, Form, redirect, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import { createBehandlingApi } from '~/api/behandling-api'
import { fetchOpptjeningstyper } from '~/api/opptjeningstyper-api.server'
import styles from '~/common.module.css'
import { useIsSubmitting } from '~/hooks/use-is-submitting'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import { OppdaterOpptjeningEndringer } from '../OppdaterOpptjeningEndringer'
import type { OppdaterOpptjeningVurdering } from '../oppdater-grunnlag/oppdater-grunnlag-types'
import type { Route } from './+types'

type AttesterGrunnlag = {
  vurdering: OppdaterOpptjeningVurdering
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params
  const api = createAktivitetApi({ request, behandlingId, aktivitetId })

  const [grunnlag, opptjeningstyper] = await Promise.all([
    api.hentGrunnlagsdata<AttesterGrunnlag>(),
    fetchOpptjeningstyper(request),
  ])

  return { grunnlag, opptjeningstyper }
}

enum AttesteringUtfall {
  GODKJENN = 'GODKJENN',
  IKKE_GODKJENN = 'IKKE_GODKJENN',
}

type AttesterActionData = {
  errors?: { utfall?: string; begrunnelse?: string }
  data?: { utfall: AttesteringUtfall; begrunnelse: string }
}

export async function action({ params, request }: Route.ActionArgs) {
  const { behandlingId } = params
  const behandlingApi = createBehandlingApi({ request, behandlingId })

  const formData = await request.formData()
  const utfall = formData.get('utfall') as AttesteringUtfall

  if (utfall === AttesteringUtfall.GODKJENN) {
    await behandlingApi.attester()
    return redirect(`/behandling/${behandlingId}/attestert-og-iverksatt`)
  } else if (utfall === AttesteringUtfall.IKKE_GODKJENN) {
    const begrunnelse = formData.get('begrunnelse') as string

    if (begrunnelse) {
      await behandlingApi.returnerTilSaksbehandler(begrunnelse)
      return redirect(`/behandling/${behandlingId}/attestering-returnert-til-saksbehandler`)
    } else {
      return data<AttesterActionData>(
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

  return data<AttesterActionData>({ errors: { utfall: 'Velg et utfall' } }, { status: 400 })
}

export default function AttesterRoute({ actionData, loaderData }: Route.ComponentProps) {
  const { errors, data: actionResultData } = actionData || {}
  const { grunnlag, opptjeningstyper } = loaderData
  const { avbrytAktivitet } = useOutletContext<AktivitetOutletContext>()
  const isSubmitting = useIsSubmitting()
  const [utfall, setUtfall] = useState<string>('')
  const { vurdering } = grunnlag

  const harEndringer =
    (vurdering?.inntektEndringer?.length ?? 0) +
      (vurdering?.dagpengerEndringer?.length ?? 0) +
      (vurdering?.omsorgEndringer?.length ?? 0) +
      (vurdering?.forstegangstjenesteEndringer?.length ?? 0) >
    0

  return (
    <Page.Block gutters className={styles.page}>
      <Heading size="medium" level="2">
        Attester oppdatering av opptjeningsgrunnlag
      </Heading>

      <VStack gap="space-32">
        {harEndringer && (
          <InfoCard data-color="info">
            <InfoCard.Header icon={<InformationSquareIcon aria-hidden />}>
              <InfoCard.Title as="h3">Endringer til attestering</InfoCard.Title>
            </InfoCard.Header>
            <InfoCard.Content>Endringene vil først bli gjeldende ved godkjenning.</InfoCard.Content>
          </InfoCard>
        )}

        <OppdaterOpptjeningEndringer vurdering={vurdering} opptjeningstyper={opptjeningstyper} />

        <Form method="post">
          <VStack gap="space-24">
            <RadioGroup legend="Utfall" name="utfall" value={utfall} onChange={setUtfall} error={errors?.utfall}>
              <Radio value="GODKJENN">Godkjenn</Radio>
              <Radio value="IKKE_GODKJENN">Returner til saksbehandler</Radio>
            </RadioGroup>

            {utfall === 'IKKE_GODKJENN' && (
              <RadioGroup
                legend="Velg begrunnelse"
                name="begrunnelse"
                error={errors?.begrunnelse}
                defaultValue={actionResultData?.begrunnelse}
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

            <VStack gap="space-8" align="start">
              <Button type="submit" variant="primary" size="small" loading={isSubmitting}>
                Bekreft
              </Button>
              <Button type="button" variant="tertiary" size="small" onClick={avbrytAktivitet} disabled={isSubmitting}>
                Avbryt behandling
              </Button>
            </VStack>
          </VStack>
        </Form>
      </VStack>
    </Page.Block>
  )
}
