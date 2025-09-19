import { ExclamationmarkTriangleFillIcon, PersonIcon } from '@navikt/aksel-icons'
import {
  Alert,
  BodyLong,
  BodyShort,
  Button,
  CopyButton,
  DatePicker,
  Heading,
  HGrid,
  HStack,
  Radio,
  RadioGroup,
  Textarea,
  useDatepicker,
  VStack,
} from '@navikt/ds-react'
import { Form, redirect, useLoaderData, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import AktivitetVurderingLayout from '~/components/shared/AktivitetVurderingLayout'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import { toMonthAndYear } from '~/utils/date'
import { dateInput, parseForm, radiogroup } from '~/utils/parse-form'
import type { Route } from './+types'
import AddressBlock from './AddressBlock/AddressBlock'
import AddressWrapper from './AddressWrapper/AddressWrapper'
import type { SamboerVurdering, VurderSamboerGrunnlag } from './samboer-types'

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

  const vurdering = parseForm<SamboerVurdering>(formData, {
    virkFom: dateInput,
    samboerVurdering: radiogroup({ '1-5': '1-5', '3-2': '3-2', ikke_samboere: 'ikke_samboere' }),
  })

  try {
    await api.lagreVurdering<SamboerVurdering>(vurdering)
    return redirect(`/behandling/${behandlingId}?justCompleted=${aktivitetId}`)
  } catch (error) {
    console.error(error)
  }
}

export default function VurdereSamboer() {
  const { datepickerProps, inputProps } = useDatepicker({
    defaultSelected: undefined,
    required: true,
  })

  const {
    samboerInformasjon,
    // vurdering
  } = useLoaderData<typeof loader>()

  const { samboer, sokersBostedsadresser, soknad } = samboerInformasjon

  const { aktivitet, behandling } = useOutletContext<AktivitetOutletContext>()

  const sidebar = (
    <Form method="post" className="decision-form">
      <div className="samboer-details"></div>

      <div className="samboer-assessment">
        <VStack gap="6">
          <RadioGroup legend="Vurder samboerskap" name="samboervurdering">
            <Radio value="ikke_samboere">Ikke samboere</Radio>
            <Radio value="1-5">§ 1-5 samboer</Radio>
            <Radio value="3-2">§ 3-2 samboer</Radio>
          </RadioGroup>

          <DatePicker {...datepickerProps}>
            <DatePicker.Input {...inputProps} label="Virkningstidspunkt fra" name="virkFom" />
          </DatePicker>

          <Textarea
            label="Kommentar samboervurdering"
            description="Kun ved behov for tilleggsopplysninger"
            name="kommentar"
            rows={4}
          />

          <VStack gap="3">
            <Button type="submit" variant="primary" size="small">
              Lagre vurdering
            </Button>

            <Button type="submit" variant="danger" size="small">
              Ta til manuell
            </Button>
          </VStack>
        </VStack>
      </div>
    </Form>
  )

  return (
    <AktivitetVurderingLayout aktivitet={aktivitet} sidebar={sidebar}>
      <AktivitetVurderingLayout.Section>
        <VStack>
          <Heading size="xsmall" level="2">
            <PersonIcon /> Samboer
          </Heading>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {samboer.fnr}
            <CopyButton size="small" copyText={samboer.fnr} />
          </div>
          {samboer.navn.etternavn.toUpperCase()}, {samboer.navn.fornavn} {samboer.navn.mellomnavn}
        </VStack>
      </AktivitetVurderingLayout.Section>

      <AktivitetVurderingLayout.Section>
        <HGrid gap="8" columns={{ xs: 1, sm: 2 }}>
          <VStack gap="1">
            <Heading level="2" size="xsmall">
              Brukeroppgitte opplysninger
            </Heading>

            <HStack gap="1">
              Tidligere gift: <BodyShort weight="semibold">{soknad.tidligereEktefelle ? 'Ja' : 'Nei'}</BodyShort>
            </HStack>

            <HStack gap="1">
              Felles barn: <BodyShort weight="semibold">{soknad.harEllerHarHattFellesBarn ? 'Ja' : 'Nei'}</BodyShort>
            </HStack>

            <HStack gap="1">
              Dato for samboerskap: <BodyShort weight="semibold">{toMonthAndYear(soknad.datoForSamboerskap)}</BodyShort>
            </HStack>
          </VStack>

          <VStack gap="1">
            <Heading size="xsmall" level="2">
              Opplysninger fra vårt register
            </Heading>
            <HStack gap="1">
              Tidligere gift: <BodyShort weight="semibold">{samboer.tidligereEktefelle ? 'Ja' : 'Nei'}</BodyShort>
            </HStack>
            <HStack gap="1">
              Felles barn: <BodyShort weight="semibold">{samboer.harEllerHarHattFellesBarn ? 'Ja' : 'Nei'}</BodyShort>
            </HStack>
          </VStack>
        </HGrid>
      </AktivitetVurderingLayout.Section>

      <AktivitetVurderingLayout.Section>
        <HGrid gap="8" columns={{ xs: 1, sm: 2 }}>
          <AddressWrapper
            title="Samboers bostedsadresser"
            description="Adresser fra siste 18 måneder og 1 dag i Folkeregisteret. "
          >
            {samboer.bostedsadresser.length > 0 ? (
              <AddressBlock bostedadresser={samboer.bostedsadresser} />
            ) : (
              <Alert variant="info">Ingen bostedsadresser funnet.</Alert>
            )}
          </AddressWrapper>

          <AddressWrapper
            title="Søkers bostedsadresser"
            description="Adresser fra siste 18 måneder og 1 dag i Folkeregisteret. "
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
