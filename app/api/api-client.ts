import { data } from 'react-router'
import type { AuthContext } from '~/context'

export async function apiFetch<T>(url: string, options: RequestInit = {}, auth: AuthContext): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer ${auth.token}`)

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const mergedOptions: RequestInit = {
    ...options,
    headers,
  }

  const response = await fetch(url, mergedOptions)

  if (!response.ok) {
    let errorBody: any = null
    const contentType = response.headers.get('content-type')

    if (contentType?.includes('application/json')) {
      errorBody = await response.json()
    }

    // Throw normalized error using React Router's data utility
    throw data(
      {
        status: response.status,
        title: errorBody?.error || response.statusText || 'API Error',
        message: errorBody?.message,
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

  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    return await response.json()
  }

  return response as unknown as T
}

export async function apiFetchOptional<T>(
  url: string,
  options: RequestInit = {},
  auth: AuthContext,
): Promise<T | null> {
  try {
    return await apiFetch<T>(url, options, auth)
  } catch (error: any) {
    if (error.data?.status === 404) {
      return null
    }
    throw error
  }
}
