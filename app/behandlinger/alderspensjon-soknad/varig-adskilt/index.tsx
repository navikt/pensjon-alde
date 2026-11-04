import type { SubmissionResult } from '@conform-to/react'
import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4'
import { PersonIcon } from '@navikt/aksel-icons'
import {
  Alert,
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
import { createBehandlingApi } from '~/api/behandling-api'
import type { ToppbarInfo } from '~/api/behandling-api/types'
import { Fnr } from '~/components/Fnr'
import AktivitetVurderingLayout from '~/components/shared/AktivitetVurderingLayout'
import BegrunnelseField from '~/components/shared/BegrunnelseField'
import { userContext } from '~/context/user-context'
import { Features } from '~/features'
import { useIsSubmitting } from '~/hooks/use-is-submitting'
import type { AktivitetComponentProps } from '~/types/aktivitet-component'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import { formatDateToNorwegian } from '~/utils/date/formatDateToNorwegian'
import { isFeatureEnabled } from '~/utils/unleash.server'
import AddressBlock from '../vurder-samboer/AddressBlock/AddressBlock'
import AddressWrapper from '../vurder-samboer/AddressWrapper/AddressWrapper'
import type { Bostedsadresse } from '../vurder-samboer/samboer-types'
import type { Route } from './+types'
import {
  BOR_MED_TEKST,
  erVarigAdskilt,
  SAKSTYPE_TEKST,
  SIVILSTAND_TEKST,
  type SivilstandIEktefellePartnersSak,
  type SivilstandType,
  type VarigAdskiltGrunnlag,
  type VarigAdskiltVurdering,
} from './types'
import {
  DATO_FORMAT,
  erPartner,
  type VarigAdskiltVurderingInput,
  type VarigAdskiltVurderingOutput,
  varigAdskiltVurderingSchema,
} from './varig-adskilt-schema'

export function meta() {
  return [
    { title: 'Varig adskilt' },
    { name: 'description', content: 'Vurder om søker og ektefelle lever varig adskilt' },
  ]
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params

  const api = createAktivitetApi({
    request,
    behandlingId,
    aktivitetId,
  })
  const behandlingApi = createBehandlingApi({ request, behandlingId })

  const [grunnlag, vurdering, toppbarinfo] = await Promise.all([
    api.hentGrunnlagsdata<VarigAdskiltGrunnlag>(),
    api.hentVurdering<VarigAdskiltVurdering>(),
    behandlingApi.hentToppbarinfo(),
  ])

  const { enhet } = context.get(userContext)
  const visNotat = isFeatureEnabled(Features.NOTAT, { enhet: enhet })

  return {
    grunnlag,
    vurdering,
    soker: toppbarinfo,
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

  const submission = parseWithZod(formData, { schema: varigAdskiltVurderingSchema })

  if (submission.status !== 'success') {
    return data({ result: submission.reply() }, { status: 400 })
  }

  try {
    await api.lagreVurdering<VarigAdskiltVurdering>(submission.value)
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

export default function VarigAdskiltRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { grunnlag, vurdering, soker, visNotat } = loaderData

  const { aktivitet, behandling, avbrytAktivitet, readOnly } = useOutletContext<AktivitetOutletContext>()

  return (
    <VarigAdskiltComponent
      readOnly={readOnly}
      grunnlag={grunnlag}
      vurdering={vurdering}
      soker={soker}
      aktivitet={aktivitet}
      behandling={behandling}
      avbrytAktivitet={avbrytAktivitet}
      lastResult={actionData?.result}
      visNotat={visNotat}
    />
  )
}

type VarigAdskiltComponentProps = AktivitetComponentProps<VarigAdskiltGrunnlag, VarigAdskiltVurdering> & {
  soker: ToppbarInfo
  lastResult?: SubmissionResult | null
}

const tilSkjemaDato = (dato: string | null | undefined) => (dato ? format(new Date(dato), DATO_FORMAT) : '')

const fraSkjemaDato = (dato: string | undefined) => {
  const parsed = parse(dato ?? '', DATO_FORMAT, new Date())
  return isValid(parsed) ? parsed : undefined
}

function VarigAdskiltComponent({
  grunnlag,
  aktivitet,
  vurdering,
  soker,
  readOnly,
  avbrytAktivitet,
  lastResult,
  begrunnelse,
  visNotat,
}: VarigAdskiltComponentProps) {
  const isSubmitting = useIsSubmitting()

  const { sokersBostedsadresser, sokerSivilstand, ektefellePartner } = grunnlag

  const ektefelleTittel = erPartner(ektefellePartner?.sivilstand ?? sokerSivilstand) ? 'Partner' : 'Ektefelle'
  const ektefelleEieform = ektefelleTittel === 'Partner' ? 'Partners' : 'Ektefelles'

  const [form, fields] = useForm<VarigAdskiltVurderingInput, VarigAdskiltVurderingOutput>({
    lastResult,
    constraint: getZodConstraint(varigAdskiltVurderingSchema),
    shouldValidate: 'onSubmit',
    shouldRevalidate: 'onBlur',
    defaultValue: {
      ektefellePartnerFnr: ektefellePartner?.fnr ?? vurdering?.ektefellePartnerFnr ?? '',
      vurdertSivilstand: vurdering?.vurdertSivilstand ?? undefined,
      fom: tilSkjemaDato(vurdering?.fom),
      tom: tilSkjemaDato(vurdering?.tom),
      begrunnelse: begrunnelse ?? vurdering?.begrunnelse ?? '',
    },
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: varigAdskiltVurderingSchema })
    },
  })

  const fomDatepicker = useDatepicker({ defaultSelected: fraSkjemaDato(fields.fom.initialValue) })
  const tomDatepicker = useDatepicker({ defaultSelected: fraSkjemaDato(fields.tom.initialValue) })

  const skjulteFeil = [...(form.errors ?? []), ...(fields.ektefellePartnerFnr.errors ?? [])]

  const sidebar = (
    <div>
      <Form method="post" className="decision-form" autoComplete="off" {...getFormProps(form)}>
        <VStack gap="space-24">
          <input
            type="hidden"
            name={fields.ektefellePartnerFnr.name}
            defaultValue={fields.ektefellePartnerFnr.initialValue}
          />
          <RadioGroup
            legend="Vurder om søker lever varig adskilt"
            name={fields.vurdertSivilstand.name}
            defaultValue={fields.vurdertSivilstand.initialValue}
            readOnly={readOnly}
            size="small"
            error={fields.vurdertSivilstand.errors?.[0]}
          >
            <Radio value="LEVER_ADSKILT">Lever varig adskilt</Radio>
            <Radio value="LEVER_SAMMEN">Lever sammen</Radio>
          </RadioGroup>

          <DatePicker dropdownCaption {...fomDatepicker.datepickerProps}>
            <DatePicker.Input
              {...fomDatepicker.inputProps}
              size="small"
              readOnly={readOnly}
              label="Fra og med"
              name={fields.fom.name}
              error={fields.fom.errors?.[0]}
            />
          </DatePicker>

          <DatePicker dropdownCaption {...tomDatepicker.datepickerProps}>
            <DatePicker.Input
              {...tomDatepicker.inputProps}
              size="small"
              readOnly={readOnly}
              label="Til og med (valgfri)"
              name={fields.tom.name}
              error={fields.tom.errors?.[0]}
            />
          </DatePicker>

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
      </Form>
    </div>
  )

  return (
    <AktivitetVurderingLayout aktivitet={aktivitet} sidebar={sidebar}>
      <AktivitetVurderingLayout.Section>
        <Alert variant="info" size="small">
          Bruker oppgir i søknad at de lever varig adskilt
        </Alert>
      </AktivitetVurderingLayout.Section>
      <AktivitetVurderingLayout.Section>
        <HGrid gap="space-32" columns={{ xs: 1, sm: 2 }} maxWidth="1024px">
          <PersonInformasjon
            tittel="Søker"
            fnr={soker.fnr}
            navn={{ fornavn: soker.fornavn, mellomnavn: soker.mellomnavn, etternavn: soker.etternavn }}
            sivilstand={sokerSivilstand}
          />

          {ektefellePartner ? (
            <PersonInformasjon
              tittel={ektefelleTittel}
              fnr={ektefellePartner.fnr}
              navn={ektefellePartner.navn}
              sivilstand={ektefellePartner.sivilstand}
            />
          ) : (
            <VStack gap="space-4">
              <Heading size="xsmall" level="2">
                <PersonIcon aria-hidden /> {ektefelleTittel}
              </Heading>
              <InlineMessage status="info">Fant ingen ektefelle eller partner.</InlineMessage>
            </VStack>
          )}
        </HGrid>
      </AktivitetVurderingLayout.Section>
      {ektefellePartner && (
        <AktivitetVurderingLayout.Section>
          <SivilstandIEktefellePartnersSakInfo
            tittel={`Vurdering i ${ektefelleEieform.toLowerCase()} sak`}
            sivilstandISak={ektefellePartner.sivilstandISak}
          />
        </AktivitetVurderingLayout.Section>
      )}
      <AktivitetVurderingLayout.Section>
        <HGrid gap="space-32" columns={{ xs: 1, sm: 2 }} maxWidth="1024px">
          <Bostedsadresser tittel="Søkers bostedsadresser" bostedsadresser={sokersBostedsadresser} />
          <Bostedsadresser
            tittel={`${ektefelleEieform} bostedsadresser`}
            bostedsadresser={ektefellePartner?.bostedsadresser ?? []}
          />
        </HGrid>
      </AktivitetVurderingLayout.Section>
    </AktivitetVurderingLayout>
  )
}

