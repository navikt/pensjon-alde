import type { MiddlewareFunction } from 'react-router'
import { requireAccessToken } from '~/auth/auth.server'
import { type UserContext, userContext } from '~/context/user-context'
import { env, isMockEnv } from '~/utils/env.server'

export const userMiddleware: MiddlewareFunction = async ({ request, context }) => {
  const url = new URL(request.url)
  if (url.pathname.includes('/auth')) {
    return
  }

  // I mock-modus bruker vi mock-data uten autentisering
  if (isMockEnv) {
    context.set(userContext, {
      navident: 'Z990000',
      fornavn: 'Mock',
      etternavn: 'Bruker',
      enhet: '0001',
    })
    return
  }

  const token = await requireAccessToken(request)
  const penUrl = `${env.penUrl}/api/saksbehandling/alde`

  // Fetch me data using token from context
  const meResponse = await fetch(`${penUrl}/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!meResponse.ok) {
    throw new Error(`Kunne ikke hente brukerinfo fra /me (${meResponse.status})`)
  }

  const me: UserContext = await meResponse.json()
  context.set(userContext, me)
}
