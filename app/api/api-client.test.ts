import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isApiError } from '~/api/error.types'

vi.mock('~/auth/auth.server', () => ({
  requireAccessToken: vi.fn().mockResolvedValue('test-token'),
}))

vi.mock('~/utils/env.server', () => ({
  isMockEnv: false,
}))

describe('fetcher error-håndtering', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('mapper application/problem+json til en ApiErrorData-kompatibel feil med violations', async () => {
    const { fetcher } = await import('./api-client')

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          type: 'about:blank',
          title: 'Valideringsfeil',
          status: 400,
          detail: 'Validering av vurdering feilet (2 feil)',
          violations: ['Feil A', 'Feil B'],
        }),
        { status: 400, headers: { 'content-type': 'application/problem+json;charset=UTF-8' } },
      ),
    )

    const request = new Request('https://app.intern.nav.no/path')
    const doFetch = fetcher('https://pen', request)

    const error = await doFetch('/vurdering', { method: 'POST' }).then(
      () => null,
      (e: unknown) => e,
    )

    expect(isApiError(error)).toBe(true)
    if (!isApiError(error)) throw new Error('forventet ApiError')
    expect(error.data.status).toBe(400)
    expect(error.data.title).toBe('Valideringsfeil')
    expect(error.data.violations).toEqual(['Feil A', 'Feil B'])
  })

  it('mapper application/json-feil til flate felter med traceId fra traceparent', async () => {
    const { fetcher } = await import('./api-client')

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Feil', message: 'Noe gikk galt', path: '/vurdering' }), {
        status: 500,
        headers: {
          'content-type': 'application/json',
          traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
        },
      }),
    )

    const request = new Request('https://app.intern.nav.no/path')
    const doFetch = fetcher('https://pen', request)

    const error = await doFetch('/vurdering', { method: 'GET' }).then(
      () => null,
      (e: unknown) => e,
    )

    if (!isApiError(error)) throw new Error('forventet ApiError')
    expect(error.data.status).toBe(500)
    expect(error.data.title).toBe('Feil')
    expect(error.data.message).toBe('Noe gikk galt')
    expect(error.data.traceId).toBe('0af7651916cd43dd8448eb211c80319c')
  })

  it('redigerer bort JWT-lignende tokens fra feilmeldinger', async () => {
    const { fetcher } = await import('./api-client')

    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc-DEF_123'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Feil', message: `Ugyldig token: ${jwt}` }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const request = new Request('https://app.intern.nav.no/path')
    const doFetch = fetcher('https://pen', request)

    const error = await doFetch('/vurdering', { method: 'GET' }).then(
      () => null,
      (e: unknown) => e,
    )

    if (!isApiError(error)) throw new Error('forventet ApiError')
    expect(error.data.message).toBe('Ugyldig token: [REDACTED]')
    expect(error.data.message).not.toContain(jwt)
  })

  it('bevarer rå tekst som melding når feilrespons ikke er gyldig JSON', async () => {
    const { fetcher } = await import('./api-client')

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Internal Server Error: database connection failed', {
        status: 502,
        headers: { 'content-type': 'text/plain' },
      }),
    )

    const request = new Request('https://app.intern.nav.no/path')
    const doFetch = fetcher('https://pen', request)

    const error = await doFetch('/vurdering', { method: 'GET' }).then(
      () => null,
      (e: unknown) => e,
    )

    if (!isApiError(error)) throw new Error('forventet ApiError')
    expect(error.data.message).toBe('Internal Server Error: database connection failed')
  })
})

describe('fetcher suksess-håndtering', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('parser application/json-svar', async () => {
    const { fetcher } = await import('./api-client')

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ saker: [{ sakId: 1 }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const request = new Request('https://app.intern.nav.no/path')
    const doFetch = fetcher('https://pen', request)

    const result = await doFetch<{ saker: { sakId: number }[] }>('/grunnlagsdata', { method: 'GET' })

    expect(result).toEqual({ saker: [{ sakId: 1 }] })
  })

  it('returnerer undefined for et 200-svar uten JSON-kropp (tomt grunnlagsdata-svar / void POST)', async () => {
    const { fetcher } = await import('./api-client')

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }))

    const request = new Request('https://app.intern.nav.no/path')
    const doFetch = fetcher('https://pen', request)

    const result = await doFetch('/vurdering', { method: 'POST' })

    expect(result).toBeUndefined()
  })
})
