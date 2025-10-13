import type { MiddlewareFunction } from 'react-router'
import { requireAccessToken } from '~/auth/auth.server'
import { type UserContext, userContext } from '~/context/user-context'
import { env } from '~/utils/env.server'

export const userMiddleware: MiddlewareFunction = async ({ request, context }) => {
  const token = await requireAccessToken(request)
  const penUrl = `${env.penUrl}/api/saksbehandling/alde`

  // Fetch me data using token from context
  const meResponse = await fetch(`${penUrl}/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  const me: UserContext = await meResponse.json()
  context.set(userContext, me)
}
