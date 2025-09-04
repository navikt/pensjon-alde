<<<<<<< HEAD
import { PersonIcon } from '@navikt/aksel-icons'
import {
  Box,
  Button,
  Checkbox,
  CopyButton,
  DatePicker,
  Heading,
  HStack,
  Tooltip,
  useDatepicker,
  VStack,
} from '@navikt/ds-react'
import { Form, redirect, useLoaderData, useOutletContext } from 'react-router'
=======
import { Button, Checkbox, DatePicker, useDatepicker } from '@navikt/ds-react'
import { type ActionFunction, Form, type LoaderFunction, redirect, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
>>>>>>> 323f341 (Refactor API)
import AktivitetVurderingLayout from '~/components/shared/AktivitetVurderingLayout'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import { checkbox, dateInput, parseForm } from '~/utils/parse-form'
import type { Route } from './+types'
import AddressWrapper from './AddressWrapper/AddressWrapper'
import type { SamboerInformasjonHolder, SamboerVurdering } from './samboer-types'

export const loader: LoaderFunction = async ({ params, request, context }) => {
  const { behandlingId, aktivitetId } = params

  const api = createAktivitetApi({
    request,
    context,
    behandlingId,
    aktivitetId,
  })

  const grunnlag = await api.hentGrunnlagsdata<{
    samboerInformasjon: SamboerInformasjonHolder
  }>()

  const vurdering = await api.hentVurdering<SamboerVurdering>()

  return {
    samboerInformasjon: grunnlag?.samboerInformasjon,
    vurdering,
  }
}

export const action: ActionFunction = async ({ params, request, context }) => {
  const { behandlingId, aktivitetId } = params
  const api = createAktivitetApi({ request, context, aktivitetId, behandlingId })
  const formData = await request.formData()

  const vurdering = parseForm<SamboerVurdering>(formData, {
    virkFom: dateInput,
    tidligereEktefeller: checkbox,
    harFellesBarn: checkbox,
  })

  try {
    await api.lagreVurdering<SamboerVurdering>(vurdering)
    return redirect(`/behandling/${behandlingId}?justCompleted=${aktivitetId}`)
  } catch (error) {
    console.error(error)
  }
}

export default function VurdereSamboer({ loaderData }: Route.ComponentProps) {
  const { datepickerProps, inputProps } = useDatepicker({
    defaultSelected: undefined,
    required: true,
  })

<<<<<<< HEAD
  const { samboerInformasjon, vurdering } = useLoaderData<typeof loader>()
  const { epsPersongrunnlagListeDto, sokerPersongrunnlagListeDto } = samboerInformasjon
  const { fnr, navnTilPerson } = sokerPersongrunnlagListeDto[0]
  const { etternavn, fornavn, mellomnavn } = navnTilPerson
=======
  const { samboerInformasjon, vurdering } = loaderData
>>>>>>> 323f341 (Refactor API)
  const { aktivitet } = useOutletContext<AktivitetOutletContext>()

  const detailsContent = (
    <>
      <HStack gap="16">
        <AddressWrapper title="Samboers bostedsadresser">
          {epsPersongrunnlagListeDto.map(g => (
            <Box key={g.personGrunnlagId}>
              {/* <BostedsadresserSection bostedsadresser={g.bostedsadresser} title="Samboers bostedsadresser" /> */}
            </Box>
          ))}
        </AddressWrapper>

        <AddressWrapper title="Søkers bostedsadresser">
          {sokerPersongrunnlagListeDto.map(g => (
            <Box key={g.personGrunnlagId}>
              {/* <BostedsadresserSection bostedsadresser={g.bostedsadresser} title="Søkers bostedsadresser" /> */}
            </Box>
          ))}
        </AddressWrapper>
      </HStack>

      <div>
        <pre>{JSON.stringify(vurdering, null, 2)}</pre>
        <pre>{JSON.stringify(samboerInformasjon, null, 2)}</pre>
      </div>
    </>
  )

  const sidebar = (
    <Form method="post" className="decision-form">
      <div className="samboer-details">
        <VStack gap="1">
          <Heading level="2" size="medium">
            <PersonIcon title="Aktuell samboer" fontSize="1.5rem" />
            Aktuell samboer
          </Heading>

          {fnr && (
            <div className="samboer-ssn">
              {fnr}
              <Tooltip content="Kopier fødselsnummer">
                <CopyButton variant="action" copyText={fnr} size="small" />
              </Tooltip>
            </div>
          )}

          {etternavn && fornavn && (
            <div className="samboer-name">
              {etternavn}, {fornavn}
              {mellomnavn && ` ${mellomnavn}`}
            </div>
          )}
        </VStack>
      </div>

      <div className="samboer-assessment">
        <VStack gap="1">
          <Heading level="2" size="medium">
            Vurder samboerskap
          </Heading>

          <div className="checkbox-group">
            <Checkbox name="harFellesBarn">Har felles barn</Checkbox>
            <Checkbox name="tidligereEktefeller">Tidligere ektefeller</Checkbox>

            <DatePicker {...datepickerProps}>
              <DatePicker.Input {...inputProps} label="Virkningstidspunkt fra" name="virkFom" />
            </DatePicker>
          </div>

          <div className="button-group">
            <Button type="submit" name="vurdert" value="VURDERT" variant="primary" size="small">
              Lagre vurdering
            </Button>

            <Button type="submit" name="vurdert" value="AVBRUTT" variant="secondary" size="small">
              Avbryt og tilbake
            </Button>
          </div>
        </VStack>
      </div>
    </Form>
  )

  return (
    <AktivitetVurderingLayout
      aktivitet={aktivitet}
      detailsTitle="Samboervurdering"
      detailsContent={detailsContent}
      sidebar={sidebar}
    />
  )
}
