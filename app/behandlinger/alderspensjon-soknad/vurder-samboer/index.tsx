import { PersonIcon } from '@navikt/aksel-icons'
import {
  Alert,
  BodyShort,
  Button,
  DatePicker,
  Heading,
  HGrid,
  HStack,
  Radio,
  RadioGroup,
  useDatepicker,
  VStack,
} from '@navikt/ds-react'
import { data, Form, redirect, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import { Fnr } from '~/components/Fnr'
import AktivitetVurderingLayout from '~/components/shared/AktivitetVurderingLayout'
import type { AktivitetComponentProps, FormErrors } from '~/types/aktivitet-component'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import { formatDateToNorwegian } from '~/utils/date'
import { dateInput, parseForm, radiogroup } from '~/utils/parse-form'
import type { Route } from './+types'
import AddressBlock from './AddressBlock/AddressBlock'
import AddressWrapper from './AddressWrapper/AddressWrapper'
import type { SamboerVurdering, VurderSamboerGrunnlag } from './samboer-types'

export function meta() {
  return [{ title: `Samboervurdering` }, { name: 'description', content: 'Samboervurdering' }]
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params

  const api = createAktivitetApi({
    request,
    behandlingId,
    aktivitetId,
  })

  const grunnlag = await api.hentGrunnlagsdata<VurderSamboerGrunnlag>()

  const vurdering = await api.hentVurdering<SamboerVurdering>()

  return {
    readOnly: false,
    samboerInformasjon: grunnlag,
    vurdering,
  }
}

export async function action({ params, request }: Route.ActionArgs) {
  const { behandlingId, aktivitetId } = params
  const api = createAktivitetApi({
    request,
    behandlingId,
    aktivitetId,
  })
  const formData = await request.formData()

  const parsedForm = parseForm<SamboerVurdering>(formData, {
    samboerFra: dateInput,
    vurdering: radiogroup({
      SAMBOER_1_5: 'SAMBOER_1_5',
      SAMBOER_3_2: 'SAMBOER_3_2',
      IKKE_SAMBOER: 'IKKE_SAMBOER',
    }),
  })

  const errors: FormErrors<SamboerVurdering> = {}

  if (parsedForm.vurdering === null) {
    errors.vurdering = 'Påkrevd'
  }

  if (!parsedForm.samboerFra) {
    errors.samboerFra = 'Påkrevd'
  }

  if (parsedForm.samboerFra) {
    const today = new Date()
    if (new Date(parsedForm.samboerFra) > today) {
      errors.samboerFra = 'Dato kan ikke være etter dagens dato'
    }
  }

  if (Object.keys(errors).length > 0) {
    return data({ errors }, { status: 400 })
  }

  try {
    await api.lagreVurdering(parsedForm)
    return redirect(`/behandling/${behandlingId}?justCompleted=${aktivitetId}`)
  } catch {
    return data(
      {
        errors: {
          _form: 'Det oppstod en feil ved lagring av vurderingen',
        } as FormErrors<SamboerVurdering>,
      },
      { status: 500 },
    )
  }
}

export default function VurderSamboerRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { samboerInformasjon, vurdering, readOnly } = loaderData
  const { errors } = actionData || {}

  const { aktivitet, behandling, avbrytAktivitet } = useOutletContext<AktivitetOutletContext>()

  return (
    <VurdereSamboerComponent
      readOnly={readOnly}
      grunnlag={samboerInformasjon}
      vurdering={vurdering}
      aktivitet={aktivitet}
      behandling={behandling}
      avbrytAktivitet={avbrytAktivitet}
      errors={errors}
      AttesteringKomponent={null}
    />
  )
}

