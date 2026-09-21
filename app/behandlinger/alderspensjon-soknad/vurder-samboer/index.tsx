import type { SubmissionResult } from '@conform-to/react'
import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4'
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
import { format, isValid, parse } from 'date-fns'
import { data, Form, redirect, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import { Fnr } from '~/components/Fnr'
import AktivitetVurderingLayout from '~/components/shared/AktivitetVurderingLayout'
import BegrunnelseField from '~/components/shared/BegrunnelseField'
import { userContext } from '~/context/user-context'
import { Features } from '~/features'
import { useIsSubmitting } from '~/hooks/use-is-submitting'
import type { AktivitetComponentProps } from '~/types/aktivitet-component'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import { formatDateToNorwegian } from '~/utils/date'
import { isFeatureEnabled } from '~/utils/unleash.server'
import type { Route } from './+types'
import AddressBlock from './AddressBlock/AddressBlock'
import AddressWrapper from './AddressWrapper/AddressWrapper'
import { DATO_FORMAT, type SamboerVurderingInput, samboerVurderingSchema } from './samboer-schema'
import type { SamboerVurderingRespons, VurderSamboerGrunnlag } from './samboer-types'
import { normaliserSamboerVurdering, tilSamboerVurderingPayload } from './samboer-vurdering'

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
  const vurdering = await api.hentVurdering<SamboerVurderingRespons>()

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

  const submission = parseWithZod(formData, { schema: samboerVurderingSchema })

  if (submission.status !== 'success') {
    return data({ result: submission.reply() }, { status: 400 })
  }

  try {
    await api.lagreVurdering(tilSamboerVurderingPayload(submission.value))
    return redirect(`/behandling/${behandlingId}?justCompleted=${aktivitetId}`)
  } catch {
    return data(
      {
        result: submission.reply({
          formErrors: ['Det oppstod en feil ved lagring av vurderingen'],
        }),
      },
      { status: 500 },
    )
  }
}

export default function VurderSamboerRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { samboerInformasjon, vurdering, readOnly, visNotat } = loaderData

  const { aktivitet, behandling, avbrytAktivitet } = useOutletContext<AktivitetOutletContext>()

  return (
    <VurdereSamboerComponent
      readOnly={readOnly}
      grunnlag={samboerInformasjon}
      vurdering={vurdering}
      aktivitet={aktivitet}
      behandling={behandling}
      avbrytAktivitet={avbrytAktivitet}
      lastResult={actionData?.result}
      visNotat={visNotat}
    />
  )
}

type VurdereSamboerComponentProps = AktivitetComponentProps<VurderSamboerGrunnlag, SamboerVurderingRespons> & {
  lastResult?: SubmissionResult | null
}

function VurdereSamboerComponent({
  grunnlag,
  aktivitet,
  vurdering,
  readOnly,
  avbrytAktivitet,
  lastResult,
  begrunnelse,
  visNotat,
}: VurdereSamboerComponentProps) {
  const isSubmitting = useIsSubmitting()

  const { samboer, sokersBostedsadresser, soknad, kravOnsketVirkningsdato } = grunnlag

  const normalisertVurdering = normaliserSamboerVurdering(vurdering)

  const [form, fields] = useForm<SamboerVurderingInput>({
    lastResult,
    constraint: getZodConstraint(samboerVurderingSchema),
    shouldValidate: 'onSubmit',
    shouldRevalidate: 'onBlur',
    defaultValue: {
      samboerFnr: samboer.fnr,
      samboerType: normalisertVurdering?.samboerType,
      samboerFra: normalisertVurdering?.samboerFra
        ? format(new Date(normalisertVurdering.samboerFra), DATO_FORMAT)
        : '',
      begrunnelse: begrunnelse ?? normalisertVurdering?.begrunnelse ?? '',
    },
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: samboerVurderingSchema })
    },
  })

  const initialSamboerFra = parse(fields.samboerFra.initialValue ?? '', DATO_FORMAT, new Date())

  const { inputProps, datepickerProps } = useDatepicker({
    defaultSelected: isValid(initialSamboerFra) ? initialSamboerFra : undefined,
  })

  const skjulteFeil = [...(form.errors ?? []), ...(fields.samboerFnr.errors ?? [])]

  const sidebar = (
    <div>
      <Form method="post" className="decision-form" autoComplete="off" {...getFormProps(form)}>
        <div className="samboer-assessment">
          <VStack gap="space-24">
            <input type="hidden" name={fields.samboerFnr.name} defaultValue={fields.samboerFnr.initialValue} />
            <RadioGroup
              legend="Vurder samboerskap"
              name={fields.samboerType.name}
              defaultValue={fields.samboerType.initialValue}
              readOnly={readOnly}
              size="small"
              error={fields.samboerType.errors?.[0]}
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
                name={fields.samboerFra.name}
                error={fields.samboerFra.errors?.[0]}
              />
            </DatePicker>

            {fields.samboerType.value === 'IKKE_SAMBOER' && (
              <InlineMessage status="info" size="small">
                Ved innvilgelse: Vedtaksbrevet opplyser at søker regnes som enslig og får nytt vedtak etter 12 måneder
                som samboer.
              </InlineMessage>
            )}

            {visNotat && <BegrunnelseField readOnly={readOnly} defaultValue={fields.begrunnelse.initialValue} />}

            {skjulteFeil.length > 0 && (
              <InlineMessage status="error" className="mb-4">
                {skjulteFeil[0]}
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
