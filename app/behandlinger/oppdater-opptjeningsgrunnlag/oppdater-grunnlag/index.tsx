import { PlusIcon, TrashIcon } from '@navikt/aksel-icons'
import { Alert, Box, Button, Heading, HStack, Page, Select, Table, TextField, VStack } from '@navikt/ds-react'
import { useState } from 'react'
import { data, Form, redirect, useNavigation, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import styles from '~/common.module.css'
import type { FormErrors } from '~/types/aktivitet-component'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import type { Route } from './+types'
import type {
  OppdaterOpptjeningGrunnlag,
  OppdaterOpptjeningVurdering,
  OppdaterPgiLinje,
  OpptjeningType,
} from './oppdater-grunnlag-types'

const OPPTJENING_TYPER: { value: OpptjeningType; label: string }[] = [
  { value: 'INNTEKT', label: 'Inntekt' },
  { value: 'MILITAER', label: 'Militær' },
  { value: 'DAGPENGER', label: 'Dagpenger' },
  { value: 'OMSORG', label: 'Omsorg' },
]

export function meta() {
  return [{ title: 'Oppdater pensjonsgivende inntekt' }]
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params
  const api = createAktivitetApi({ request, behandlingId, aktivitetId })

  const grunnlag = await api.hentGrunnlagsdata<OppdaterOpptjeningGrunnlag>()
  const vurdering = await api.hentVurdering<OppdaterOpptjeningVurdering>()

  return { grunnlag, vurdering }
}

export async function action({ params, request }: Route.ActionArgs) {
  const { behandlingId, aktivitetId } = params
  const api = createAktivitetApi({ request, behandlingId, aktivitetId })

  const formData = await request.formData()
  const sakIdRaw = formData.get('sakId')
  const linjerRaw = formData.get('linjer')

  const errors: FormErrors<OppdaterOpptjeningVurdering> = {}

  if (!sakIdRaw || sakIdRaw === '') {
    errors.sakId = 'Du må velge en sak'
  }

  if (!linjerRaw || linjerRaw === '') {
    errors.linjer = 'Du må legge til minst én opptjeningslinje'
  }

  let linjer: OppdaterPgiLinje[] = []
  if (linjerRaw) {
    try {
      linjer = JSON.parse(linjerRaw as string)
    } catch {
      errors.linjer = 'Ugyldig format på opptjeningslinjer'
    }
  }

  if (linjer.length === 0 && !errors.linjer) {
    errors.linjer = 'Du må legge til minst én opptjeningslinje'
  }

  if (Object.keys(errors).length > 0) {
    return data({ errors }, { status: 400 })
  }

  const vurdering: OppdaterOpptjeningVurdering = {
    sakId: Number(sakIdRaw),
    linjer,
  }

  try {
    await api.lagreVurdering(vurdering)
    return redirect(`/behandling/${behandlingId}?justCompleted=${aktivitetId}`)
  } catch {
    return data(
      { errors: { _form: 'Det oppstod en feil ved lagring' } as FormErrors<OppdaterOpptjeningVurdering> },
      { status: 500 },
    )
  }
}

type LinjeState = OppdaterPgiLinje & { id: string }

function lagTomLinje(): LinjeState {
  return { id: crypto.randomUUID(), type: 'INNTEKT', aar: new Date().getFullYear() }
}

export default function OppdaterGrunnlagRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { grunnlag, vurdering } = loaderData
  const { errors } = actionData || {}
  const { avbrytAktivitet } = useOutletContext<AktivitetOutletContext>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state !== 'idle' && navigation.formData != null

  const [linjer, setLinjer] = useState<LinjeState[]>(
    vurdering?.linjer?.map(l => ({ ...l, id: crypto.randomUUID() })) ?? [lagTomLinje()],
  )
  const [selectedSakId, setSelectedSakId] = useState<string>(vurdering?.sakId?.toString() ?? '')

  const leggTilLinje = () => setLinjer(prev => [...prev, lagTomLinje()])

  const fjernLinje = (id: string) => setLinjer(prev => prev.filter(l => l.id !== id))

  const oppdaterLinje = (id: string, felt: keyof OppdaterPgiLinje, verdi: string) => {
    setLinjer(prev =>
      prev.map(l => {
        if (l.id !== id) return l
        if (felt === 'aar') return { ...l, aar: Number(verdi) || l.aar }
        return { ...l, [felt]: verdi || null }
      }),
    )
  }

  const linjerForSubmit: OppdaterPgiLinje[] = linjer.map(({ id: _id, ...rest }) => rest)

  return (
    <Page.Block gutters className={styles.page}>
      <VStack gap="space-32">
        <Heading size="medium" level="2">
          Oppdater pensjonsgivende inntekt
        </Heading>

        {errors?._form && <Alert variant="error">{errors._form}</Alert>}

        <Form method="post">
          <VStack gap="space-24">
            <Box>
              <Heading size="small" level="3" spacing>
                Velg sak
              </Heading>
              {(grunnlag.saker ?? []).length === 0 ? (
                <Alert variant="info">
                  {grunnlag.kanOppretteGenerellSak
                    ? 'Ingen eksisterende saker funnet. En generell sak vil bli opprettet.'
                    : 'Ingen saker funnet for denne personen.'}
                </Alert>
              ) : (
                <Select
                  label="Sak"
                  name="sakId"
                  value={selectedSakId}
                  onChange={e => setSelectedSakId(e.target.value)}
                  error={errors?.sakId}
                >
                  <option value="">Velg sak</option>
                  {(grunnlag.saker ?? []).map(sak => (
                    <option key={sak.sakId} value={sak.sakId}>
                      {sak.sakId}
                      {sak.sakType ? ` – ${sak.sakType}` : ''}
                      {sak.sakStatus ? ` (${sak.sakStatus})` : ''}
                    </option>
                  ))}
                </Select>
              )}
            </Box>

            <Box>
              <Heading size="small" level="3" spacing>
                Opptjeningslinjer
              </Heading>

              {errors?.linjer && <Alert variant="error">{errors.linjer}</Alert>}

              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Type</Table.HeaderCell>
                    <Table.HeaderCell>År</Table.HeaderCell>
                    <Table.HeaderCell>Beløp</Table.HeaderCell>
                    <Table.HeaderCell>Skattekommune</Table.HeaderCell>
                    <Table.HeaderCell>Kilde</Table.HeaderCell>
                    <Table.HeaderCell />
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {linjer.map(linje => (
                    <Table.Row key={linje.id}>
                      <Table.DataCell>
                        <Select
                          label="Type"
                          hideLabel
                          value={linje.type}
                          onChange={e => oppdaterLinje(linje.id, 'type', e.target.value)}
                        >
                          {OPPTJENING_TYPER.map(t => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </Select>
                      </Table.DataCell>
                      <Table.DataCell>
                        <TextField
                          label="År"
                          hideLabel
                          value={linje.aar.toString()}
                          onChange={e => oppdaterLinje(linje.id, 'aar', e.target.value)}
                          inputMode="numeric"
                          size="small"
                          style={{ width: '6rem' }}
                        />
                      </Table.DataCell>
                      <Table.DataCell>
                        <TextField
                          label="Beløp"
                          hideLabel
                          value={linje.belop ?? ''}
                          onChange={e => oppdaterLinje(linje.id, 'belop', e.target.value)}
                          inputMode="decimal"
                          size="small"
                          style={{ width: '10rem' }}
                        />
                      </Table.DataCell>
                      <Table.DataCell>
                        <TextField
                          label="Skattekommune"
                          hideLabel
                          value={linje.skattekommune ?? ''}
                          onChange={e => oppdaterLinje(linje.id, 'skattekommune', e.target.value)}
                          size="small"
                          style={{ width: '8rem' }}
                        />
                      </Table.DataCell>
                      <Table.DataCell>
                        <TextField
                          label="Kilde"
                          hideLabel
                          value={linje.kilde ?? ''}
                          onChange={e => oppdaterLinje(linje.id, 'kilde', e.target.value)}
                          size="small"
                          style={{ width: '8rem' }}
                        />
                      </Table.DataCell>
                      <Table.DataCell>
                        <Button
                          type="button"
                          variant="tertiary-neutral"
                          size="small"
                          icon={<TrashIcon aria-hidden />}
                          onClick={() => fjernLinje(linje.id)}
                          disabled={linjer.length === 1}
                        >
                          Fjern
                        </Button>
                      </Table.DataCell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>

              <Box marginBlock="space-12 space-0">
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  icon={<PlusIcon aria-hidden />}
                  onClick={leggTilLinje}
                >
                  Legg til linje
                </Button>
              </Box>
            </Box>

            <input type="hidden" name="linjer" value={JSON.stringify(linjerForSubmit)} />

            <HStack gap="space-8">
              <Button type="submit" variant="primary" size="small" loading={isSubmitting}>
                Lagre og gå videre
              </Button>
              <Button type="button" variant="tertiary" size="small" onClick={avbrytAktivitet} disabled={isSubmitting}>
                Avbryt behandling
              </Button>
            </HStack>
          </VStack>
        </Form>
      </VStack>
    </Page.Block>
  )
}