type PersonInformasjonProps = {
  tittel: string
  fnr: string | null
  navn: { fornavn: string; mellomnavn: string | null; etternavn: string } | null
  sivilstand: SivilstandType | null
}

function PersonInformasjon({ tittel, fnr, navn, sivilstand }: PersonInformasjonProps) {
  return (
    <VStack gap="space-4">
      <Heading size="xsmall" level="2">
        <PersonIcon aria-hidden /> {tittel}
      </Heading>
      <HStack align="center">
        <Fnr value={fnr} />
      </HStack>
      {navn && (
        <BodyShort>
          {navn.etternavn.toUpperCase()}, {navn.fornavn} {navn.mellomnavn ?? ''}
        </BodyShort>
      )}
      <HStack gap="space-4">
        Sivilstand:{' '}
        <BodyShort weight="semibold">{sivilstand ? (SIVILSTAND_TEKST[sivilstand] ?? sivilstand) : 'Ukjent'}</BodyShort>
      </HStack>
    </VStack>
  )
}

type SivilstandIEktefellePartnersSakInfoProps = {
  tittel: string
  sivilstandISak: SivilstandIEktefellePartnersSak
}

function SivilstandIEktefellePartnersSakInfo({ tittel, sivilstandISak }: SivilstandIEktefellePartnersSakInfoProps) {
  return (
    <VStack gap="space-8" maxWidth="1024px">
      <Heading size="xsmall" level="2">
        {tittel}
      </Heading>
      <SivilstandIEktefellePartnersSakInnhold sivilstandISak={sivilstandISak} />
    </VStack>
  )
}

