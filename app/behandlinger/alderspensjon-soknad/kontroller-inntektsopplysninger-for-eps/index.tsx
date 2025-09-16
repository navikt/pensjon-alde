import { BodyShort, Button, Checkbox, HGrid, Radio, RadioGroup, VStack } from '@navikt/ds-react'
import { Form, redirect, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import AktivitetVurderingLayout from '~/components/shared/AktivitetVurderingLayout'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import type { AktivitetDTO, BehandlingDTO } from '~/types/behandling'
import { parseForm, radiogroup } from '~/utils/parse-form'
import type { Route } from './+types'
import type {
  KontrollerInntektsopplysningerForEpsGrunnlag,
  KontrollerInntektsopplysningerForEpsVurdering,
} from './types'

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params

  const api = createAktivitetApi({
    request,
    behandlingId,
    aktivitetId,
  })

  const grunnlag = await api.hentGrunnlagsdata<KontrollerInntektsopplysningerForEpsGrunnlag>()

  // const vurdering = await api.hentVurdering<KontrollerInntektsopplysningerForEpsVurdering>()
  const vurdering = null

  return {
    grunnlag,
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

  const vurdering = parseForm<KontrollerInntektsopplysningerForEpsVurdering>(formData, {
    epsInntektOver2G: radiogroup({ ja: true, nei: false }),
  })

  try {
    await api.lagreVurdering<KontrollerInntektsopplysningerForEpsVurdering>(vurdering)
    return redirect(`/behandling/${behandlingId}?justCompleted=${aktivitetId}`)
  } catch (error) {
    console.error(error)
  }
}

const formatCurrencyNok = (amount: number) => {
  return new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK' }).format(amount)
}

const KontrollerInntektsopplysningerForEPSRoute = ({ loaderData }: Route.ComponentProps) => {
  const { aktivitet, behandling } = useOutletContext<AktivitetOutletContext>()
  const { grunnlag, vurdering } = loaderData

  return (
    <div>
      <KontrollerInntektsopplysningerForEPS
        readonly={true}
        grunnlag={grunnlag}
        vurdering={vurdering}
        aktivitet={aktivitet}
        behandling={behandling}
      />
      <KontrollerInntektsopplysningerForEPS
        readonly={false}
        grunnlag={grunnlag}
        vurdering={vurdering}
        aktivitet={aktivitet}
        behandling={behandling}
      />
    </div>
  )
}

type AktivitetProps<Grunnlag, Vurdering> = {
  readonly: boolean
  grunnlag: Grunnlag
  vurdering: Vurdering | null
  aktivitet: AktivitetDTO
  behandling: BehandlingDTO
}

type KontrollerInntektsopplysningerForEPSInterface = AktivitetProps<
  KontrollerInntektsopplysningerForEpsGrunnlag,
  KontrollerInntektsopplysningerForEpsVurdering
>

const KontrollerInntektsopplysningerForEPS: React.FC<KontrollerInntektsopplysningerForEPSInterface> = ({
  vurdering,
  grunnlag,
  aktivitet,
  behandling,
  readonly,
}) => {
  const detailsContent = (
    <VStack gap="8">
      {grunnlag.innhentetInntekt ? (
        <div>
          Innhentet inntekt: <span style={{ fontWeight: 'bold' }}>{formatCurrencyNok(grunnlag.innhentetInntekt)}</span>{' '}
          ({Math.round((grunnlag.innhentetInntekt / grunnlag.grunnbelop) * 100) / 100}G)
        </div>
      ) : (
        <div>Ingen inntekt registert</div>
      )}

      <div>
        Oppgitt inntekt i søknad:{' '}
        <span style={{ fontWeight: 'bold' }}>{formatCurrencyNok(grunnlag.oppgittInntekt)}</span> (
        {Math.round((grunnlag.oppgittInntekt / grunnlag.grunnbelop) * 100) / 100}G)
      </div>
    </VStack>
  )

  const sidebar = (
    <Form method="post" className="decision-form">
      <RadioGroup
        defaultValue={readonly ? (vurdering?.epsInntektOver2G ? 'ja' : 'nei') : undefined}
        name="epsInntektOver2G"
        legend="Har samboer inntekt over 2G:"
        required
        disabled={readonly}
      >
        <Radio value="ja">Ja</Radio>
        <Radio value="nei">Nei</Radio>
      </RadioGroup>

      {!readonly && (
        <div className="button-group">
          <Button type="submit" variant="primary" size="small">
            Lagre vurdering
          </Button>

          <Button type="submit" variant="danger" size="small">
            Avbryt og tilbake
          </Button>
        </div>
      )}
    </Form>
  )

  return (
    <AktivitetVurderingLayout aktivitet={aktivitet} detailsTitle="" detailsContent={detailsContent} sidebar={sidebar} />
  )
}

export default KontrollerInntektsopplysningerForEPSRoute
