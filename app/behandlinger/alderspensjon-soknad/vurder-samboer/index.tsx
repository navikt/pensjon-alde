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
  Radio,
  RadioGroup,
  Textarea,
  useDatepicker,
  VStack,
} from '@navikt/ds-react'
import { Form, redirect, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import AktivitetVurderingLayout from '~/components/shared/AktivitetVurderingLayout'
import type { AktivitetComponentProps } from '~/types/aktivitet-component'
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

  const vurdering = parseForm<SamboerVurdering>(formData, {
    samboerFra: dateInput,
    vurdering: radiogroup({
      SAMBOER_1_5: 'SAMBOER_1_5',
      SAMBOER_3_2: 'SAMBOER_3_2',
      IKKE_SAMBOER: 'IKKE_SAMBOER',
    }),
  })

  try {
    await api.lagreVurdering<SamboerVurdering>(vurdering)
    return redirect(`/behandling/${behandlingId}?justCompleted=${aktivitetId}`)
  } catch (error) {
    console.error(error)
  }
}

export default function VurderSamboerRoute({ loaderData }: Route.ComponentProps) {
  const { samboerInformasjon, vurdering, readOnly } = loaderData

  const { aktivitet, behandling } = useOutletContext<AktivitetOutletContext>()

  return (
    <VurdereSamboerComponent
      readOnly={readOnly}
      grunnlag={samboerInformasjon}
      vurdering={vurdering}
      aktivitet={aktivitet}
      behandling={behandling}
    />
  )
}

export function VurdereSamboerComponent({
  grunnlag,
  aktivitet,
  vurdering,
  readOnly,
}: AktivitetComponentProps<VurderSamboerGrunnlag, SamboerVurdering>) {
  const { datepickerProps, inputProps } = useDatepicker({
    defaultSelected: undefined,
    required: true,
  })

  const { samboer, sokersBostedsadresser, soknad } = grunnlag

  const sidebar = (
    <Form method="post" className="decision-form">
      <div className="samboer-details"></div>

      <div className="samboer-assessment">
        <VStack gap="6">
          <RadioGroup
            legend="Vurder samboerskap"
            name="vurdering"
            defaultValue={vurdering?.vurdering}
            readOnly={readOnly}
          >
            <Radio value="IKKE_SAMBOER">Ikke samboere</Radio>
            <Radio value="SAMBOER_1_5">§ 1-5 samboer</Radio>
            <Radio value="SAMBOER_3_2">§ 3-2 samboer</Radio>
          </RadioGroup>

          {console.log(new Date(vurdering?.samboerFra))}

          <DatePicker
            dropdownCaption
            defaultSelected={vurdering?.samboerFra ? new Date(vurdering.samboerFra) : undefined}
            {...datepickerProps}
          >
            <DatePicker.Input {...inputProps} readOnly={readOnly} label="Virkningstidspunkt fra" name="samboerFra" />
          </DatePicker>

          <Textarea
            readOnly={readOnly}
            label="Kommentar samboervurdering"
            description="Kun ved behov for tilleggsopplysninger"
            rows={4}
          />

          {!readOnly && (
            <VStack gap="3">
              <Button type="submit" variant="primary" size="small">
                Lagre vurdering
              </Button>
            </VStack>
          )}
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

            {soknad ? (
              <>
                <HStack gap="1">
                  Tidligere gift: <BodyShort weight="semibold">{soknad.tidligereEktefelle ? 'Ja' : 'Nei'}</BodyShort>
                </HStack>

                <HStack gap="1">
                  Felles barn:{' '}
                  <BodyShort weight="semibold">{soknad.harEllerHarHattFellesBarn ? 'Ja' : 'Nei'}</BodyShort>
                </HStack>

                <HStack gap="1">
                  Dato for samboerskap:{' '}
                  <BodyShort weight="semibold">{toMonthAndYear(soknad.datoForSamboerskap)}</BodyShort>
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

export const Component = VurdereSamboerComponent
