import { data } from 'react-router'
import type { ProblemDetails } from '~/api/error.types'
import { requireAccessToken } from '~/auth/auth.server'
import { parseTraceparent } from '~/utils/traceparent'

export type Fetcher = <T>(url: string, options: RequestInit) => Promise<T>

export const fetcher =
  (BASE_URL: string, request: Request): Fetcher =>
  async <T>(url: string, options: RequestInit = {}): Promise<T> => {
    const token = process.env.NODE_ENV === 'mock' ? 'mock-token' : await requireAccessToken(request)
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
        const problemDetails = (await response.json()) as ProblemDetails & { violations?: string[] }

        throw data(
          {
            // Flat felter i tillegg til problemDetails, slik at isApiError() og kallere som
            // leser error.data.status/violations (f.eks. validering fra pen) fungerer.
            // problemDetails beholdes for ErrorBoundary (root.tsx).
            status: problemDetails.status ?? response.status,
            title: problemDetails.title || response.statusText || 'API Error',
            message: problemDetails.detail,
            detail: problemDetails.detail,
            violations: problemDetails.violations,
            problemDetails: problemDetails,
            traceId: traceId(),
          },
          {
            status: response.status,
            statusText: response.statusText,
          },
        )
      } else {
        const errorText = await response.text()
        let errorBody: { error?: string; message?: string; detail?: string; path?: string; timestamp?: string } = {}
        try {
          errorBody = JSON.parse(errorText)
        } catch {
          errorBody = {}
        }

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