function SivilstandIEktefellePartnersSakInnhold({
  sivilstandISak,
}: {
  sivilstandISak: SivilstandIEktefellePartnersSak
}) {
  switch (sivilstandISak.utfall) {
    case 'INGEN_LOPENDE_YTELSE':
      return <InlineMessage status="info">Har ingen løpende alderspensjon eller uføretrygd.</InlineMessage>
    case 'SOKER_IKKE_REGISTRERT_SOM_EPS':
      return (
        <Alert variant="warning" size="small">
          Søker er ikke registrert som ektefelle, partner eller samboer i saken om{' '}
          {SAKSTYPE_TEKST[sivilstandISak.sakstype].toLowerCase()}.
        </Alert>
      )
    case 'VURDERT': {
      const { sakstype, borMed, fom } = sivilstandISak
      return (
        <VStack gap="space-4">
          <HStack gap="space-4">
            Ytelse: <BodyShort weight="semibold">{SAKSTYPE_TEKST[sakstype]}</BodyShort>
          </HStack>
          <HStack gap="space-4">
            Vurdert sivilstand: <BodyShort weight="semibold">{BOR_MED_TEKST[borMed] ?? borMed}</BodyShort>
          </HStack>
          <HStack gap="space-4">
            Gjelder fra og med: <BodyShort weight="semibold">{formatDateToNorwegian(fom)}</BodyShort>
          </HStack>
          {!erVarigAdskilt(borMed) && (
            <Alert variant="warning" size="small">
              De er ikke vurdert som varig adskilt i den andre saken. Vurderingene må være like i begge sakene.
            </Alert>
          )}
        </VStack>
      )
    }
  }
}

type BostedsadresserProps = {
  tittel: string
  bostedsadresser: Bostedsadresse[]
}

function Bostedsadresser({ tittel, bostedsadresser }: BostedsadresserProps) {
  return (
    <AddressWrapper
      title={tittel}
      description="Viser 18 måneder og 1 dag før virkningstidspunktet, fra Folkeregisteret. "
    >
      {bostedsadresser.length > 0 ? (
        <AddressBlock bostedadresser={bostedsadresser} />
      ) : (
        <InlineMessage status="info">Ingen bostedsadresser funnet.</InlineMessage>
      )}
    </AddressWrapper>
  )
}

export const Component = VarigAdskiltComponent
