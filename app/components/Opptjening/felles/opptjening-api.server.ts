import { data, redirect } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import { isApiError } from '~/api/error.types'
import type { ActionErrors, OppdaterOpptjeningGrunnlag, OppdaterOpptjeningVurdering } from './opptjening-types'
import { opptjeningstyperFraGrunnlag } from './opptjeningstyper.utils'

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

  const opptjeningstyper = opptjeningstyperFraGrunnlag(grunnlag)

  return { grunnlag, opptjeningstyper, readOnly }
}

export async function lagreOpptjeningVurdering({ request, behandlingId, aktivitetId }: AktivitetRef) {
  const api = createAktivitetApi({ request, behandlingId, aktivitetId })

  const formData = await request.formData()
  const sakIdRaw = formData.get('sakId')
  const payloadRaw = formData.get('payload')
  const begrunnelse = formData.get('begrunnelse')?.toString().trim()

  if (typeof payloadRaw !== 'string' || payloadRaw.length === 0) {
    return data({ errors: { _form: 'Mangler skjemadata' } as ActionErrors }, { status: 400 })
  }

  let payload: OppdaterOpptjeningVurdering

  try {
    payload = JSON.parse(payloadRaw)
  } catch {
    return data({ errors: { _form: 'Ugyldig skjemadata' } as ActionErrors }, { status: 400 })
  }

  if (typeof sakIdRaw !== 'string' || sakIdRaw.trim() === '') {
    return data({ errors: { _form: 'Mangler sakId' } as ActionErrors }, { status: 400 })
  }

  const sakId = Number(sakIdRaw)
  if (!Number.isInteger(sakId)) {
    return data({ errors: { _form: 'Ugyldig sakId' } as ActionErrors }, { status: 400 })
  }

  const vurdering: OppdaterOpptjeningVurdering = {
    ...payload,
    sakId,
  }

  try {
    await api.lagreVurdering({ ...vurdering, ...(begrunnelse ? { begrunnelse } : {}) })
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
