import { data, redirect } from 'react-router'
import { z } from 'zod'
import { createAktivitetApi } from '~/api/aktivitet-api'
import { createBehandlingApi } from '~/api/behandling-api'
import { isApiError } from '~/api/error.types'
import type { ActionErrors, DagpengerGrunnlag } from './dagpenger.types'

const belop = z.number().int().min(0).max(2147483647)
const nokkel = z.object({ ar: z.number().int().min(1900).max(9999), dagpengerType: z.string().trim().min(1) })
const payloadSchema = z.object({
  dagpengerTilLagring: z.array(
    nokkel.extend({
      utbetalteDagpenger: belop,
      barnetillegg: belop,
      uavkortetDagpengegrunnlag: belop.nullable().optional(),
      ferietillegg: belop.nullable().optional(),
    }),
  ),
  dagpengerTilSletting: z.array(nokkel),
})

type AktivitetRef = { request: Request; behandlingId?: string; aktivitetId?: string }

export async function hentDagpengerGrunnlag(ref: AktivitetRef) {
  try {
    const grunnlag = (await createAktivitetApi(ref).hentGrunnlagsdata<DagpengerGrunnlag>()) ?? {}
    return { grunnlag, readOnly: false }
  } catch (error) {
    if (isApiError(error) && error.data.status === 403) return { grunnlag: {} as DagpengerGrunnlag, readOnly: true }
    throw error
  }
}

export async function lagreDagpengerVurdering(ref: AktivitetRef) {
  const feil = (errors: ActionErrors, status: number) => data({ errors }, { status })
  const formData = await ref.request.formData()
  const sakIdRaw = formData.get('sakId')
  const sakId = typeof sakIdRaw === 'string' && sakIdRaw.trim() ? Number(sakIdRaw) : NaN
  if (!Number.isSafeInteger(sakId) || sakId <= 0) return feil({ _form: 'Velg en gyldig sak.' }, 400)
  const payloadRaw = formData.get('payload')
  let payload: unknown
  try {
    payload = typeof payloadRaw === 'string' ? JSON.parse(payloadRaw) : null
  } catch {
    return feil({ _form: 'Ugyldig skjemadata.' }, 400)
  }
  const parsed = payloadSchema.safeParse(payload)
  if (!parsed.success) return feil({ _form: 'Ugyldige dagpengedata. Kontroller år, type og beløp.' }, 400)
  const operasjoner = [...parsed.data.dagpengerTilLagring, ...parsed.data.dagpengerTilSletting]
  if (!operasjoner.length) return feil({ _form: 'Ingen endringer er registrert.' }, 400)
  const nokler = operasjoner.map(linje => `${linje.ar}:${linje.dagpengerType}`)
  if (new Set(nokler).size !== nokler.length)
    return feil({ _form: 'Samme år og dagpengertype kan bare forekomme én gang.' }, 400)

  try {
    if (!ref.behandlingId) throw new Error('Mangler behandlingId')
    const { fnr } = await createBehandlingApi({
      request: ref.request,
      behandlingId: ref.behandlingId,
    }).hentToppbarinfo()
    if (!fnr) return feil({ _form: 'Mangler fødselsnummer på behandlingen.' }, 400)
    const begrunnelse = formData.get('begrunnelse')?.toString().trim()
    await createAktivitetApi(ref).lagreVurdering({
      ...parsed.data,
      sakId,
      fnr,
      ...(begrunnelse ? { begrunnelse } : {}),
    })
    return redirect(`/behandling/${ref.behandlingId}?justCompleted=${ref.aktivitetId}`)
  } catch (error) {
    if (isApiError(error)) {
      if (error.data.status === 400)
        return feil(
          {
            _server: error.data.violations?.length
              ? error.data.violations
              : [error.data.message ?? 'POPP-validering feilet'],
          },
          400,
        )
      if (error.data.status === 403)
        return feil({ _server: ['Kun saksbehandlere med tilleggsrolle «Spesial PGI» kan lagre endringer.'] }, 403)
    }
    return feil({ _server: ['Det oppstod en feil ved lagring.'] }, 500)
  }
}
