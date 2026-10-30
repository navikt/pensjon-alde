import { BodyShort, Button, Checkbox, Heading, HStack, InlineMessage, VStack } from '@navikt/ds-react'
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { data, Form, redirect, useFetcher, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import AktivitetVurderingLayout from '~/components/shared/AktivitetVurderingLayout'
import { useIsSubmitting } from '~/hooks/use-is-submitting'
import type { AktivitetComponentProps } from '~/types/aktivitet-component'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import { formatDateToNorwegian } from '~/utils/date'
import type { Route } from './+types'
import { PeriodeTabell } from './PeriodeTabell'
import {
  angreFjernPeriode,
  fjernPeriode,
  harFeil,
  nyKap19Periode,
  nyKap20Periode,
  oppdaterPeriode,
  parseVurdering,
  type RedigerbarPeriode,
  tilRedigerbarePerioder,
  tilVurderingPayload,
} from './trygdetid-perioder'
import type { Kap19Periode, Kap20Periode, RegistrerTrygdetidGrunnlag, RegistrerTrygdetidVurdering } from './types'

export function meta() {
  return [{ title: 'Registrer trygdetid' }, { name: 'description', content: 'Registrer trygdetid' }]
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params

  const api = createAktivitetApi({
    request,
    behandlingId,
    aktivitetId,
  })

  const grunnlag = await api.hentGrunnlagsdata<RegistrerTrygdetidGrunnlag>()
  const vurdering = await api.hentVurdering<RegistrerTrygdetidVurdering>()

  return {
    grunnlag,
    vurdering,
  }
}

const FORELØPIG_INTENT = 'foreløpig'
const DEBOUNCE_MS = 250

export async function action({ params, request }: Route.ActionArgs) {
  const { behandlingId, aktivitetId } = params
  const api = createAktivitetApi({
    request,
    behandlingId,
    aktivitetId,
  })
  const formData = await request.formData()
  const vurdering = parseVurdering(formData.get('vurdering'))

  if (formData.get('intent') === FORELØPIG_INTENT) {
    if (!vurdering) {
      return data({ feil: 'Ugyldig vurdering' }, { status: 400 })
    }
    try {
      await api.lagreForeløpigVurdering(vurdering)
      return { lagret: true }
    } catch {
      return data({ feil: 'Det oppstod en feil ved mellomlagring av vurderingen' }, { status: 500 })
    }
  }

  if (!vurdering || harFeil([...vurdering.kapittel19.perioder, ...vurdering.kapittel20.perioder])) {
    return data({ feil: 'Trygdetidsperiodene er ikke gyldige' }, { status: 400 })
  }

  try {
    await api.lagreVurdering(vurdering)
    return redirect(`/behandling/${behandlingId}?justCompleted=${aktivitetId}`)
  } catch {
    return data({ feil: 'Det oppstod en feil ved lagring av vurderingen' }, { status: 500 })
  }
}

export default function RegistrereTrygdetidRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { grunnlag, vurdering } = loaderData
  const { aktivitet, behandling, avbrytAktivitet, readOnly } = useOutletContext<AktivitetOutletContext>()

  return (
    <RegistrereTrygdetid
      readOnly={readOnly}
      grunnlag={grunnlag}
      vurdering={vurdering}
      aktivitet={aktivitet}
      behandling={behandling}
      avbrytAktivitet={avbrytAktivitet}
      serverFeil={actionData && 'feil' in actionData ? actionData.feil : undefined}
    />
  )
}

type RegistrereTrygdetidProps = AktivitetComponentProps<RegistrerTrygdetidGrunnlag, RegistrerTrygdetidVurdering> & {
  serverFeil?: string
}

function tilMap<T extends Kap19Periode | Kap20Periode>(perioder: RedigerbarPeriode<T>[]) {
  return new Map<string, T>(perioder.map(periode => [periode.radId, periode]))
}

