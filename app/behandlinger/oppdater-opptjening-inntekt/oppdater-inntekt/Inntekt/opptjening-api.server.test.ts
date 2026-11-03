import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('~/api/aktivitet-api', () => ({
  createAktivitetApi: vi.fn(),
}))

const { createAktivitetApi } = await import('~/api/aktivitet-api')
const { lagreOpptjeningVurdering } = await import('./opptjening-api.server')

function lagre(payload: unknown) {
  const formData = new FormData()
  formData.set('payload', JSON.stringify(payload))
  formData.set('begrunnelse', ' Feil lønn ')
  const request = new Request('http://localhost/aktivitet', { method: 'POST', body: formData })
  return lagreOpptjeningVurdering({ request, behandlingId: '1', aktivitetId: '2' })
}

const api = { lagreVurdering: vi.fn().mockResolvedValue(undefined) }

beforeEach(() => {
  api.lagreVurdering.mockClear()
  vi.mocked(createAktivitetApi).mockReturnValue(api as never)
})

describe('lagreOpptjeningVurdering for inntekt', () => {
  it('sender de berørte årene med begrunnelse', async () => {
    const payload = {
      inntekterPerAr: [{ inntektAr: 2020, inntekterPgi: [], inntekterFilformat: [] }],
    }

    const result = await lagre(payload)

    expect(api.lagreVurdering).toHaveBeenCalledWith({ ...payload, begrunnelse: 'Feil lønn' })
    expect(result).toBeInstanceOf(Response)
  })

  it.each([
    ['ingen berørte år', { inntekterPerAr: [] }],
    ['omsorg-payload', { omsorgTilSletting: [{ ar: 2020, omsorgType: 'OBU6' }] }],
  ])('lagrer ikke når payload har %s', async (_beskrivelse, payload) => {
    const result = await lagre(payload)

    expect(result).toMatchObject({ data: { errors: { _form: 'Ingen endringer er registrert' } } })
    expect(api.lagreVurdering).not.toHaveBeenCalled()
  })
})
