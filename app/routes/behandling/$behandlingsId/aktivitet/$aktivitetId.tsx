import type { Route } from "./+types/$aktivitetId";
import { BodyShort, Detail, Alert, Heading, Box } from "@navikt/ds-react";
import { Outlet, useOutlet, redirect } from "react-router";
import type { AktivitetDTO, BehandlingDTO } from "~/types/behandling";
import { buildAktivitetRedirectUrl } from "~/utils/handler-discovery";
import { useFetch } from "~/utils/use-fetch";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Aktivitet ${params.aktivitetId}` },
    { name: "description", content: "Aktivitet detaljer" },
  ];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingsId, aktivitetId } = params;
  const backendUrl = `${process.env.BACKEND_URL!}/api/saksbehandling/alde`;

  // Fetch behandling from API using behandlingId
  const response = await useFetch(request, `${backendUrl}/behandling/${behandlingsId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch behandling: ${response.status}`);
  }

  const behandling: BehandlingDTO = await response.json();

  // Find the specific aktivitet using aktivitetId
  const aktivitet = behandling.aktiviteter.find(
    (a: AktivitetDTO) => a.aktivitetId?.toString() === aktivitetId,
  );

  if (!aktivitet) {
    throw new Error(`Aktivitet ${aktivitetId} not found`);
  }

  // Check if we should redirect to an implementation
  const implementationUrl = buildAktivitetRedirectUrl(
    behandlingsId,
    aktivitetId,
    behandling,
    aktivitet,
  );

  const url = new URL(request.url);
  const currentPath = url.pathname;

  if (
    implementationUrl &&
    !currentPath.includes(behandling.handlerName!) &&
    !currentPath.includes(aktivitet.handlerName!)
  ) {
    throw redirect(implementationUrl);
  }

  return { behandling, aktivitet };
}

export default function Aktivitet({ loaderData }: Route.ComponentProps) {
  const { behandling, aktivitet } = loaderData;
  const outlet = useOutlet();

  return (
    <div className="aktivitet">
      <Outlet context={{ behandling, aktivitet }} />

      {!outlet && (
        <Box
          paddingBlock="8 0"
          style={{ display: "flex", justifyContent: "center" }}
        >
          <Alert variant="info" style={{ maxWidth: "600px", width: "100%" }}>
            <Heading spacing size="small" level="3">
              Aktivitet ikke implementert enda
            </Heading>
            <BodyShort spacing>
              Denne aktiviteten er ikke implementert enda.
            </BodyShort>
            <Detail>
              <strong>Type:</strong> {aktivitet.type}
            </Detail>
            {aktivitet.handlerName && (
              <Detail>
                <strong>Aktivitet Handler:</strong> {aktivitet.handlerName}
              </Detail>
            )}
            {behandling.handlerName && (
              <Detail>
                <strong>Behandling Handler:</strong> {behandling.handlerName}
              </Detail>
            )}
            {!aktivitet.handlerName && (
              <Detail>
                <strong>Info:</strong> Denne aktiviteten kjører kun i backend
              </Detail>
            )}
          </Alert>
        </Box>
      )}
    </div>
  );
}
