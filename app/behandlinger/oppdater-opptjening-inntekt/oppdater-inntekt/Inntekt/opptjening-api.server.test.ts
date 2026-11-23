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

const redirectResponse = new Response(null, { status: 302, headers: { Location: '/aktivitet?forrigeKjoring=abc' } })
const api = { lagreVurderingOgFortsett: vi.fn() }

beforeEach(() => {
  api.lagreVurderingOgFortsett.mockReset().mockResolvedValue(redirectResponse)
  vi.mocked(createAktivitetApi).mockReturnValue(api as never)
})

describe('lagreOpptjeningVurdering for inntekt', () => {
  it('sender de berørte årene med begrunnelse', async () => {
    const payload = {
      inntekterPerAr: [{ inntektAr: 2020, inntekterPgi: [], inntekterFilformat: [] }],
    }

    const result = await lagre(payload)

    expect(api.lagreVurderingOgFortsett).toHaveBeenCalledWith({ ...payload, begrunnelse: 'Feil lønn' })
    expect(result).toBe(redirectResponse)
  })

  it.each([
    ['ingen berørte år', { inntekterPerAr: [] }],
    ['omsorg-payload', { omsorgTilSletting: [{ ar: 2020, omsorgType: 'OBU6' }] }],
  ])('lagrer ikke når payload har %s', async (_beskrivelse, payload) => {
    const result = await lagre(payload)

    expect(result).toMatchObject({ data: { errors: { _form: 'Ingen endringer er registrert' } } })
    expect(api.lagreVurderingOgFortsett).not.toHaveBeenCalled()
  })
})
