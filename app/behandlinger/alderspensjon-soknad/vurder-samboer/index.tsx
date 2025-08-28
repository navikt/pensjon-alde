import {
  Button,
  Checkbox,
  DatePicker,
  ErrorSummary,
  Loader,
  useDatepicker
} from '@navikt/ds-react'
import { formatISO, parse } from 'date-fns'
import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  useOutletContext
} from 'react-router'
import AktivitetVurderingLayout from '~/components/shared/AktivitetVurderingLayout'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import { useFetch } from '~/utils/use-fetch'
import { type ValidationError, validateSamboerForm } from '~/utils/validation'
import type { Route } from './+types'
import type {
  SamboerInformasjonHolder,
  SamboerVurdering,
  Vurdering
} from './samboer-types'

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingsId, aktivitetId } = params

  const penUrl = `${process.env.PEN_URL!}/api/saksbehandling/alde`

  const grunnlag = await useFetch(
    request,
    `${penUrl}/behandling/${behandlingsId}/aktivitet/${aktivitetId}/grunnlagsdata`
  )

  const vurdering = await useFetch(
    request,
    `${penUrl}/behandling/${behandlingsId}/aktivitet/${aktivitetId}/vurdering`
  )
  let parsedGrunnlag:
    | { samboerInformasjon: SamboerInformasjonHolder }
    | undefined
  if (grunnlag.ok) {
    parsedGrunnlag = (await grunnlag.json()) as {
      samboerInformasjon: SamboerInformasjonHolder
    }
  }

  let parsedVurdering = null
  if (vurdering.ok) {
    parsedVurdering = (await vurdering.json()) as SamboerVurdering
  } else if (vurdering.status === 404) {
    parsedVurdering = null
  }

  return {
    samboerInformasjon: parsedGrunnlag?.samboerInformasjon,
    vurdering: parsedVurdering
  }
}

export async function action({
  params,
  request
}: {
  params: { behandlingsId: string; aktivitetId: string }
  request: Request
}) {
  const { behandlingsId, aktivitetId } = params
  const formData = await request.formData()

  // Validate form data
  const validationErrors = validateSamboerForm(formData)
  if (validationErrors.length > 0) {
    return {
      errors: validationErrors,
      formData: Object.fromEntries(formData.entries())
    }
  }

  const virkFomString = formData.get('virkFom') as string
  const virkFomDate = virkFomString
    ? parse(virkFomString, 'dd.MM.yyyy', new Date())
    : new Date()

  const vurdering: SamboerVurdering = {
    virkFom: formatISO(virkFomDate, { representation: 'date' }),
    tidligereEktefeller: formData.get('tidligereEktefeller') === 'on',
    harFellesBarn: formData.get('harFellesBarn') === 'on',
    vurdert: (formData.get('vurdert') as Vurdering) || 'VURDERT'
  }

  // Post to the API
  const penUrl = `${process.env.PEN_URL!}/api/saksbehandling/alde`

  // biome-ignore lint/correctness/useHookAtTopLevel: Not really a hook, consider refactoring
  const response = await useFetch(
    request,
    `${penUrl}/behandling/${behandlingsId}/aktivitet/${aktivitetId}/vurdering`,

    {
      method: 'POST',
      body: JSON.stringify({ data: vurdering })
    }
  )

  if (!response.ok) {
    const errorMessage =
      response.status === 400
        ? 'Ugyldig data sendt til server. Sjekk at alle felt er riktig utfylt.'
        : response.status === 403
          ? 'Du har ikke tilgang til å utføre denne handlingen.'
          : response.status === 500
            ? 'Det oppstod en serverfeil. Prøv igjen senere.'
            : `Kunne ikke lagre samboer vurdering. Feilkode: ${response.status}`

    throw new Error(errorMessage)
  }

  // Redirect back to the aktivitet to trigger loader revalidation
  return redirect(`/behandling/${behandlingsId}`)
}

