import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isApiError } from '~/api/error.types'

vi.mock('~/auth/auth.server', () => ({
  requireAccessToken: vi.fn().mockResolvedValue('test-token'),
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
})
