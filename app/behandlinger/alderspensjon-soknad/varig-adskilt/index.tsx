import type { SubmissionResult } from '@conform-to/react'
import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4'
import { PersonIcon } from '@navikt/aksel-icons'
import {
  Alert,
  BodyShort,
  Button,
  CopyButton,
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
import type { ReactNode } from 'react'
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
import { type VurderingRespons, valideringsfeilForFelt } from '~/types/vurdering'
import { formatDateToNorwegian } from '~/utils/date/formatDateToNorwegian'
import { PROSESSERER_PARAM } from '~/utils/prosessering'
import { isFeatureEnabled } from '~/utils/unleash.server'
import AddressBlock from '../vurder-samboer/AddressBlock/AddressBlock'
import AddressWrapper from '../vurder-samboer/AddressWrapper/AddressWrapper'
import type { Bostedsadresse } from '../vurder-samboer/samboer-types'
import type { Route } from './+types'
import {
  ANNEN_EPS_TEKST,
  SAKSTYPE_TEKST,
  SIVILSTAND_TEKST,
  type SivilstandIEktefellePartnersSak,
  type SivilstandType,
  type VarigAdskiltGrunnlag,
  type VarigAdskiltVurdering,
  VURDERT_SIVILSTAND_KORT_TEKST,
  VURDERT_SIVILSTAND_TEKST,
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

  const [grunnlag, vurderingRespons] = await Promise.all([
    api.hentGrunnlagsdata<VarigAdskiltGrunnlag>(),
    api.hentVurdering<VurderingRespons<VarigAdskiltVurdering>>(),
  ])

  const vurdering: VarigAdskiltVurdering | null = vurderingRespons?.vurdering
    ? {
        ...vurderingRespons.vurdering,
        begrunnelse: vurderingRespons.begrunnelse,
        validering: vurderingRespons.validering,
      }
    : null

  const { enhet } = context.get(userContext)
  const visNotat = isFeatureEnabled(Features.NOTAT, { enhet: enhet })

  return {
    readOnly: false,
    grunnlag,
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

  const submission = parseWithZod(formData, { schema: varigAdskiltVurderingSchema })

  if (submission.status !== 'success') {
    return data({ result: submission.reply() }, { status: 400 })
  }

  try {
    await api.lagreVurdering<VarigAdskiltVurdering>(submission.value)
    return redirect(
      `/behandling/${behandlingId}/aktivitet/${aktivitetId}/alderspensjon-soknad/varig-adskilt?${PROSESSERER_PARAM}=true`,
    )
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
  const { grunnlag, vurdering, readOnly, visNotat } = loaderData

  const { aktivitet, behandling, avbrytAktivitet } = useOutletContext<AktivitetOutletContext>()

  return (
    <VarigAdskiltComponent
      readOnly={readOnly}
      grunnlag={grunnlag}
      vurdering={vurdering}
      aktivitet={aktivitet}
      behandling={behandling}
      avbrytAktivitet={avbrytAktivitet}
      lastResult={actionData?.result}
      visNotat={visNotat}
    />
  )
}

type VarigAdskiltComponentProps = AktivitetComponentProps<VarigAdskiltGrunnlag, VarigAdskiltVurdering> & {
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
  readOnly,
  avbrytAktivitet,
  lastResult,
  begrunnelse,
  visNotat,
}: VarigAdskiltComponentProps) {
  const isSubmitting = useIsSubmitting()

  const { soker, sokersBostedsadresser, sokerSivilstand, ektefellePartner } = grunnlag

  const ektefelleTittel = erPartner(ektefellePartner.sivilstand ?? sokerSivilstand) ? 'Partner' : 'Ektefelle'
  const ektefelleEieform = ektefelleTittel === 'Partner' ? 'Partners' : 'Ektefelles'

  const [form, fields] = useForm<VarigAdskiltVurderingInput, VarigAdskiltVurderingOutput>({
    lastResult,
    constraint: getZodConstraint(varigAdskiltVurderingSchema),
    shouldValidate: 'onSubmit',
    shouldRevalidate: 'onBlur',
    defaultValue: {
      vurdertSivilstand: vurdering?.vurdertSivilstand ?? undefined,
      fom: tilSkjemaDato(vurdering?.fom),
      begrunnelse: begrunnelse ?? vurdering?.begrunnelse ?? '',
    },
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: varigAdskiltVurderingSchema })
    },
  })

  const fomDatepicker = useDatepicker({ defaultSelected: fraSkjemaDato(fields.fom.initialValue) })

  const skjulteFeil = form.errors ?? []

  const sidebar = (
    <div>
      <Form method="post" className="decision-form" autoComplete="off" {...getFormProps(form)}>
        <VStack gap="space-24">
          <RadioGroup
            legend="Vurder om søker lever varig adskilt"
            name={fields.vurdertSivilstand.name}
            defaultValue={fields.vurdertSivilstand.initialValue}
            readOnly={readOnly}
            size="small"
            error={fields.vurdertSivilstand.errors?.[0]}
          >
            <Radio value="LEVER_ADSKILT">{VURDERT_SIVILSTAND_TEKST.LEVER_ADSKILT}</Radio>
            <Radio value="LEVER_SAMMEN">{VURDERT_SIVILSTAND_TEKST.LEVER_SAMMEN}</Radio>
          </RadioGroup>

          <DatePicker dropdownCaption {...fomDatepicker.datepickerProps}>
            <DatePicker.Input
              {...fomDatepicker.inputProps}
              size="small"
              readOnly={readOnly}
              label="Fra og med"
              name={fields.fom.name}
              error={
                fields.fom.errors?.[0] ??
                (fields.fom.dirty ? undefined : valideringsfeilForFelt(vurdering?.validering, 'fom'))
              }
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
          <PersonInformasjon tittel="Søker" fnr={soker.fnr} navn={soker.navn} sivilstand={sokerSivilstand} />

          <PersonInformasjon
            tittel={ektefelleTittel}
            fnr={ektefellePartner.fnr}
            navn={ektefellePartner.navn}
            sivilstand={ektefellePartner.sivilstand}
          >
            <VurderingIEktefellePartnersSak sivilstandISak={ektefellePartner.sivilstandISak} />
          </PersonInformasjon>
        </HGrid>
      </AktivitetVurderingLayout.Section>
      <AktivitetVurderingLayout.Section>
        <HGrid gap="space-32" columns={{ xs: 1, sm: 2 }} maxWidth="1024px">
          <Bostedsadresser tittel="Søkers bostedsadresser" bostedsadresser={sokersBostedsadresser} />
          <Bostedsadresser
            tittel={`${ektefelleEieform} bostedsadresser`}
            bostedsadresser={ektefellePartner.bostedsadresser}
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
  children?: ReactNode
}

