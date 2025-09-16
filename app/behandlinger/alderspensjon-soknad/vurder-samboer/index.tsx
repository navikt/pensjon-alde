import { PersonIcon } from '@navikt/aksel-icons'
import {
  Alert,
  Button,
  Checkbox,
  CopyButton,
  DatePicker,
  Heading,
  HGrid,
  Tooltip,
  useDatepicker,
  VStack,
} from '@navikt/ds-react'
import { Form, redirect, useLoaderData, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import AktivitetVurderingLayout from '~/components/shared/AktivitetVurderingLayout'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import { checkbox, dateInput, parseForm } from '~/utils/parse-form'
import type { Route } from './+types'
import AddressBlock from './AddressBlock/AddressBlock'
import AddressWrapper from './AddressWrapper/AddressWrapper'
import type { SamboerInformasjonHolder, SamboerVurdering } from './samboer-types'

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params

  const api = createAktivitetApi({
    request,
    behandlingId,
    aktivitetId,
  })

  const grunnlag = await api.hentGrunnlagsdata<SamboerInformasjonHolder>()

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

export default function VurdereSamboer() {
  const { datepickerProps, inputProps } = useDatepicker({
    defaultSelected: undefined,
    required: true,
  })

  const {
    samboerInformasjon,
    // vurdering
  } = useLoaderData<typeof loader>()
  const { epsPersongrunnlagListeDto, sokerPersongrunnlagListeDto } = samboerInformasjon
  const { fnr, navnTilPerson } = sokerPersongrunnlagListeDto[0]
  const { etternavn, fornavn, mellomnavn } = navnTilPerson
  const { aktivitet } = useOutletContext<AktivitetOutletContext>()

  const detailsContent = (
    <HGrid gap="8" columns={{ xs: 1, sm: 2 }}>
      <AddressWrapper
        title="Samboers bostedsadresser"
        description="Adresser fra siste 18 måneder og 1 dag i Folkeregisteret. "
      >
        {epsPersongrunnlagListeDto.length > 0 ? (
          epsPersongrunnlagListeDto.map(g => (
            <AddressBlock key={g.personGrunnlagId} bostedadresser={g.bostedsadresser} />
          ))
        ) : (
          <Alert variant="info">Ingen bostedsadresser funnet.</Alert>
        )}
      </AddressWrapper>

      <AddressWrapper
        title="Søkers bostedsadresser"
        description="Adresser fra siste 18 måneder og 1 dag i Folkeregisteret. "
      >
        {sokerPersongrunnlagListeDto.length > 0 ? (
          sokerPersongrunnlagListeDto.map(g => (
            <AddressBlock key={g.personGrunnlagId} bostedadresser={g.bostedsadresser} />
          ))
        ) : (
          <Alert variant="info">Ingen bostedsadresser funnet.</Alert>
        )}
      </AddressWrapper>
    </HGrid>
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
            <Button type="submit" variant="primary" size="small">
              Lagre vurdering
            </Button>

            <Button type="submit" variant="secondary" size="small">
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
