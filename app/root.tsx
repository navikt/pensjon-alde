/** biome-ignore-all lint/suspicious/noDocumentCookie: TODO: Refactor this */
import '@navikt/ds-css/darkside'

import { type Faro, getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk'
import { TracingInstrumentation } from '@grafana/faro-web-tracing'
import { BodyLong, BodyShort, Box, CopyButton, Heading, HStack, Link, Page, Theme, VStack } from '@navikt/ds-react'
import type React from 'react'
import { useState } from 'react'
import {
  createCookie,
  isRouteErrorResponse,
  Links,
  type LoaderFunctionArgs,
  Meta,
  type MiddlewareFunction,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from 'react-router'
import commonStyles from '~/common.module.css'
import { buildUrl } from '~/utils/build-url'
import { formatDateToNorwegian } from '~/utils/date'
import { env, isVerdandeLinksEnabled } from '~/utils/env.server'
import type { Route } from './+types/root'
import { settingsContext } from './context/settings-context'
import { type UserContext, userContext } from './context/user-context'
import { Header } from './layout/Header/Header'
import { settingsMiddleware } from './middleware/settings'
import { userMiddleware } from './middleware/user-middleware'
import styles from './root.module.css'

// Initialize mocking and auth in mock environment
if (typeof window === 'undefined' && process.env.NODE_ENV === 'mock') {
  import('./mocks').then(({ initializeMocking }) => {
    initializeMocking().catch(console.error)
  })
}

export const middleware: MiddlewareFunction[] = [settingsMiddleware, userMiddleware]

export const loader = async ({ params, request, context }: LoaderFunctionArgs) => {
  const environment =
    process.env.NODE_ENV === 'development' ? 'dev' : process.env.NAIS_CLUSTER_NAME === 'dev-gcp' ? 'q2' : null

  const me: UserContext = context.get(userContext)

  const darkmode = await createCookie('darkmode').parse(request.headers.get('cookie'))
  const { kladdemodus } = context.get(settingsContext)

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
    sketchmode: kladdemodus === true,
    verdandeAktivitetUrl,
    verdandeBehandlingUrl,
    environment,
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

export function links() {
  return [
    {
      rel: 'icon',
      href: '/favicon.svg',
      type: 'image/svg+xml',
    },
  ]
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { darkmode, me, environment, sketchmode, verdandeAktivitetUrl, verdandeBehandlingUrl } =
    useLoaderData<typeof loader>()
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
      <Page as="body">
        <Theme theme={isDarkmode ? 'dark' : 'light'} className={sketchmode ? styles.sketchMode : ''}>
          <Header
            me={me}
            isDarkmode={isDarkmode}
            setDarkmode={setDarkmode}
            environment={environment}
            verdandeAktivitetUrl={verdandeAktivitetUrl}
            verdandeBehandlingUrl={verdandeBehandlingUrl}
          />
          {children}
          <ScrollRestoration />
          <Scripts />
        </Theme>
      </Page>
    </html>
  )
}

export default function App() {
  return <Outlet />
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let details = 'En uventet feil oppsto'
  const dato = Date.now()

  if (isRouteErrorResponse(error)) {
    details = error.status === 404 ? 'The requested page could not be found.' : error.statusText || details
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message
  }
  //TODO: Legg til stacktrace
  return (
    <Page.Block gutters className={commonStyles.page}>
      <VStack gap="8">
        <Heading size="xlarge" level="1">
          Noe gikk galt
        </Heading>
        <BodyLong size="medium">
          Dette skyldes en teknisk feil. Vennligst kopier feilmeldingen nedenfor og{' '}
          <Link href="https://teams.microsoft.com/v2/" target="_blank" rel="noopener noreferrer">
            meld fra i Teams
          </Link>
          .
        </BodyLong>
        <VStack gap="1">
          <BodyShort size="medium">
            <b>Feilmelding</b>
          </BodyShort>

          <HStack className={styles.errorBox}>
            <BodyLong size="small" style={{ padding: '1rem' }}>
              {details}
            </BodyLong>
            <CopyButton copyText={details} variant="action" text="Kopier" activeText="Kopiert" />
          </HStack>
          <BodyLong size="small" color="neutral-sublte">
            {formatDateToNorwegian(dato, { showTime: true })}
          </BodyLong>
        </VStack>
      </VStack>
    </Page.Block>
  )
}