export default function VurdereSamboer() {
  const { samboerInformasjon, vurdering } = useLoaderData<typeof loader>()
  const { aktivitet } = useOutletContext<AktivitetOutletContext>()
  const navigation = useNavigation()
  const actionData = useActionData<{
    errors?: ValidationError[]
    formData?: Record<string, unknown>
  }>()

  const isSubmitting = navigation.state === 'submitting'
  const hasErrors = actionData?.errors && actionData.errors.length > 0

  const { datepickerProps, inputProps } = useDatepicker(
    vurdering?.virkFom ? { defaultSelected: new Date(vurdering.virkFom) } : {}
  )
  const detailsContent = (
    <>
      {vurdering && (
        <div>
          <p>
            <strong>Virkningstidspunkt fra:</strong>{' '}
            {vurdering.virkFom
              ? new Date(vurdering.virkFom).toLocaleDateString('no-NO')
              : 'Ikke satt'}
          </p>
          <p>
            <strong>Tidligere ektefeller:</strong>{' '}
            {vurdering.tidligereEktefeller ? 'Ja' : 'Nei'}
          </p>
          <p>
            <strong>Har felles barn:</strong>{' '}
            {vurdering.harFellesBarn ? 'Ja' : 'Nei'}
          </p>
          <p>
            <strong>Status:</strong> {vurdering.vurdert}
          </p>
        </div>
      )}
      {samboerInformasjon && (
        <div>
          <p>
            <strong>Samboer informasjon tilgjengelig</strong>
          </p>
          <details>
            <summary>Vis rå data</summary>
            <pre>{JSON.stringify(samboerInformasjon, null, 2)}</pre>
          </details>
        </div>
      )}
      {!vurdering && !samboerInformasjon && <p>Ingen data tilgjengelig</p>}
    </>
  )

  const sidebar = (
    <Form method="post" className="decision-form">
      {hasErrors && (
        <ErrorSummary heading="Du må rette følgende feil:">
          {actionData.errors?.map(error => (
            <ErrorSummary.Item key={error.field} href={`#${error.field}`}>
              {error.message}
            </ErrorSummary.Item>
          ))}
        </ErrorSummary>
      )}

      {isSubmitting && (
        <div style={{ marginBottom: '1rem' }}>
          <Loader size="medium" title="Lagrer vurdering..." />
        </div>
      )}

      <div className="checkbox-group">
        <DatePicker {...datepickerProps}>
          {/** biome-ignore lint/correctness/useUniqueElementIds: form field needs static id for validation error linking */}
          <DatePicker.Input
            {...inputProps}
            id="virkFom"
            label="Virkningstidspunkt fra"
            name="virkFom"
            disabled={isSubmitting}
            error={
              actionData?.errors?.find(e => e.field === 'virkFom')?.message
            }
            defaultValue={
              (actionData?.formData?.virkFom as string) ||
              (vurdering?.virkFom
                ? new Date(vurdering.virkFom)
                    .toLocaleDateString('no-NO', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })
                    .replace(/\./g, '.')
                : '')
            }
          />
        </DatePicker>

        <Checkbox
          name="tidligereEktefeller"
          disabled={isSubmitting}
          defaultChecked={vurdering?.tidligereEktefeller}
        >
          Tidligere ektefelle/r med søker
        </Checkbox>

        <Checkbox
          name="harFellesBarn"
          disabled={isSubmitting}
          defaultChecked={vurdering?.harFellesBarn}
        >
          Har felles barn med søker
        </Checkbox>
      </div>

      <div className="button-group">
        <Button
          type="submit"
          name="vurdert"
          value="VURDERT"
          variant="primary"
          disabled={isSubmitting}
          loading={
            isSubmitting && navigation.formData?.get('vurdert') === 'VURDERT'
          }
        >
          {isSubmitting && navigation.formData?.get('vurdert') === 'VURDERT'
            ? 'Lagrer...'
            : 'Vurder'}
        </Button>
        <Button
          type="submit"
          name="vurdert"
          value="AVBRUTT"
          variant="danger"
          disabled={isSubmitting}
          loading={
            isSubmitting && navigation.formData?.get('vurdert') === 'AVBRUTT'
          }
        >
          {isSubmitting && navigation.formData?.get('vurdert') === 'AVBRUTT'
            ? 'Lagrer...'
            : 'Avvis'}
        </Button>
      </div>
    </Form>
  )

  return (
    <AktivitetVurderingLayout
      title="Vurdere samboer"
      aktivitet={aktivitet}
      detailsTitle="Samboerforhold detaljer:"
      detailsContent={detailsContent}
      sidebar={sidebar}
    />
  )
}
