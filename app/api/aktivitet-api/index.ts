export type { AktivitetApiParams } from './aktivitet-api.server'

import type {
  unstable_MiddlewareFunction as MiddlewareFunction,
  unstable_RouterContext as RouterContext,
} from 'react-router'
import { authCtx } from '~/context'

interface AktivitetApiParams {
  context: RouterContext
  request: Request
  behandlingId: string
  aktivitetId: string
}

export function createAktivitetApi({ context, request, behandlingId, aktivitetId }: AktivitetApiParams) {
  const auth = context.get(authCtx)

  if (!auth) {
    throw new Error('Auth context not available - ensure auth middleware is configured')
  }

  return {
    auth,
    behandlingId,
    aktivitetId,
  }
}