function VurdereSamboerComponent({
  grunnlag,
  aktivitet,
  vurdering,
  readOnly,
  avbrytAktivitet,
  errors,
  AttesteringKomponent,
}: AktivitetComponentProps<VurderSamboerGrunnlag, SamboerVurdering>) {
  const { inputProps, datepickerProps } = useDatepicker({
    defaultSelected: vurdering?.samboerFra ? new Date(vurdering.samboerFra) : undefined,
    required: true,
  })

  const { samboer, sokersBostedsadresser, soknad, kravOnsketVirkningsdato } = grunnlag

  const sidebar = (
    <div>
      <Form method="post" className="decision-form" autoComplete="off">
        <div className="samboer-details"></div>

        <div className="samboer-assessment">
          <VStack gap="6">
            <RadioGroup
              legend="Vurder samboerskap"
              name="vurdering"
              defaultValue={vurdering?.vurdering}
              readOnly={readOnly}
              size="small"
              error={errors?.vurdering}
            >
              <Radio value="SAMBOER_3_2">§ 3-2 samboer</Radio>
              <Radio value="SAMBOER_1_5">§ 1-5 samboer</Radio>
              <Radio value="IKKE_SAMBOER">Ikke samboer</Radio>
            </RadioGroup>

            <DatePicker dropdownCaption {...datepickerProps}>
              <DatePicker.Input
                {...inputProps}
                size="small"
                readOnly={readOnly}
                label="Fra og med"
                name="samboerFra"
                error={errors?.samboerFra}
              />
            </DatePicker>

            {/*<Textarea
            readOnly={readOnly}
            label="Kommentar samboervurdering"
            description="Kun ved behov for tilleggsopplysninger"
            rows={4}
          />*/}

            {errors?._form && (
              <Alert variant="error" className="mb-4">
                {errors._form}
              </Alert>
            )}

            {!readOnly && (
              <VStack gap="3">
                <Button type="submit" variant="primary" size="small">
                  Lagre vurdering
                </Button>

                <Button type="reset" variant="secondary" size="small" onClick={avbrytAktivitet}>
                  Avbryt behandling i pilot
                </Button>
              </VStack>
            )}
          </VStack>
        </div>
      </Form>
      {AttesteringKomponent}
    </div>
  )

  return (
    <AktivitetVurderingLayout aktivitet={aktivitet} sidebar={sidebar}>
      <AktivitetVurderingLayout.Section>
        <VStack>
          <Heading size={'xsmall'} level="2">
            Søkt om alderspensjon fra
          </Heading>
          {formatDateToNorwegian(kravOnsketVirkningsdato)}
        </VStack>
      </AktivitetVurderingLayout.Section>

      <AktivitetVurderingLayout.Section>
        <VStack>
          <Heading size="xsmall" level="2">
            <PersonIcon /> Samboer
          </Heading>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Fnr value={samboer.fnr} />
          </div>
          {samboer.navn.etternavn.toUpperCase()}, {samboer.navn.fornavn} {samboer.navn.mellomnavn}
        </VStack>
      </AktivitetVurderingLayout.Section>

      <AktivitetVurderingLayout.Section>
        <HStack gap="8">
          <VStack gap="1">
            <Heading level="2" size="xsmall">
              Brukeroppgitte opplysninger
            </Heading>

            {soknad ? (
              <>
                <HStack gap="1">
                  Tidligere gift med hverandre:{' '}
                  <BodyShort weight="semibold">{soknad.tidligereEktefelle ? 'Ja' : 'Nei'}</BodyShort>
                </HStack>

                <HStack gap="1">
                  Felles barn:{' '}
                  <BodyShort weight="semibold">{soknad.harEllerHarHattFellesBarn ? 'Ja' : 'Nei'}</BodyShort>
                </HStack>

                <HStack gap="1">
                  Dato for samboerskap:{' '}
                  <BodyShort weight="semibold">{formatDateToNorwegian(soknad.datoForSamboerskap)}</BodyShort>
                </HStack>
              </>
            ) : (
              'Ingen søknadsdata'
            )}
          </VStack>

          <VStack gap="1">
            <Heading size="xsmall" level="2">
              Opplysninger fra vårt register
            </Heading>
            <HStack gap="1">
              Tidligere gift med hverandre:{' '}
              <BodyShort weight="semibold">{samboer.tidligereEktefelle ? 'Ja' : 'Nei'}</BodyShort>
            </HStack>
            <HStack gap="1">
              Felles barn: <BodyShort weight="semibold">{samboer.harEllerHarHattFellesBarn ? 'Ja' : 'Nei'}</BodyShort>
            </HStack>
          </VStack>
        </HStack>
      </AktivitetVurderingLayout.Section>

      <AktivitetVurderingLayout.Section>
        <HGrid gap="8" columns={{ xs: 1, sm: 2 }} maxWidth="1024px">
          <AddressWrapper
            title="Samboers bostedsadresser"
            description="Viser 18 måneder og 1 dag før virkningstidspunktet, fra Folkeregisteret. "
          >
            {samboer.bostedsadresser.length > 0 ? (
              <AddressBlock bostedadresser={samboer.bostedsadresser} />
            ) : (
              <Alert variant="info">Ingen bostedsadresser funnet.</Alert>
            )}
          </AddressWrapper>

          <AddressWrapper
            title="Søkers bostedsadresser"
            description="Viser 18 måneder og 1 dag før virkningstidspunktet, fra Folkeregisteret. "
          >
            {sokersBostedsadresser.length > 0 ? (
              <AddressBlock bostedadresser={sokersBostedsadresser} />
            ) : (
              <Alert variant="info">Ingen bostedsadresser funnet.</Alert>
            )}
          </AddressWrapper>
        </HGrid>
      </AktivitetVurderingLayout.Section>
    </AktivitetVurderingLayout>
  )
}

export const Component = VurdereSamboerComponent