function PersonInformasjon({ tittel, fnr, navn, sivilstand, children }: PersonInformasjonProps) {
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
      {children}
    </VStack>
  )
}

function VurderingIEktefellePartnersSak({ sivilstandISak }: { sivilstandISak: SivilstandIEktefellePartnersSak }) {
  switch (sivilstandISak.utfall) {
    case 'INGEN_LOPENDE_YTELSE':
      return <Linje label="Løpende vedtak">Ingen</Linje>
    case 'EKTEFELLE_PARTNER_REGISTRERT_MED_ANNEN_EPS_ENN_SØKER':
      return (
        <>
          <Linje label="Løpende vedtak">{SAKSTYPE_TEKST[sivilstandISak.sakstype]}</Linje>
          <Linje label="Vurdert sivilstand">{ANNEN_EPS_TEKST[sivilstandISak.grunnlagsrolle]}</Linje>
        </>
      )
    case 'INGEN_EPS_REGISTRERT':
      return (
        <>
          <Linje label="Løpende vedtak">{SAKSTYPE_TEKST[sivilstandISak.sakstype]}</Linje>
          <Linje label="Vurdert sivilstand">Ingen ektefelle/partner/samboer registrert</Linje>
        </>
      )
    case 'VURDERT': {
      const { sakstype, vurdering, fom } = sivilstandISak
      const fomTekst = formatDateToNorwegian(fom)
      return (
        <>
          <Linje label="Løpende vedtak">{SAKSTYPE_TEKST[sakstype]}</Linje>
          <HStack gap="space-4" align="center">
            Vurdert sivilstand:{' '}
            <BodyShort weight="semibold">
              {VURDERT_SIVILSTAND_KORT_TEKST[vurdering]} fra {fomTekst}
            </BodyShort>
            <CopyButton data-print-hidden size="small" data-color="accent" copyText={fomTekst} />
          </HStack>
        </>
      )
    }
  }
}

function Linje({ label, children }: { label: string; children: ReactNode }) {
  return (
    <HStack gap="space-4">
      {label}: <BodyShort weight="semibold">{children}</BodyShort>
    </HStack>
  )
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
