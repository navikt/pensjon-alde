import { data } from 'react-router'
import type { ProblemDetails } from '~/api/error.types'
import { requireAccessToken } from '~/auth/auth.server'
import { parseTraceparent } from '~/utils/traceparent'

export type Fetcher = <T>(url: string, options: RequestInit) => Promise<T>

export const fetcher =
  (BASE_URL: string, request: Request): Fetcher =>
  async <T>(url: string, options: RequestInit = {}): Promise<T> => {
    const token = await requireAccessToken(request)
    const headers = new Headers(options.headers)
    headers.set('Authorization', `Bearer ${token}`)

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    const mergedOptions: RequestInit = {
      ...options,
      headers,
    }

    const response = await fetch(`${BASE_URL}${url}`, mergedOptions)

    if (!response.ok) {
      function traceId() {
        const traceparent = response.headers.get('traceparent')
        const navTraceId = response.headers.get('nav-call-id')

        if (traceparent !== null) {
          return parseTraceparent(traceparent)?.traceId || navTraceId
        } else {
          return navTraceId
        }
      }

      const contentType = response.headers.get('content-type')

      if (contentType?.includes('application/json')) {
        const errorBody = await response.json()

        throw data(
          {
            status: response.status,
            title: errorBody?.error || response.statusText || 'API Error',
            message: errorBody?.message,
            traceId: traceId(),
            detail: errorBody?.detail,
            path: errorBody?.path,
            timestamp: errorBody?.timestamp,
          },
          {
            status: response.status,
            statusText: response.statusText,
          },
        )
      } else if (contentType?.includes('application/problem+json')) {
        const problemDetails: ProblemDetails = (await response.json()) as ProblemDetails

        throw data(
          {
            problemDetails: problemDetails,
            traceId: traceId(),
          },
          {
            status: response.status,
            statusText: response.statusText,
          },
        )
      } else {
        const errorBody = await response.text()

        throw data(
          {
            status: response.status,
            title: errorBody?.error || response.statusText || 'API Error',
            message: errorBody?.message,
            traceId: traceId(),
            detail: errorBody?.detail,
            path: errorBody?.path,
            timestamp: errorBody?.timestamp,
          },
          {
            status: response.status,
            statusText: response.statusText,
          },
        )
      }
    }

    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      return await response.json()
    }

    return response as unknown as T
  }
