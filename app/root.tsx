/** biome-ignore-all lint/suspicious/noDocumentCookie: TODO: Refactor this */
import '@navikt/ds-css/darkside'

import { type Faro, getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk'
import { TracingInstrumentation } from '@grafana/faro-web-tracing'
import { Theme } from '@navikt/ds-react'
import type React from 'react'
import { useState } from 'react'
import {
  createCookie,
  isRouteErrorResponse,
  Links,
  type LoaderFunctionArgs,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from 'react-router'
import type { Me } from '~/types/me'
import { buildUrl } from '~/utils/build-url'
import { env, isVerdandeLinksEnabled } from '~/utils/env.server'
import type { Route } from './+types/root'
import { requireAccessToken } from './auth/auth.server'
import { Header } from './layout/Header/Header'

// Initialize mocking and auth in mock environment
if (typeof window === 'undefined' && process.env.NODE_ENV === 'mock') {
  import('./mocks').then(({ initializeMocking }) => {
    initializeMocking().catch(console.error)
  })
}

export const links: Route.LinksFunction = () => []

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const token = await requireAccessToken(request)

  const penUrl = `${env.penUrl}/api/saksbehandling/alde`

  // Fetch me data using token from context
  const meResponse = await fetch(`${penUrl}/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  const me: Me = await meResponse.json()

  const darkmode = await createCookie('darkmode').parse(request.headers.get('cookie'))

  const behandlingId = params.behandlingId ? +params.behandlingId : undefined
  const aktivitetId = params.aktivitetId ? +params.aktivitetId : undefined

  const verdandeAktivitetUrl =
    isVerdandeLinksEnabled && behandlingId && aktivitetId
      ? buildUrl(env.verdandeAktivitetUrl, {
          behandlingId: behandlingId,
          aktivitetId: aktivitetId,
        })
      : undefined

  const verdandeBehandlingUrl =
    isVerdandeLinksEnabled && behandlingId
      ? buildUrl(env.verdandeBehandlingUrl, {
          behandlingId: behandlingId,
        })
      : undefined

  return {
    darkmode: darkmode === 'true' || darkmode === true,
    me,
    verdandeAktivitetUrl,
    verdandeBehandlingUrl,
  }
}

let faro: Faro | null = null

export function initInstrumentation(): void {
  if (typeof window === 'undefined' || faro !== null) return

  getFaro()
}

export function getFaro(): Faro {
  if (faro != null) return faro

  faro = initializeFaro({
    url: 'https://telemetry.ekstern.dev.nav.no/collect', // TODO: Sett URL til miljøvariabel
    app: {
      name: 'pensjon-alde',
      version: 'dev', // TODO: Oppdater versjon, pakkeversjon eller git commit hash?
    },

    instrumentations: [
      ...getWebInstrumentations({
        captureConsole: true,
      }),
      new TracingInstrumentation(),
    ],
  })
  return faro
}

process.env.NODE_ENV !== 'development' && initInstrumentation()

export function Layout({ children }: { children: React.ReactNode }) {
  const { darkmode, me, verdandeAktivitetUrl, verdandeBehandlingUrl } = useLoaderData<typeof loader>()
  const [isDarkmode, setIsDarkmode] = useState<boolean>(darkmode)

  function setDarkmode(darkmode: boolean) {
    setIsDarkmode(darkmode)
    document.cookie = `darkmode=${encodeURIComponent(btoa(darkmode.toString()))}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Theme theme={isDarkmode ? 'dark' : 'light'}>
          <Header
            me={me}
            isDarkmode={isDarkmode}
            setDarkmode={setDarkmode}
            verdandeAktivitetUrl={verdandeAktivitetUrl}
            verdandeBehandlingUrl={verdandeBehandlingUrl}
          />
          {children}
          <ScrollRestoration />
          <Scripts />
        </Theme>
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = 'Oops!'
  let details = 'An unexpected error occurred.'
  let stack: string | undefined

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error'
    details = error.status === 404 ? 'The requested page could not be found.' : error.statusText || details
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message
    stack = error.stack
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  )
}
