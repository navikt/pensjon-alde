import { PersonIcon } from '@navikt/aksel-icons'
import {
  BodyShort,
  Button,
  DatePicker,
  Heading,
  HGrid,
  HStack,
  InlineMessage,
  Radio,
  RadioGroup,
  useDatepicker,
  VStack,
} from '@navikt/ds-react'
import { isAfter, startOfDay } from 'date-fns'
import { useState } from 'react'
import { data, Form, redirect, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import { Fnr } from '~/components/Fnr'
import AktivitetVurderingLayout from '~/components/shared/AktivitetVurderingLayout'
import BegrunnelseField from '~/components/shared/BegrunnelseField'
import { userContext } from '~/context/user-context'
import { Features } from '~/features'
import { useIsSubmitting } from '~/hooks/use-is-submitting'
import type { AktivitetComponentProps, FormErrors } from '~/types/aktivitet-component'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import { formatDateToNorwegian, parseDate } from '~/utils/date'
import { dateInput, parseForm, radiogroup, string } from '~/utils/parse-form'
import { isFeatureEnabled } from '~/utils/unleash.server'
import type { Route } from './+types'
import AddressBlock from './AddressBlock/AddressBlock'
import AddressWrapper from './AddressWrapper/AddressWrapper'
import type { SamboerVurdering, VurderSamboerGrunnlag } from './samboer-types'

export function meta() {
  return [{ title: `Samboervurdering` }, { name: 'description', content: 'Samboervurdering' }]
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params

  const api = createAktivitetApi({
    request,
    behandlingId,
    aktivitetId,
  })

  const grunnlag = await api.hentGrunnlagsdata<VurderSamboerGrunnlag>()
  const vurdering = await api.hentVurdering<SamboerVurdering>()

  const { enhet } = context.get(userContext)
  const visNotat = isFeatureEnabled(Features.NOTAT, { enhet: enhet })
  return {
    readOnly: false,
    samboerInformasjon: grunnlag,
    vurdering,
    visNotat,
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
    // TODO: Rydd opp string parsing
    begrunnelse: string,
    vurdering: radiogroup({
      SAMBOER_1_5: 'SAMBOER_1_5',
      SAMBOER_3_2: 'SAMBOER_3_2',
      IKKE_SAMBOER: 'IKKE_SAMBOER',
    }),
  })

  const errors: FormErrors<SamboerVurdering> = {}

  if (parsedForm.vurdering === null) {
    errors.vurdering = 'Du må velge et alternativ'
  }

  if (!parsedForm.samboerFra) {
    errors.samboerFra = 'Du må skrive en dato, f.eks. på denne måten: ddmmåååå'
  }

  if (parsedForm.samboerFra) {
    const samboerFraDate = parseDate(parsedForm.samboerFra)
    if (samboerFraDate && isAfter(startOfDay(samboerFraDate), startOfDay(new Date()))) {
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
  const { samboerInformasjon, vurdering, readOnly, visNotat } = loaderData
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
      visNotat={visNotat}
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
  begrunnelse,
  visNotat,
}: AktivitetComponentProps<VurderSamboerGrunnlag, SamboerVurdering>) {
  const defaultVurdering = vurdering?.vurdering ?? ''
  const [selectedVurdering, setSelectedVurdering] = useState(defaultVurdering)
  const isSubmitting = useIsSubmitting()

  const { inputProps, datepickerProps } = useDatepicker({
    defaultSelected: vurdering?.samboerFra ? new Date(vurdering.samboerFra) : undefined,
    required: true,
  })

  const { samboer, sokersBostedsadresser, soknad, kravOnsketVirkningsdato } = grunnlag

  const sidebar = (
    <div>
      <Form
        method="post"
        className="decision-form"
        autoComplete="off"
        onReset={() => setSelectedVurdering(defaultVurdering)}
      >
        <div className="samboer-assessment">
          <VStack gap="space-24">
            <RadioGroup
              legend="Vurder samboerskap"
              name="vurdering"
              value={selectedVurdering}
              readOnly={readOnly}
              size="small"
              error={errors?.vurdering}
              onChange={setSelectedVurdering}
            >
              <Radio value="SAMBOER_3_2">§ 3-2 samboer</Radio>
              <Radio value="SAMBOER_1_5">§ 1-5 samboer</Radio>
              <Radio value="IKKE_SAMBOER">Ikke samboer (§ 3-2 samboer frem i tid)</Radio>
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

            {selectedVurdering === 'IKKE_SAMBOER' && (
              <InlineMessage status="info" size="small">
                Ved innvilgelse: Vedtaksbrevet opplyser at søker regnes som enslig og får nytt vedtak etter 12 måneder
                som samboer.
              </InlineMessage>
            )}

            {visNotat && <BegrunnelseField readOnly={readOnly} defaultValue={begrunnelse} />}

            {errors?._form && (
              <InlineMessage status="error" className="mb-4">
                {errors._form}
              </InlineMessage>
            )}

            {!readOnly && (
              <VStack gap="space-12">
                <Button type="submit" variant="primary" size="small" loading={isSubmitting}>
                  Fortsett behandling
                </Button>

                <Button type="reset" variant="tertiary" size="small" onClick={avbrytAktivitet} disabled={isSubmitting}>
                  Avbryt del-auto behandling
                </Button>
              </VStack>
            )}
          </VStack>
        </div>
      </Form>
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
          <HStack align="center">
            <Fnr value={samboer.fnr} />
          </HStack>
          {samboer.navn.etternavn.toUpperCase()}, {samboer.navn.fornavn} {samboer.navn.mellomnavn}
        </VStack>
      </AktivitetVurderingLayout.Section>
      <AktivitetVurderingLayout.Section>
        <HStack gap="space-32">
          <VStack gap="space-4">
            <Heading level="2" size="xsmall">
              Brukeroppgitte opplysninger
            </Heading>

            {soknad ? (
              <>
                <HStack gap="space-4">
                  Tidligere gift med hverandre:{' '}
                  <BodyShort weight="semibold">{soknad.tidligereEktefelle ? 'Ja' : 'Nei'}</BodyShort>
                </HStack>

                <HStack gap="space-4">
                  Felles barn:{' '}
                  <BodyShort weight="semibold">{soknad.harEllerHarHattFellesBarn ? 'Ja' : 'Nei'}</BodyShort>
                </HStack>

                <HStack gap="space-4">
                  Dato for samboerskap:{' '}
                  <BodyShort weight="semibold">{formatDateToNorwegian(soknad.datoForSamboerskap)}</BodyShort>
                </HStack>
              </>
            ) : (
              'Ingen søknadsdata'
            )}
          </VStack>

          <VStack gap="space-4">
            <Heading size="xsmall" level="2">
              Opplysninger fra vårt register
            </Heading>
            <HStack gap="space-4">
              Tidligere gift med hverandre:{' '}
              <BodyShort weight="semibold">{samboer.tidligereEktefelle ? 'Ja' : 'Nei'}</BodyShort>
            </HStack>
            <HStack gap="space-4">
              Felles barn:{' '}
              <BodyShort weight="semibold">
                {samboer.harEllerHarHattFellesBarn ? 'Ja' : 'Nei'}
                {samboer.harEllerHarHattFellesBarn &&
                  samboer.fodselsdatoEldsteBarn &&
                  `, første født ${formatDateToNorwegian(samboer.fodselsdatoEldsteBarn)}`}
              </BodyShort>
            </HStack>

            {grunnlag.sokerSivilstand && (
              <HStack gap="space-4">
                Søkers sivilstand: <BodyShort weight="semibold">{grunnlag.sokerSivilstand}</BodyShort>
              </HStack>
            )}
          </VStack>
        </HStack>
      </AktivitetVurderingLayout.Section>
      <AktivitetVurderingLayout.Section>
        <HGrid gap="space-32" columns={{ xs: 1, sm: 2 }} maxWidth="1024px">
          <AddressWrapper
            title="Samboers bostedsadresser"
            description="Viser 18 måneder og 1 dag før virkningstidspunktet, fra Folkeregisteret. "
          >
            {samboer.bostedsadresser.length > 0 ? (
              <AddressBlock bostedadresser={samboer.bostedsadresser} />
            ) : (
              <InlineMessage status="info">Ingen bostedsadresser funnet.</InlineMessage>
            )}
          </AddressWrapper>

          <AddressWrapper
            title="Søkers bostedsadresser"
            description="Viser 18 måneder og 1 dag før virkningstidspunktet, fra Folkeregisteret. "
          >
            {sokersBostedsadresser.length > 0 ? (
              <AddressBlock bostedadresser={sokersBostedsadresser} />
            ) : (
              <InlineMessage status="info">Ingen bostedsadresser funnet.</InlineMessage>
            )}
          </AddressWrapper>
        </HGrid>
      </AktivitetVurderingLayout.Section>
    </AktivitetVurderingLayout>
  )
}

export const Component = VurdereSamboerComponent
