import type { unstable_MiddlewareFunction as MiddlewareFunction } from 'react-router'
import { requireAccessToken } from '~/auth/auth.server'
import { authCtx } from '~/context'

const authMiddleware: MiddlewareFunction = async ({ request, context }, next) => {
  const token = await requireAccessToken(request)

  context.set(authCtx, {
    token,
  })

  return next()
}

export default authMiddleware
