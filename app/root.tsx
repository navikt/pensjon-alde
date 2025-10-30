/** biome-ignore-all lint/suspicious/noDocumentCookie: TODO: Refactor this */
import '@navikt/ds-css/darkside'

import { BodyLong, Box, CopyButton, Heading, HStack, Link, Page, Theme, VStack } from '@navikt/ds-react'
import type React from 'react'
import { useEffect, useState } from 'react'
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
  useLocation,
  useParams,
  useRouteLoaderData,
} from 'react-router'
import commonStyles from '~/common.module.css'
import ForbiddenPage from '~/components/ForbiddenPage'
import { buildUrl } from '~/utils/build-url'
import { formatDateToNorwegian } from '~/utils/date'
import { env, isVerdandeLinksEnabled } from '~/utils/env.server'
import type { Route } from './+types/root'
import { settingsContext } from './context/settings-context'
import { type UserContext, userContext } from './context/user-context'
import { useTelemetry } from './hooks/use-telemetry'
import { Header } from './layout/Header/Header'
import { settingsMiddleware } from './middleware/settings'
import { userMiddleware } from './middleware/user-middleware'
import styles from './root.module.css'
import { getFaro, initInstrumentation, type TelemetryConfig } from './utils/faro.client'

// Initialize mocking and auth in mock environment
if (typeof window === 'undefined' && process.env.NODE_ENV === 'mock') {
  import('./mocks').then(({ initializeMocking }) => {
    initializeMocking().catch(console.error)
  })
}

export const middleware: MiddlewareFunction[] = [settingsMiddleware, userMiddleware]

export const loader = async ({ params, request, context }: LoaderFunctionArgs) => {
  const me: UserContext = context.get(userContext)

  const appVersion = process.env.npm_package_version || 'dev'
  const environment = process.env.TELEMETRY_ENVIRONMENT || 'local'

  const telemetry: TelemetryConfig = {
    telemetryUrl: env.telemetryUrl,
    appName: 'pensjon-alde',
    appVersion,
    environment,
  }

  const darkmode = await createCookie('darkmode').parse(request.headers.get('cookie'))
  const { kladdemodus } = context.get(settingsContext)

  const behandlingId = params.behandlingId ? +params.behandlingId : undefined
  const aktivitetId = params.aktivitetId ? +params.aktivitetId : undefined

  const verdandeAktivitetUrl =
    isVerdandeLinksEnabled && behandlingId && aktivitetId
      ? buildUrl(env.verdandeAktivitetUrl, request, {
          behandlingId: behandlingId,
          aktivitetId: aktivitetId,
        })
      : undefined

  const verdandeBehandlingUrl =
    isVerdandeLinksEnabled && behandlingId
      ? buildUrl(env.verdandeBehandlingUrl, request, {
          behandlingId: behandlingId,
        })
      : undefined

  return {
    darkmode: darkmode === 'true' || darkmode === true,
    me,
    sketchmode: kladdemodus === true,
    verdandeAktivitetUrl,
    verdandeBehandlingUrl,
    serverNowIso: new Date().toISOString(),
    telemetry,
  }
}

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
  const { darkmode, me, telemetry, sketchmode, verdandeAktivitetUrl, verdandeBehandlingUrl } =
    useLoaderData<typeof loader>()
  const [isDarkmode, setIsDarkmode] = useState<boolean>(darkmode)
  const location = useLocation()
  const params = useParams()

  function setDarkmode(darkmode: boolean) {
    setIsDarkmode(darkmode)
    document.cookie = `darkmode=${encodeURIComponent(btoa(darkmode.toString()))}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
  }

  useEffect(() => {
    initInstrumentation(telemetry)
  }, [telemetry])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const faro = getFaro()
    if (!faro) return

    const attributes: Record<string, string> = {
      path: location.pathname,
    }

    if (location.search) {
      attributes.search = location.search
    }

    if (params.behandlingId) {
      attributes.behandlingId = params.behandlingId
    }

    if (params.aktivitetId) {
      attributes.aktivitetId = params.aktivitetId
    }

    faro.api.pushEvent('page_view', attributes)
  }, [location.pathname, location.search, params.behandlingId, params.aktivitetId])

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
            environment={telemetry.environment}
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
  const { logError } = useTelemetry()
  const root = useRouteLoaderData<typeof loader>('root')
  const iso = root?.serverNowIso ?? Date.now()
  const dato = new Date(iso).getTime()

  let details: string | undefined

  let traceId: string | undefined

  if (isRouteErrorResponse(error) || (typeof error === 'object' && error !== null && 'status' in error)) {
    const data = ('data' in error && typeof error.data === 'object' && error.data) || undefined
    traceId = (data !== undefined && 'traceId' in data && typeof data.traceId === 'string' && data.traceId) || undefined

    if (error.status === 403) {
      return <ForbiddenPage dato={dato} traceId={traceId} />
    }

    details = error.status === 404 ? 'The requested page could not be found.' : JSON.stringify(error, null, 2)
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message
  } else {
    details = 'En uventet feil oppsto'
  }

  if (details !== 'string') {
    details = JSON.stringify(details, null, 2)
  }

  logError(new Error(details))

  return (
    <Page>
      <Page.Block gutters className={commonStyles.page} width="md">
        <VStack gap="8">
          <Heading
            size="xlarge"
            level="1"
            style={{
              color: 'var(--ax-text-danger-subtle)',
            }}
          >
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
            <BodyLong size="medium">
              <strong>Feilmelding</strong>
            </BodyLong>

            <Box.New borderRadius="medium" borderColor="neutral-subtle" borderWidth="1" padding="2">
              <HStack justify="space-between">
                <BodyLong size="small" style={{ padding: '1rem' }}>
                  {details}
                </BodyLong>
                {traceId && (
                  <CopyButton copyText={traceId} size="small" variant="action" text="Kopier" activeText="Kopiert" />
                )}
              </HStack>
            </Box.New>
            <BodyLong size="small" textColor="subtle">
              {formatDateToNorwegian(dato, { showTime: true })}
            </BodyLong>
          </VStack>
        </VStack>
      </Page.Block>
    </Page>
  )
}