function RegistrereTrygdetid({
  grunnlag,
  vurdering,
  aktivitet,
  readOnly,
  avbrytAktivitet,
  serverFeil,
}: RegistrereTrygdetidProps) {
  const isSubmitting = useIsSubmitting()

  const vurderteKap19 = useMemo(
    () => tilRedigerbarePerioder(vurdering?.kapittel19.perioder ?? [], 'kap19'),
    [vurdering?.kapittel19.perioder],
  )
  const vurderteKap20 = useMemo(
    () => tilRedigerbarePerioder(vurdering?.kapittel20.perioder ?? [], 'kap20'),
    [vurdering?.kapittel20.perioder],
  )
  const originaleKap19 = useMemo(() => tilMap(vurderteKap19), [vurderteKap19])
  const originaleKap20 = useMemo(() => tilMap(vurderteKap20), [vurderteKap20])

  const [kap19Perioder, setKap19Perioder] = useState(vurderteKap19)
  const [kap20Perioder, setKap20Perioder] = useState(vurderteKap20)
  const [visValideringsfeil, setVisValideringsfeil] = useState(false)

  const harValideringsfeil = harFeil([...kap19Perioder, ...kap20Perioder])

  const payload = useMemo(
    () => JSON.stringify(tilVurderingPayload(kap19Perioder, kap20Perioder)),
    [kap19Perioder, kap20Perioder],
  )

  const foreløpigFetcher = useFetcher<typeof action>()
  const { submit: submitForeløpig } = foreløpigFetcher
  const sistLagretPayload = useRef(payload)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (readOnly || payload === sistLagretPayload.current) return

    debounceTimer.current = setTimeout(() => {
      sistLagretPayload.current = payload
      submitForeløpig(
        { intent: FORELØPIG_INTENT, vurdering: payload },
        { method: 'post', defaultShouldRevalidate: false },
      )
    }, DEBOUNCE_MS)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [payload, readOnly, submitForeløpig])

  const foreløpigFeil =
    foreløpigFetcher.state === 'idle' && foreløpigFetcher.data && 'feil' in foreløpigFetcher.data
      ? foreløpigFetcher.data.feil
      : undefined

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (harValideringsfeil) {
      event.preventDefault()
      setVisValideringsfeil(true)
      return
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
  }

  const sidebar = (
    <Form method="post" className="decision-form" onSubmit={onSubmit}>
      <input type="hidden" name="vurdering" value={payload} />
      <VStack gap="space-24">
        <Heading level="2" size="small">
          Registrer trygdetid
        </Heading>
        {visValideringsfeil && harValideringsfeil && (
          <InlineMessage status="error" size="small">
            Rett opp feilene i trygdetidsperiodene før du fortsetter.
          </InlineMessage>
        )}
        {foreløpigFeil && (
          <InlineMessage status="warning" size="small">
            {foreløpigFeil}
          </InlineMessage>
        )}
        {serverFeil && (
          <InlineMessage status="error" size="small">
            {serverFeil}
          </InlineMessage>
        )}
        {!readOnly && (
          <VStack gap="space-12">
            <Button type="submit" variant="primary" size="small" loading={isSubmitting}>
              Fortsett behandling
            </Button>
            <Button type="button" variant="tertiary" size="small" onClick={avbrytAktivitet} disabled={isSubmitting}>
              Avbryt del-auto behandling
            </Button>
          </VStack>
        )}
      </VStack>
    </Form>
  )

  return (
    <AktivitetVurderingLayout aktivitet={aktivitet} sidebar={sidebar}>
      <AktivitetVurderingLayout.Section>
        <HStack gap="space-32">
          <VStack>
            <Heading size="xsmall" level="2">
              Dato fylte 16 år
            </Heading>
            <BodyShort>{formatDateToNorwegian(grunnlag.dato16år)}</BodyShort>
          </VStack>
          <VStack>
            <Heading size="xsmall" level="2">
              Sluttdato
            </Heading>
            <BodyShort>{formatDateToNorwegian(grunnlag.dato66årsutgang)}</BodyShort>
          </VStack>
        </HStack>
      </AktivitetVurderingLayout.Section>
      <AktivitetVurderingLayout.Section>
        <PeriodeTabell<Kap19Periode>
          tittel="Trygdetid kapittel 19"
          perioder={kap19Perioder}
          originale={originaleKap19}
          readOnly={readOnly}
          visValideringsfeil={visValideringsfeil}
          onOppdater={(radId, endring) => setKap19Perioder(perioder => oppdaterPeriode(perioder, radId, endring))}
          onFjern={radId => setKap19Perioder(perioder => fjernPeriode(perioder, radId))}
          onAngreFjern={radId => setKap19Perioder(perioder => angreFjernPeriode(perioder, radId))}
          onLeggTil={() => setKap19Perioder(perioder => [...perioder, nyKap19Periode(`ny-${crypto.randomUUID()}`)])}
          ekstraKolonner={(oppdater, erLåst) => [
            {
              id: 'poengIInnAr',
              header: 'Poeng i inn-år',
              bodyCell: periode => (
                <Checkbox
                  hideLabel
                  size="small"
                  checked={periode.poengIInnAr}
                  readOnly={erLåst(periode)}
                  onChange={event => oppdater(periode.radId, { poengIInnAr: event.target.checked })}
                >
                  Poeng i inn-år
                </Checkbox>
              ),
            },
            {
              id: 'poengIUtAr',
              header: 'Poeng i ut-år',
              bodyCell: periode => (
                <Checkbox
                  hideLabel
                  size="small"
                  checked={periode.poengIUtAr}
                  readOnly={erLåst(periode)}
                  onChange={event => oppdater(periode.radId, { poengIUtAr: event.target.checked })}
                >
                  Poeng i ut-år
                </Checkbox>
              ),
            },
          ]}
        />
      </AktivitetVurderingLayout.Section>
      <AktivitetVurderingLayout.Section>
        <PeriodeTabell<Kap20Periode>
          tittel="Trygdetid kapittel 20"
          perioder={kap20Perioder}
          originale={originaleKap20}
          readOnly={readOnly}
          visValideringsfeil={visValideringsfeil}
          onOppdater={(radId, endring) => setKap20Perioder(perioder => oppdaterPeriode(perioder, radId, endring))}
          onFjern={radId => setKap20Perioder(perioder => fjernPeriode(perioder, radId))}
          onAngreFjern={radId => setKap20Perioder(perioder => angreFjernPeriode(perioder, radId))}
          onLeggTil={() => setKap20Perioder(perioder => [...perioder, nyKap20Periode(`ny-${crypto.randomUUID()}`)])}
        />
      </AktivitetVurderingLayout.Section>
    </AktivitetVurderingLayout>
  )
}

export const Component = RegistrereTrygdetid
