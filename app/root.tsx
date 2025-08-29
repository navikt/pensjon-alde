import {
  createCookie,
  isRouteErrorResponse,
  Links, type LoaderFunctionArgs,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration, useLoaderData,
} from "react-router";
import '@navikt/ds-css/darkside'

import type { Route } from "./+types/root";
import "@navikt/ds-css";
import {ActionMenu, BodyShort, Detail, Dropdown, InternalHeader, Label, Spacer, Theme, VStack} from "@navikt/ds-react";
import React, {useState} from "react";
import {ExternalLinkIcon, MenuGridIcon, MoonIcon, SunIcon} from "@navikt/aksel-icons";
import {env, isVerdandeLinksEnabled} from "~/utils/env.server";
import type {Me} from "~/types/me";
import {initializeFetch, useFetch2} from "~/utils/use-fetch/use-fetch";
import {buildUrl} from "~/utils/build-url";
// Initialize mocking and auth in mock environment
if (typeof window === "undefined" && process.env.NODE_ENV === "mock") {
  import("./mocks").then(({ initializeMocking }) => {
    initializeMocking().catch(console.error);
  });
}

export const links: Route.LinksFunction = () => [];

export const loader = async ({
                               params, request,
                             }: LoaderFunctionArgs) => {
  // Initialize fetch system on server-side
  initializeFetch();

  const penUrl = `${env.penUrl}/api/saksbehandling/alde`;

  const me: Me = await useFetch2(request, `${penUrl}/me`);


  let darkmode = await createCookie('darkmode').parse(
    request.headers.get('cookie'),
  )

  return {
    behandlingId: params.behandlingsId ? +params.behandlingsId : undefined,
    darkmode: darkmode === 'true' || darkmode === true,
    me: me,
    verdandeBehandlingUrl: isVerdandeLinksEnabled ? env.verdandeBehandlingUrl : undefined,
  };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { behandlingId, darkmode, me, verdandeBehandlingUrl } = useLoaderData<typeof loader>()
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
            <Dropdown defaultOpen>
              <InternalHeader.Button as={Dropdown.Toggle}>
                <MenuGridIcon
                  style={{ fontSize: "1.5rem" }}
                  title="Systemer og oppslagsverk"
                />
              </InternalHeader.Button>
            <Dropdown.Menu>
              {behandlingId && verdandeBehandlingUrl &&
                <Dropdown.Menu.GroupedList>
                  <Dropdown.Menu.GroupedList.Heading>
                    Verdande
                  </Dropdown.Menu.GroupedList.Heading>
                  <Dropdown.Menu.GroupedList.Item
                      as="a"
                      target="_blank"
                      href={buildUrl(verdandeBehandlingUrl, { 'behandlingId': behandlingId } )}
                  >
                    Åpne i Verdande<ExternalLinkIcon aria-hidden/>
                  </Dropdown.Menu.GroupedList.Item>
                </Dropdown.Menu.GroupedList>
              }
            </Dropdown.Menu>
            </Dropdown>
            <ActionMenu>
              <ActionMenu.Trigger>
                <InternalHeader.UserButton
                  name={`${me.fornavn} ${me.etternavn}`}
                />
              </ActionMenu.Trigger>
              <ActionMenu.Content>
                <dl>
                  <BodyShort as="dt" size="small">
                    {`${me.fornavn} ${me.etternavn}`}
                  </BodyShort>
                  <Detail as="dd">{me.navident}</Detail>
                </dl>
                <Dropdown.Menu.Divider />
                <ActionMenu.Item
                  disabled={!isDarkmode}
                  icon={<SunIcon />}
                  onClick={() => setDarkmode(false)}
                >
                  Bytt til lys modus
                </ActionMenu.Item>
                <ActionMenu.Item
                  disabled={isDarkmode}
                  icon={<MoonIcon />}
                  onClick={() => setDarkmode(true)}
                >
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
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
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
  );
}
