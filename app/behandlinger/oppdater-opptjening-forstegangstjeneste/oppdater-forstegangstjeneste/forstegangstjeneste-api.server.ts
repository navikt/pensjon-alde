import { data, redirect } from 'react-router'
import { z } from 'zod'
import { createAktivitetApi } from '~/api/aktivitet-api'
import { createBehandlingApi } from '~/api/behandling-api'
import { isApiError } from '~/api/error.types'
import type { ActionErrors, ForstegangstjenesteGrunnlag } from './forstegangstjeneste.types'
import { erGyldigDato } from './forstegangstjeneste.utils'

const dato = z.string().refine(erGyldigDato)
const kode = z.string().trim().min(1)
const tilLagringSchema = z
  .object({
    tjenestestartDato: dato,
    dimitteringDato: dato,
    forstegangstjenestePeriodeListe: z
      .array(
        z
          .object({ periodeType: kode, tjenesteType: kode, fomDato: dato, tomDato: dato })
          .refine(periode => periode.fomDato <= periode.tomDato),
      )
      .min(1),
  })
  .refine(tjeneste => tjeneste.tjenestestartDato <= tjeneste.dimitteringDato)
const payloadSchema = z.object({
  forstegangstjenesteTilLagring: tilLagringSchema.nullish(),
  slettForstegangstjeneste: z.boolean().optional(),
})

type AktivitetRef = { request: Request; behandlingId?: string; aktivitetId?: string }

export async function hentForstegangstjenesteGrunnlag(ref: AktivitetRef) {
  try {
    const grunnlag = (await createAktivitetApi(ref).hentGrunnlagsdata<ForstegangstjenesteGrunnlag>()) ?? {}
    return { grunnlag, readOnly: false }
  } catch (error) {
    if (isApiError(error) && error.data.status === 403)
      return { grunnlag: {} as ForstegangstjenesteGrunnlag, readOnly: true }
    throw error
  }
}

export async function lagreForstegangstjenesteVurdering(ref: AktivitetRef) {
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
  if (!parsed.success)
    return feil({ _form: 'Ugyldige data for førstegangstjeneste. Kontroller datoer, typer og perioder.' }, 400)
  const { forstegangstjenesteTilLagring, slettForstegangstjeneste } = parsed.data
  if (!forstegangstjenesteTilLagring && !slettForstegangstjeneste)
    return feil({ _form: 'Ingen endringer er registrert.' }, 400)
  if (forstegangstjenesteTilLagring && slettForstegangstjeneste)
    return feil({ _form: 'Førstegangstjenesten kan ikke både lagres og slettes.' }, 400)

  try {
    if (!ref.behandlingId) throw new Error('Mangler behandlingId')
    const { fnr } = await createBehandlingApi({
      request: ref.request,
      behandlingId: ref.behandlingId,
    }).hentToppbarinfo()
    if (!fnr) return feil({ _form: 'Mangler fødselsnummer på behandlingen.' }, 400)
    const begrunnelse = formData.get('begrunnelse')?.toString().trim()
    await createAktivitetApi(ref).lagreVurdering({
      sakId,
      fnr,
      ...(slettForstegangstjeneste ? { slettForstegangstjeneste: true } : { forstegangstjenesteTilLagring }),
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
