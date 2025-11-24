import { Button, Radio, RadioGroup, VStack } from '@navikt/ds-react'
import { Form, redirect, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import AktivitetVurderingLayout from '~/components/shared/AktivitetVurderingLayout'
import type { AktivitetComponentProps } from '~/types/aktivitet-component'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
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
    await api.lagreVurdering(vurdering)
    return redirect(`/behandling/${behandlingId}?justCompleted=${aktivitetId}`)
  } catch (error) {
    console.error(error)
  }
}

const formatCurrencyNok = (amount: number) => {
  return new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK' }).format(amount)
}

const KontrollerInntektsopplysningerForEPSRoute = ({ loaderData }: Route.ComponentProps) => {
  const { aktivitet, behandling, avbrytAktivitet } = useOutletContext<AktivitetOutletContext>()
  const { grunnlag, vurdering } = loaderData

  return (
    <KontrollerInntektsopplysningerForEPS
      readOnly={false}
      grunnlag={grunnlag}
      vurdering={vurdering}
      aktivitet={aktivitet}
      behandling={behandling}
      avbrytAktivitet={avbrytAktivitet}
      AttesteringKomponent={null}
    />
  )
}

type KontrollerInntektsopplysningerForEPSInterface = AktivitetComponentProps<
  KontrollerInntektsopplysningerForEpsGrunnlag,
  KontrollerInntektsopplysningerForEpsVurdering
>

const KontrollerInntektsopplysningerForEPS: React.FC<KontrollerInntektsopplysningerForEPSInterface> = ({
  vurdering,
  grunnlag,
  aktivitet,
  readOnly,
  avbrytAktivitet,
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
        defaultValue={readOnly ? (vurdering?.epsInntektOver2G ? 'ja' : 'nei') : undefined}
        name="epsInntektOver2G"
        legend="Har samboer inntekt over 2G:"
        required
        readOnly={readOnly}
      >
        <Radio value="ja">Ja</Radio>
        <Radio value="nei">Nei</Radio>
      </RadioGroup>

      {!readOnly && (
        <div className="button-group">
          <Button type="submit" variant="primary" size="small">
            Fortsett behandling
          </Button>

          <Button type="reset" variant="secondary" size="small" onClick={avbrytAktivitet}>
            Avbryt
          </Button>
        </div>
      )}
    </Form>
  )

  return (
    <AktivitetVurderingLayout aktivitet={aktivitet} sidebar={sidebar}>
      {detailsContent}
    </AktivitetVurderingLayout>
  )
}

export const Component = KontrollerInntektsopplysningerForEPS
export default KontrollerInntektsopplysningerForEPSRoute
