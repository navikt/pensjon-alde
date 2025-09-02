/** biome-ignore-all lint/suspicious/noDocumentCookie: TODO: Refactor this */
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
import '@navikt/ds-css/darkside'

import type { Route } from './+types/root'
import '@navikt/ds-css'
import { ExternalLinkIcon, MenuGridIcon, MoonIcon, SunIcon } from '@navikt/aksel-icons'
import { ActionMenu, BodyShort, Detail, Dropdown, InternalHeader, Spacer, Theme } from '@navikt/ds-react'
import type React from 'react'
import { useState } from 'react'
import type { Me } from '~/types/me'
import { buildUrl } from '~/utils/build-url'
import { env, isVerdandeLinksEnabled } from '~/utils/env.server'
import { initializeFetch, useFetch2 } from '~/utils/use-fetch/use-fetch'

// Initialize mocking and auth in mock environment
if (typeof window === 'undefined' && process.env.NODE_ENV === 'mock') {
  import('./mocks').then(({ initializeMocking }) => {
    initializeMocking().catch(console.error)
  })
}

export const links: Route.LinksFunction = () => []

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  // Initialize fetch system on server-side
  initializeFetch()

  const penUrl = `${env.penUrl}/api/saksbehandling/alde`

  const me: Me = await useFetch2(request, `${penUrl}/me`)

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
    me: me,
    verdandeAktivitetUrl: verdandeAktivitetUrl,
    verdandeBehandlingUrl: verdandeBehandlingUrl,
  }
}

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
          <InternalHeader>
            <InternalHeader.Title as="h2">Pesys</InternalHeader.Title>
            <Spacer />
            <Dropdown>
              <InternalHeader.Button as={Dropdown.Toggle}>
                <MenuGridIcon style={{ fontSize: '1.5rem' }} title="Systemer og oppslagsverk" />
              </InternalHeader.Button>
              <Dropdown.Menu>
                <Dropdown.Menu.GroupedList>
                  <Dropdown.Menu.GroupedList.Heading>Dokumentasjon</Dropdown.Menu.GroupedList.Heading>
                  <Dropdown.Menu.GroupedList.Item
                    as="a"
                    target="_blank"
                    href={'https://navno.sharepoint.com/sites/fag-og-ytelser-pesys/'}
                  >
                    Rutiner for Pesys
                    <ExternalLinkIcon aria-hidden />
                  </Dropdown.Menu.GroupedList.Item>
                  <Dropdown.Menu.GroupedList.Item
                    as="a"
                    target="_blank"
                    href={'https://lovdata.no/pro/#document/HJELP/nav-rettskilder'}
                  >
                    Rettskilder
                    <ExternalLinkIcon aria-hidden />
                  </Dropdown.Menu.GroupedList.Item>
                </Dropdown.Menu.GroupedList>
                {verdandeBehandlingUrl && (
                  <>
                    <Dropdown.Menu.Divider />
                    <Dropdown.Menu.GroupedList>
                      <Dropdown.Menu.GroupedList.Heading>Verdande</Dropdown.Menu.GroupedList.Heading>
                      <Dropdown.Menu.GroupedList.Item as="a" target="_blank" href={verdandeBehandlingUrl}>
                        Gå til behandling
                        <ExternalLinkIcon aria-hidden />
                      </Dropdown.Menu.GroupedList.Item>

                      {verdandeAktivitetUrl && (
                        <Dropdown.Menu.GroupedList.Item as="a" target="_blank" href={verdandeAktivitetUrl}>
                          Gå til aktivitet
                          <ExternalLinkIcon aria-hidden />
                        </Dropdown.Menu.GroupedList.Item>
                      )}
                    </Dropdown.Menu.GroupedList>
                  </>
                )}
              </Dropdown.Menu>
            </Dropdown>
            <ActionMenu>
              <ActionMenu.Trigger>
                <InternalHeader.UserButton name={`${me.fornavn} ${me.etternavn}`} />
              </ActionMenu.Trigger>
              <ActionMenu.Content>
                <dl>
                  <BodyShort as="dt" size="small">
                    {`${me.fornavn} ${me.etternavn}`}
                  </BodyShort>
                  <Detail as="dd">{me.navident}</Detail>
                </dl>
                <Dropdown.Menu.Divider />
                <ActionMenu.Item disabled={!isDarkmode} icon={<SunIcon />} onClick={() => setDarkmode(false)}>
                  Bytt til lys modus
                </ActionMenu.Item>
                <ActionMenu.Item disabled={isDarkmode} icon={<MoonIcon />} onClick={() => setDarkmode(true)}>
                  Bytt til mørk modus
                </ActionMenu.Item>
              </ActionMenu.Content>
            </ActionMenu>
          </InternalHeader>
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
