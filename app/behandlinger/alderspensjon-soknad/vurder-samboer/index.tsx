import { PersonIcon } from '@navikt/aksel-icons'
import {
  Alert,
  BodyLong,
  BodyShort,
  Button,
  Checkbox,
  CopyButton,
  DatePicker,
  Heading,
  HGrid,
  HStack,
  Label,
  Radio,
  RadioGroup,
  Tooltip,
  useDatepicker,
  VStack,
} from '@navikt/ds-react'
import { Form, redirect, useLoaderData, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import AktivitetVurderingLayout from '~/components/shared/AktivitetVurderingLayout'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
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
  const { samboer, sokersBostedsadresser } = samboerInformasjon

  const { aktivitet, behandling } = useOutletContext<AktivitetOutletContext>()

  const detailsContent = (
    <HGrid gap="4">
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

      <HGrid gap="8" columns={{ xs: 1, sm: 2 }}>
        <VStack gap="1">
          <Heading level="2" size="xsmall">
            Brukeroppgitte opplysninger
          </Heading>
          <BodyShort>
            Tidligere gift: <b>KHJKJSHDF</b>
          </BodyShort>
          <BodyShort>
            Felles barn: <b>HEISD</b>
          </BodyShort>
          <BodyShort>
            Dato for samboerskap: <b>FDSDF</b>
          </BodyShort>
        </VStack>

        <VStack gap="1">
          <Heading size="small">Opplysninger fra vårt register</Heading>
          <BodyShort>
            Tidligere gift: <b>{samboer.tidligereEktefelle ? 'Ja' : 'Nei'}</b>
          </BodyShort>
          <BodyShort>
            Felles barn: <b>{samboer.harEllerHarHattFellesBarn ? 'Ja' : 'Nei'}</b>
          </BodyShort>
        </VStack>
      </HGrid>

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
    </HGrid>
  )

  const sidebar = (
    <Form method="post" className="decision-form">
      <div className="samboer-details"></div>

      <div className="samboer-assessment">
        <VStack gap="4">
          <div className="">
            <RadioGroup legend="Vurder samboerskap" name="samboervurdering">
              <Radio value="ikke_samboere">Ikke samboere</Radio>
              <Radio value="1-5">§ 1-5 samboer</Radio>
              <Radio value="3-5">§ 3-5 samboer</Radio>
            </RadioGroup>

            <DatePicker {...datepickerProps}>
              <DatePicker.Input {...inputProps} label="Virkningstidspunkt fra" name="virkFom" />
            </DatePicker>
          </div>

          <VStack gap="2">
            <Button type="submit" variant="primary" size="small">
              Lagre vurdering
            </Button>

            <Button type="submit" variant="secondary" size="small">
              Avbryt og tilbake
            </Button>
          </VStack>
        </VStack>
      </div>
    </Form>
  )

  return (
    <div>
      <AktivitetVurderingLayout aktivitet={aktivitet} details={detailsContent} sidebar={sidebar} />
    </div>
  )
}
