import { Button, Checkbox, DatePicker, useDatepicker } from '@navikt/ds-react'
import { type ActionFunction, Form, type LoaderFunction, redirect, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import AktivitetVurderingLayout from '~/components/shared/AktivitetVurderingLayout'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import { checkbox, dateInput, parseForm } from '~/utils/parse-form'
import type { Route } from './+types'
import type { SamboerInformasjonHolder, SamboerVurdering } from './samboer-types'

export const loader: LoaderFunction = async ({ params, request }) => {
  const { behandlingId, aktivitetId } = params

  const api = createAktivitetApi({
    request,
    behandlingId,
    aktivitetId,
  })

  const grunnlag = await api.hentGrunnlagsdata<{
    samboerInformasjon: SamboerInformasjonHolder
  }>()

  const vurdering = await api.hentVurdering<SamboerVurdering>()

  return {
    samboerInformasjon: grunnlag?.samboerInformasjon,
    vurdering,
  }
}

export const action: ActionFunction = async ({ params, request }) => {
  const { behandlingId, aktivitetId } = params
  const api = createAktivitetApi({ request, aktivitetId, behandlingId })
  const formData = await request.formData()

  const vurdering = parseForm<SamboerVurdering>(formData, {
    virkFom: dateInput,
    tidligereEktefeller: checkbox,
    harFellesBarn: checkbox,
  })

  try {
    console.log('vurdering', vurdering)
    await api.lagreVurdering<SamboerVurdering>(vurdering)
    return redirect(`/behandling/${behandlingId}?justCompleted=${aktivitetId}`)
  } catch (error) {
    console.error(error)
  }
}

export default function VurdereSamboer({ loaderData }: Route.ComponentProps) {
  const { samboerInformasjon, vurdering } = loaderData
  const { datepickerProps, inputProps } = useDatepicker({
    defaultSelected: undefined,
    required: true,
  })

  const { aktivitet } = useOutletContext<AktivitetOutletContext>()
  const detailsContent = (
    <>
      <pre>{JSON.stringify(vurdering, null, 2)}</pre>
      <pre>{JSON.stringify(samboerInformasjon, null, 2)}</pre>
    </>
  )

  const sidebar = (
    <Form method="post" className="decision-form">
      <div className="checkbox-group">
        <DatePicker {...datepickerProps}>
          <DatePicker.Input {...inputProps} label="Virkningstidspunkt fra" name="virkFom" />
        </DatePicker>

        <Checkbox name="tidligereEktefeller">Tidligere ektefelle/r med søker</Checkbox>

        <Checkbox name="harFellesBarn">Har felles barn med søker</Checkbox>
      </div>

      <div className="button-group">
        <Button type="submit" name="vurdert" value="VURDERT" variant="primary">
          Vurder
        </Button>
        <Button type="submit" name="vurdert" value="AVBRUTT" variant="danger">
          Avvis
        </Button>
      </div>
    </Form>
  )

  return (
    <AktivitetVurderingLayout
      aktivitet={aktivitet}
      detailsTitle="Samboerforhold detaljer:"
      detailsContent={detailsContent}
      sidebar={sidebar}
    />
  )
}
