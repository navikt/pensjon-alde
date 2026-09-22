import { data, redirect } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import { isApiError } from '~/api/error.types'
import { fetchOpptjeningstyper } from '~/api/opptjeningstyper-api.server'
import type { ActionErrors, OppdaterOpptjeningGrunnlag, OppdaterOpptjeningVurdering } from './opptjening-types'

const MANGLER_ROLLE = 'Mangler rolle tilgang. Kun saksbehandlere med tilleggsrolle «Spesial PGI» kan lagre endringer.'

interface AktivitetRef {
  request: Request
  behandlingId?: string
  aktivitetId?: string
}

export async function hentOpptjeningLoaderData({ request, behandlingId, aktivitetId }: AktivitetRef) {
  const api = createAktivitetApi({ request, behandlingId, aktivitetId })

  let grunnlag: OppdaterOpptjeningGrunnlag = {}
  let readOnly = false

  try {
    grunnlag = (await api.hentGrunnlagsdata<OppdaterOpptjeningGrunnlag>()) ?? {}
  } catch (error) {
    if (isApiError(error) && error.data.status === 403) {
      readOnly = true
    } else {
      throw error
    }
  }

  const opptjeningstyper = await fetchOpptjeningstyper(request)

  return { grunnlag, opptjeningstyper, readOnly }
}

/**
 * Felles action for opptjeningsskjemaene. `valider` kjøres på den parsede payloaden og
 * returnerer feilmeldinger som blokkerer lagring, `normaliser` kan rydde payloaden før sending.
 */
export async function lagreOpptjeningVurdering({
  request,
  behandlingId,
  aktivitetId,
  valider,
  normaliser,
}: AktivitetRef & {
  valider?: (payload: OppdaterOpptjeningVurdering) => string[]
  normaliser?: (payload: OppdaterOpptjeningVurdering) => OppdaterOpptjeningVurdering
}) {
  const api = createAktivitetApi({ request, behandlingId, aktivitetId })

  const formData = await request.formData()
  const sakIdRaw = formData.get('sakId')
  const payloadRaw = formData.get('payload')

  if (typeof payloadRaw !== 'string' || payloadRaw.length === 0) {
    return data({ errors: { _form: 'Mangler skjemadata' } as ActionErrors }, { status: 400 })
  }

  let payload: OppdaterOpptjeningVurdering

  try {
    payload = JSON.parse(payloadRaw)
  } catch {
    return data({ errors: { _form: 'Ugyldig skjemadata' } as ActionErrors }, { status: 400 })
  }

  const validationErrors = valider?.(payload) ?? []
  if (validationErrors.length > 0) {
    return data({ errors: { _form: validationErrors.join('. ') } as ActionErrors }, { status: 400 })
  }

  const sakId = sakIdRaw ? Number(sakIdRaw) : undefined
  if (sakIdRaw && (Number.isNaN(sakId as number) || !Number.isInteger(sakId))) {
    return data({ errors: { _form: 'Ugyldig sakId' } as ActionErrors }, { status: 400 })
  }

  const vurdering: OppdaterOpptjeningVurdering = {
    ...(sakId !== undefined ? { sakId } : {}),
    ...(normaliser ? normaliser(payload) : payload),
  }

  try {
    await api.lagreVurdering(vurdering)
    return redirect(`/behandling/${behandlingId}?justCompleted=${aktivitetId}`)
  } catch (error) {
    if (isApiError(error)) {
      if (error.data.status === 400) {
        const meldinger = error.data.violations?.length
          ? error.data.violations
          : [error.data.message ?? 'POPP-validering feilet']
        return data({ errors: { _server: meldinger } as ActionErrors }, { status: 400 })
      }
      if (error.data.status === 403) {
        return data({ errors: { _server: [MANGLER_ROLLE] } as ActionErrors }, { status: 403 })
      }
    }
    return data({ errors: { _server: ['Det oppstod en feil ved lagring'] } as ActionErrors }, { status: 500 })
  }
}
