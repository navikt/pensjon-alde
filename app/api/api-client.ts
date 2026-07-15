import { data } from 'react-router'
import type { ProblemDetails } from '~/api/error.types'
import { requireAccessToken } from '~/auth/auth.server'
import { isMockEnv } from '~/utils/env.server'
import { parseTraceparent } from '~/utils/traceparent'

const JWT_PATTERN = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g

function redactTokens(value: string | undefined): string | undefined {
  return value?.replace(JWT_PATTERN, '[REDACTED]')
}

function extractTraceId(response: Response): string | null {
  const traceparent = response.headers.get('traceparent')
  const navTraceId = response.headers.get('nav-call-id')

  if (traceparent !== null) {
    return parseTraceparent(traceparent)?.traceId || navTraceId
  }

  return navTraceId
}

async function parseBodySafely(response: Response): Promise<{ json?: Record<string, unknown>; text?: string }> {
  const rawText = await response.text()
  try {
    return { json: JSON.parse(rawText) }
  } catch {
    return { text: rawText }
  }
}

async function buildApiError(response: Response) {
  const traceId = extractTraceId(response)
  const contentType = response.headers.get('content-type')
  const { json, text: unparsedText } = await parseBodySafely(response)

  if (contentType?.includes('application/problem+json')) {
    const problemDetails = (json ?? {}) as ProblemDetails & { violations?: string[] }

    return {
      // Flat felter i tillegg til problemDetails, slik at isApiError() og kallere som
      // leser error.data.status/violations (f.eks. validering fra pen) fungerer.
      // problemDetails beholdes for ErrorBoundary (root.tsx).
      status: problemDetails.status ?? response.status,
      title: redactTokens(problemDetails.title) || response.statusText || 'API Error',
      message: redactTokens(problemDetails.detail ?? unparsedText),
      detail: redactTokens(problemDetails.detail ?? unparsedText),
      violations: problemDetails.violations,
      problemDetails: { ...problemDetails, detail: redactTokens(problemDetails.detail) },
      traceId,
    }
  }

  const errorBody = (json ?? {}) as {
    error?: string
    message?: string
    detail?: string
    path?: string
    timestamp?: string
  }

  return {
    status: response.status,
    title: redactTokens(errorBody.error) || response.statusText || 'API Error',
    message: redactTokens(errorBody.message ?? unparsedText),
    traceId,
    detail: redactTokens(errorBody.detail ?? unparsedText),
    path: errorBody.path,
    timestamp: errorBody.timestamp,
  }
}

export type Fetcher = <T>(url: string, options: RequestInit) => Promise<T>

export const fetcher =
  (BASE_URL: string, request: Request): Fetcher =>
  async <T>(url: string, options: RequestInit = {}): Promise<T> => {
    const token = isMockEnv ? 'mock-token' : await requireAccessToken(request)
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
      throw data(await buildApiError(response), {
        status: response.status,
        statusText: response.statusText,
      })
    }

    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      return await response.json()
    }

    // Tomme svar (void POST, eller grunnlagsdata uten data der pen svarer 200 uten
    // content-type og uten kropp) gir undefined – ikke selve Response-objektet.
    return undefined as T
  }
