import {
  Alert,
  BodyLong,
  BodyShort,
  Button,
  DatePicker,
  Heading,
  HGrid,
  Radio,
  RadioGroup,
  Select,
  TextField,
  useDatepicker,
  VStack,
} from '@navikt/ds-react'
import React from 'react'
import { data, Form, redirect, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import { createBehandlingApi } from '~/api/behandling-api'
import AktivitetVurderingLayout from '~/components/shared/AktivitetVurderingLayout'
import { Features } from '~/features'
import type { AktivitetComponentProps, FormErrors } from '~/types/aktivitet-component'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import { buildUrl } from '~/utils/build-url'
import { formatCurrencyNok } from '~/utils/currency'
import { formatDateToNorwegian } from '~/utils/date'
import { env } from '~/utils/env.server'
import { dateInput, parseForm } from '~/utils/parse-form'
import { isFeatureEnabled } from '../../../utils/unleash.server'
import type { Route } from './+types'
import { AfpLivsvarigVenter } from './AfpLivsvarigVenter'
import { SoknadDisplay } from './SoknadDisplay'

export function meta() {
  return [{ title: 'Livsvarig AFP Offentlig' }, { name: 'description', content: 'Livsvarig AFP Offentlig' }]
}

export type AldeTjenestepensjonInformasjon = {
  tpNummer: number
  tpNavn: string
}

export type BelopData = {
  belop: number
  fomDato: string
}

export type GrunnbelopData = {
  fomDato: string
  grunnbelop: number
}

export type Innvilget = {
  status: 'innvilget'
  tpInfo: AldeTjenestepensjonInformasjon
  belop: BelopData[]
  startdato: string
  sistRegulert: number
}

export type Soknad = {
  status: 'soknad'
  tpInfo: AldeTjenestepensjonInformasjon
  onsketVirkningsdato: string
}

export type Ingen = {
  status: 'ingen'
}

export type Ukjent = {
  status: 'ukjent'
  tpInfo: AldeTjenestepensjonInformasjon
}

export type AldeAfpOffentligStatus = Innvilget | Soknad | Ingen | Ukjent

export type LivsvarigOffentligAfpGrunnlag = {
  afpOffentligStatus: AldeAfpOffentligStatus[]
  grunnbelop: GrunnbelopData[]
}

export type LivsvarigAfpOffentligInnvilget = {
  utfall: 'innvilget'
  tpNummer: number
  belop: BelopData[]
  virkFom: string
  sistRegulert: number
}

export type LivsvarigAfpOffentligIngen = {
  utfall: 'ingen'
}

export type LivsvarigAfpOffentligVurdering = LivsvarigAfpOffentligInnvilget | LivsvarigAfpOffentligIngen

const isSoknad = (s: AldeAfpOffentligStatus): s is Soknad => s.status === 'soknad'
const isUkjent = (s: AldeAfpOffentligStatus): s is Ukjent => s.status === 'ukjent'

export type Props = AktivitetComponentProps<LivsvarigOffentligAfpGrunnlag, LivsvarigAfpOffentligVurdering> & {
  pensjonsoversiktUrl?: string
  psakOppgaveoversikt?: string
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params

  const visMedMulighetForVurdering = isFeatureEnabled(Features.AFP_LIVSVARIG_MED_VURDERING)

  const api = createAktivitetApi({ request, behandlingId, aktivitetId })
  const behandling = await createBehandlingApi({ request, behandlingId }).hentBehandling()

  const grunnlag = await api.hentGrunnlagsdata<LivsvarigOffentligAfpGrunnlag>()
  const vurdering = await api.hentVurdering<LivsvarigAfpOffentligVurdering>()

  return {
    readOnly: false,
    grunnlag,
    vurdering,
    visMedMulighetForVurdering,
    pensjonsoversiktUrl: buildUrl(env.psakSakUrlTemplate, request, { sakId: behandling.sakId }),
    psakOppgaveoversikt: buildUrl(env.psakOppgaveoversikt, request, {}),
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

  const utfall = formData.get('utfall') as string

  if (utfall === 'ingen') {
    const vurdering: LivsvarigAfpOffentligVurdering = {
      utfall: 'ingen',
    }
    try {
      await api.lagreVurdering(vurdering)
      return redirect(`/behandling/${behandlingId}?justCompleted=${aktivitetId}`)
    } catch {
      return data(
        {
          errors: {
            _form: 'Det oppstod en feil ved lagring av vurderingen',
          } as FormErrors<{ utfall: string }>,
        },
        { status: 500 },
      )
    }
  }

  const grunnlag = await api.hentGrunnlagsdata<LivsvarigOffentligAfpGrunnlag>()
  const soknadTpLeverandorer = grunnlag.afpOffentligStatus.filter(
    status => status.status === 'soknad' || status.status === 'ukjent',
  )

  const parsedForm = parseForm<{ tpLeverandor: string; virkFom: string; belop: string; sistRegulert: string }>(
    formData,
    {
      tpLeverandor: (value: FormDataEntryValue | null) => (value ? value.toString() : null),
      virkFom: dateInput,
      belop: (value: FormDataEntryValue | null) => (value ? value.toString() : null),
      sistRegulert: (value: FormDataEntryValue | null) => (value ? value.toString() : null),
    },
  )

  const errors: FormErrors<{
    tpLeverandor: string
    virkFom: string
    belop: string
    utfall: string
    sistRegulert: string
  }> = {}

  if (soknadTpLeverandorer.length > 1 && !parsedForm.tpLeverandor) {
    errors.tpLeverandor = 'Du må velge en TP-leverandør'
  }

  if (!parsedForm.virkFom) {
    errors.virkFom = 'Du må oppgi virkningsdato, f.eks. på denne måten: ddmmåååå'
  }

  if (!parsedForm.belop) {
    errors.belop = 'Du må oppgi beløp'
  }

  if (parsedForm.belop) {
    const belopNum = parseInt(parsedForm.belop, 10)
    if (Number.isNaN(belopNum) || belopNum <= 0) {
      errors.belop = 'Beløp må være et positivt tall'
    }
  }

  if (!parsedForm.sistRegulert) {
    errors.sistRegulert = 'Du må velge grunnbeløp'
  }

  if (parsedForm.sistRegulert) {
    const sistRegulertNum = parseFloat(parsedForm.sistRegulert)
    if (Number.isNaN(sistRegulertNum)) {
      errors.sistRegulert = 'Grunnbeløp må være et gyldig tall'
    }
  }

  if (Object.keys(errors).length > 0) {
    return data({ errors }, { status: 400 })
  }

  const tpNummerStr =
    parsedForm.tpLeverandor ||
    (soknadTpLeverandorer.length === 1 ? soknadTpLeverandorer[0].tpInfo.tpNummer.toString() : null)

  if (!tpNummerStr) {
    return data(
      {
        errors: {
          tpLeverandor: 'Kunne ikke bestemme TP-leverandør',
        } as FormErrors<{
          tpLeverandor: string
          virkFom: string
          belop: string
          utfall: string
          sistRegulert: string
        }>,
      },
      { status: 400 },
    )
  }

  const tpNummer = parseInt(tpNummerStr, 10)
  const belop = parseInt(parsedForm.belop, 10)
  const sistRegulert = parseFloat(parsedForm.sistRegulert)

  const tpLeverandor = grunnlag.afpOffentligStatus.find(
    status => (status.status === 'soknad' || status.status === 'ukjent') && status.tpInfo.tpNummer === tpNummer,
  )

  if (!tpLeverandor || (tpLeverandor.status !== 'soknad' && tpLeverandor.status !== 'ukjent')) {
    return data(
      {
        errors: {
          tpLeverandor: 'Ugyldig TP-leverandør valgt',
        } as FormErrors<{
          tpLeverandor: string
          virkFom: string
          belop: string
          utfall: string
          sistRegulert: string
        }>,
      },
      { status: 400 },
    )
  }

  const vurdering: LivsvarigAfpOffentligVurdering = {
    utfall: 'innvilget',
    tpNummer: tpLeverandor.tpInfo.tpNummer,
    belop: [
      {
        belop,
        fomDato: parsedForm.virkFom,
      },
    ],
    virkFom: parsedForm.virkFom,
    sistRegulert,
  }

  try {
    await api.lagreVurdering(vurdering)
    return redirect(`/behandling/${behandlingId}?justCompleted=${aktivitetId}`)
  } catch {
    return data(
      {
        errors: {
          _form: 'Det oppstod en feil ved lagring av vurderingen',
        } as FormErrors<{
          tpLeverandor: string
          virkFom: string
          belop: string
          utfall: string
          sistRegulert: string
        }>,
      },
      { status: 500 },
    )
  }
}

export default function LivsvarigAfpOffentligRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { grunnlag, vurdering, readOnly, pensjonsoversiktUrl, psakOppgaveoversikt, visMedMulighetForVurdering } =
    loaderData
  const { errors } = actionData || {}
  const { aktivitet, behandling, avbrytAktivitet } = useOutletContext<AktivitetOutletContext>()

  if (visMedMulighetForVurdering) {
    return (
      <AfpLivsvarigVurdering
        readOnly={readOnly}
        grunnlag={grunnlag}
        vurdering={vurdering}
        aktivitet={aktivitet}
        behandling={behandling}
        pensjonsoversiktUrl={pensjonsoversiktUrl}
        psakOppgaveoversikt={psakOppgaveoversikt}
        avbrytAktivitet={avbrytAktivitet}
        errors={errors}
      />
    )
  } else {
    return (
      <AfpLivsvarigVenterWrapper
        readOnly={readOnly}
        grunnlag={grunnlag}
        vurdering={vurdering}
        aktivitet={aktivitet}
        behandling={behandling}
        pensjonsoversiktUrl={pensjonsoversiktUrl}
        psakOppgaveoversikt={psakOppgaveoversikt}
        avbrytAktivitet={avbrytAktivitet}
        errors={errors}
      />
    )
  }
}

function AfpLivsvarigVurdering(
  props: Props & {
    errors?: FormErrors<{
      tpLeverandor: string
      virkFom: string
      belop: string
      utfall: string
      sistRegulert: string
    }>
  },
) {
  const { grunnlag, vurdering, readOnly, aktivitet, avbrytAktivitet, errors } = props

  const soknadTpLeverandorer = grunnlag.afpOffentligStatus
    .filter(status => status.status === 'soknad' || status.status === 'ukjent')
    .sort((a, b) => {
      if (a.status === 'soknad' && b.status === 'ukjent') return -1
      if (a.status === 'ukjent' && b.status === 'soknad') return 1
      return 0
    })

  const [selectedUtfall, setSelectedUtfall] = React.useState<string | undefined>(
    vurdering?.utfall === 'innvilget' ? 'innvilget' : vurdering?.utfall === 'ingen' ? 'ingen' : undefined,
  )

  const sortedGrunnbelop = [...grunnlag.grunnbelop].sort(
    (a, b) => new Date(b.fomDato).getTime() - new Date(a.fomDato).getTime(),
  )
  const defaultSistRegulert =
    vurdering?.utfall === 'innvilget'
      ? vurdering.sistRegulert.toString()
      : sortedGrunnbelop.length > 0
        ? sortedGrunnbelop[0].grunnbelop.toString()
        : ''

  const { inputProps, datepickerProps } = useDatepicker({
    defaultSelected: vurdering?.utfall === 'innvilget' && vurdering.virkFom ? new Date(vurdering.virkFom) : undefined,
    required: true,
  })

  const detailsContent = (
    <VStack gap="space-40">
      <VStack gap="space-16">
        <VStack gap="space-40">
          <BodyLong>
            Det er søkt om livsvarig AFP for offentlig sektor. Maskinen sender saken til attestering når
            tjenestepensjonsleverandør har svart.
          </BodyLong>
          <VStack>
            <Heading size="small" level="3" spacing>
              Hvorfor venter vi på tjenestepensjonsleverandør?
            </Heading>

            <BodyLong>
              Søkeren har ikke nok opptjening til å få innvilget alderspensjon alene, men kan ha rett til alderspensjon
              om den kombineres med livsvarig AFP.
            </BodyLong>
          </VStack>
        </VStack>
      </VStack>

      <VStack gap="space-24">
        <div>
          <Heading level="2" size="small">
            Søknader om AFP offentlig
          </Heading>
          <BodyShort size="small" textColor="subtle">
            Informasjon fra TP-registeret
          </BodyShort>
        </div>

        <HGrid columns={{ sm: 1, md: 2 }} gap="4">
          {soknadTpLeverandorer.map(leverandor => (
            <SoknadDisplay key={leverandor.tpInfo.tpNummer} soknad={leverandor} />
          ))}
        </HGrid>
      </VStack>

      {!readOnly && (
        <VStack gap="space-8">
          <BodyShort size="small" textColor="subtle">
            Sist oppdatert {formatDateToNorwegian(aktivitet.sisteAktiveringsdato, { showTime: true })}
          </BodyShort>
          <BodyShort size="small" textColor="subtle">
            Neste oppdatering {formatDateToNorwegian(aktivitet.utsattTil, { showTime: true })}
          </BodyShort>
        </VStack>
      )}
    </VStack>
  )

  const sidebar = (
    <Form method="post" className="decision-form">
      <VStack gap="6">
        <div>
          <Heading level="2" size="small" spacing>
            Vurder AFP offentlig
          </Heading>
          <BodyLong>Velg om AFP offentlig er innvilget eller avslått.</BodyLong>
        </div>

        {!readOnly ? (
          <VStack gap="6">
            {soknadTpLeverandorer.length > 0 ? (
              <>
                <RadioGroup
                  legend="Vurdering"
                  name="utfall"
                  defaultValue={selectedUtfall}
                  onChange={setSelectedUtfall}
                  size="small"
                  error={errors?.utfall}
                >
                  <Radio value="innvilget">Innvilget</Radio>
                  <Radio value="ingen">Avslått</Radio>
                </RadioGroup>

                {selectedUtfall === 'innvilget' && (
                  <VStack gap="4">
                    {soknadTpLeverandorer.length > 1 && (
                      <Select
                        label="Velg søknad"
                        name="tpLeverandor"
                        defaultValue={vurdering?.utfall === 'innvilget' ? vurdering.tpNummer.toString() : ''}
                        size="small"
                        error={errors?.tpLeverandor}
                      >
                        <option value="">Velg TP-leverandør</option>
                        {soknadTpLeverandorer.map(leverandor => (
                          <option key={leverandor.tpInfo.tpNummer} value={leverandor.tpInfo.tpNummer}>
                            {leverandor.tpInfo.tpNavn} ({leverandor.tpInfo.tpNummer})
                          </option>
                        ))}
                      </Select>
                    )}

                    {soknadTpLeverandorer.length === 1 && (
                      <input type="hidden" name="tpLeverandor" value={soknadTpLeverandorer[0].tpInfo.tpNummer} />
                    )}

                    <TextField
                      label="Beløp per måned (kr)"
                      name="belop"
                      type="number"
                      size="small"
                      defaultValue={
                        vurdering?.utfall === 'innvilget' && vurdering.belop.length > 0
                          ? vurdering.belop[0].belop.toString()
                          : ''
                      }
                      error={errors?.belop}
                    />

                    {sortedGrunnbelop.length > 1 ? (
                      <Select
                        label="Sist regulert"
                        name="sistRegulert"
                        defaultValue={defaultSistRegulert}
                        size="small"
                        error={errors?.sistRegulert}
                      >
                        {sortedGrunnbelop.map(gb => {
                          const year = new Date(gb.fomDato).getFullYear()
                          return (
                            <option key={gb.fomDato} value={gb.grunnbelop}>
                              {year} ({formatCurrencyNok(gb.grunnbelop)})
                            </option>
                          )
                        })}
                      </Select>
                    ) : sortedGrunnbelop.length === 1 ? (
                      <>
                        <TextField
                          label="Sist regulert"
                          value={formatCurrencyNok(sortedGrunnbelop[0].grunnbelop)}
                          size="small"
                          readOnly
                        />
                        <input type="hidden" name="sistRegulert" value={sortedGrunnbelop[0].grunnbelop} />
                      </>
                    ) : (
                      <TextField
                        label="Sist regulert"
                        name="sistRegulert"
                        type="number"
                        size="small"
                        defaultValue={defaultSistRegulert}
                        error={errors?.sistRegulert}
                      />
                    )}

                    <DatePicker dropdownCaption {...datepickerProps}>
                      <DatePicker.Input
                        {...inputProps}
                        size="small"
                        label="Virkningsdato (f.o.m.)"
                        name="virkFom"
                        error={errors?.virkFom}
                      />
                    </DatePicker>
                  </VStack>
                )}

                {errors?._form && <Alert variant="error">{errors._form}</Alert>}

                <Button type="submit" variant="primary" size="small">
                  Lagre vurdering
                </Button>
              </>
            ) : (
              <VStack gap="4">
                <BodyLong>Det finnes ingen søknader om AFP offentlig.</BodyLong>
                <Button type="submit" name="utfall" value="ingen" variant="primary" size="small">
                  Lagre avvist/ingen
                </Button>
              </VStack>
            )}

            <Button type="button" variant="tertiary" size="small" onClick={avbrytAktivitet}>
              Avbryt behandling i pilot
            </Button>
          </VStack>
        ) : (
          <VStack gap="6">
            <RadioGroup legend="Vurdering" value={vurdering?.utfall || ''} size="small" readOnly>
              <Radio value="innvilget">Innvilget</Radio>
              <Radio value="ingen">Avslått</Radio>
            </RadioGroup>

            {vurdering?.utfall === 'innvilget' && (
              <VStack gap="4">
                {soknadTpLeverandorer.length > 1 && (
                  <TextField
                    label="Valgt søknad"
                    value={(() => {
                      const tp = soknadTpLeverandorer.find(tp => tp.tpInfo.tpNummer === vurdering.tpNummer)
                      return tp ? `${tp.tpInfo.tpNavn} (${tp.tpInfo.tpNummer})` : 'Ukjent'
                    })()}
                    size="small"
                    readOnly
                  />
                )}

                <TextField
                  label="Beløp per måned (kr)"
                  value={vurdering.belop.length > 0 ? vurdering.belop[0].belop.toString() : ''}
                  size="small"
                  readOnly
                />

                <TextField
                  label="Sist regulert"
                  value={(() => {
                    const gb = sortedGrunnbelop.find(g => Number(g.grunnbelop) === Number(vurdering.sistRegulert))
                    const year = gb ? new Date(gb.fomDato).getFullYear() : ''
                    return year
                      ? `${year} (${formatCurrencyNok(vurdering.sistRegulert)})`
                      : formatCurrencyNok(vurdering.sistRegulert)
                  })()}
                  size="small"
                  readOnly
                />

                <TextField
                  label="Virkningsdato"
                  value={formatDateToNorwegian(vurdering.virkFom)}
                  size="small"
                  readOnly
                />
              </VStack>
            )}
          </VStack>
        )}
      </VStack>
    </Form>
  )

  return (
    <AktivitetVurderingLayout aktivitet={aktivitet} sidebar={sidebar}>
      {detailsContent}
    </AktivitetVurderingLayout>
  )
}

function AfpLivsvarigVenterWrapper(props: Props) {
  if (props.grunnlag.afpOffentligStatus.some(isSoknad)) {
    const soknad = props.grunnlag.afpOffentligStatus.find(isSoknad)
    if (!soknad) return null
    return (
      <AfpLivsvarigVenter
        soknad={soknad}
        aktivitet={props.aktivitet}
        pensjonsoversiktUrl={props.pensjonsoversiktUrl}
        psakOppgaveoversikt={props.psakOppgaveoversikt}
        avbrytAktivitet={props.avbrytAktivitet}
      />
    )
  }
  throw Error('Bare ukjent svar fra TP-ordninger i Livsvarig AFP Offentlig aktivitet')
}

export const Component = AfpLivsvarigVurdering
