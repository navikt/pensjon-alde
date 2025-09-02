/** biome-ignore-all lint/correctness/useUniqueElementIds: Will fix later */
import { Button, DatePicker, Select, TextField, UNSAFE_Combobox, useDatepicker, VStack } from '@navikt/ds-react'
import { formatISO, parse } from 'date-fns'
import { Form, redirect, useLoaderData, useOutletContext } from 'react-router'
import type { LivsvarigAfpOffentligVurdering } from '~/behandlinger/alderspensjon-soknad/livsvarigAfpOffentlig-avvik/livsvarigafp-types'
import AktivitetVurderingLayout from '~/components/shared/AktivitetVurderingLayout'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import { createAktivitetApi } from '~/utils/aktivitet-api'
import { useFetch } from '~/utils/use-fetch/use-fetch'
import type { Route } from '../../../../.react-router/types/app/behandlinger/alderspensjon-soknad/vurder-samboer/+types'

export default function LivsvarigAfpOffentligAvvik() {
  const { tpliste } = useLoaderData<typeof loader>()

  const { datepickerProps, inputProps } = useDatepicker({
    required: true,
  })
  const { aktivitet } = useOutletContext<AktivitetOutletContext>()

  const sidebar = (
    <Form method="post">
      <VStack gap="4">
        <UNSAFE_Combobox name="tpnr" id="tpnr" label="TP nummer:" options={tpliste} />
        <TextField name="belop" id="belop" label="Månedsbeløp:" />
        <Select name="status" id="status" label="Status:" defaultValue="INNVILGET">
          <option value="INNVILGET">INNVILGET</option>
        </Select>
        <DatePicker {...datepickerProps}>
          <DatePicker.Input name="fom" {...inputProps} label="Dato Fom:" />
        </DatePicker>
        <Button type="submit">Lagre</Button>
        <Button type="button" variant="secondary">
          Avbryt
        </Button>
      </VStack>
    </Form>
  )
  return (
    <AktivitetVurderingLayout
      aktivitet={aktivitet}
      detailsTitle="Avviksdetaljer:"
      detailsContent={'Hent info fra aktivitet'}
      sidebar={sidebar}
    />
  )
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params

  // biome-ignore lint/correctness/noUnusedVariables: Will add soon
  const api = createAktivitetApi({
    request,
    behandlingId,
    aktivitetId,
  })

  const tpliste = ['3010', '3020', '3030']
  return { tpliste: tpliste }
}

export async function action({ params, request }: Route.ActionArgs) {
  const formData = await request.formData()
  console.log(formData)

  const virkFomString = formData.get('dato') as string
  const virkFomDate = virkFomString ? parse(virkFomString, 'dd.MM.yyyy', new Date()) : new Date()

  const vurdering: LivsvarigAfpOffentligVurdering = {
    datoFom: formatISO(virkFomDate, { representation: 'date' }), // ISO-dato (LocalDate)
    belop: formData.get('belop') !== null ? Number(formData.get('belop')) : undefined,
    tpnr: formData.get('tpnr') !== null ? Number(formData.get('tpnr')) : undefined,
    status: formData.get('status') as string,
  }

  // Post to the API
  const penUrl = `${process.env.PEN_URL!}/api/saksbehandling/alde`
  const response = await useFetch(
    request,
    `${penUrl}/behandling/${params.behandlingId}/aktivitet/${params.aktivitetId}/vurdering`,
    {
      method: 'POST',
      body: JSON.stringify({ data: vurdering }),
    },
  )

  console.log('response', response)
  return redirect(`/behandling/${params.behandlingId}`)
}
