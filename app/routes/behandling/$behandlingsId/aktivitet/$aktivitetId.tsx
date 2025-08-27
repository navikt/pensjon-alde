import type { Route } from "./+types/$aktivitetId";
import type { AktivitetDTO, BehandlingDTO } from "../../../../types/behandling";
import type { AktivitetOutletContext } from "../../../../types/aktivitetOutletContext";
import { useFetch } from "../../../../utils/use-fetch";
import { BodyShort, Detail, Alert, Heading, Box } from "@navikt/ds-react";
import { Outlet, redirect } from "react-router";
import { useOutletContext } from "react-router";
import { buildAktivitetRedirectUrl } from "~/utils/handler-discovery";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Aktivitet ${params.aktivitetId}` },
    { name: "description", content: "Aktivitet detaljer" },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const { behandlingsId, aktivitetId } = params;
  const backendUrl = `${process.env.BACKEND_URL!}/api/saksbehandling/alde`;

  // Fetch behandling from API using behandlingId
  const response = await useFetch(`${backendUrl}/behandling/${behandlingsId}`);
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

  // Use the dynamic handler discovery to determine if there's a UI implementation
  // This uses the composite key of behandling.handlerName + aktivitet.handlerName
  const redirectUrl = buildAktivitetRedirectUrl(
    behandlingsId,
    aktivitetId,
    behandling,
    aktivitet,
  );

  if (redirectUrl) {
    // Redirect to the specific implementation
    throw redirect(redirectUrl);
  }

  // If no handler implementation exists, show the default "not implemented" view
  return { behandling, aktivitet };
}

export default function Aktivitet({ loaderData }: Route.ComponentProps) {
  const { behandling, aktivitet } = loaderData;

  return (
    <div className="aktivitet">
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

      <Outlet context={{ behandling, aktivitet }} />
    </div>
  );
}
