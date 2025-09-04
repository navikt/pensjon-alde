import { data } from 'react-router'
import { requireAccessToken } from '~/auth/auth.server'

export type Fetcher = <T>(url: string, options: RequestInit) => Promise<T>

export const fetcher =
  (request: Request): Fetcher =>
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
