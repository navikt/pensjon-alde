import type { Route } from "./+types/$behandlingsId";
import type { BehandlingDTO } from "../../types/behandling";
import { AktivitetStatus, BehandlingStatus } from "../../types/behandling";
import { useFetch } from "../../utils/use-fetch";
import { Outlet, Link, useParams, useNavigate, redirect } from "react-router";
import { Stepper, Box, HStack, BodyShort, Label, Tag } from "@navikt/ds-react";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Behandling ${params.behandlingsId}` },
    { name: "description", content: "Behandling detaljer" },
  ];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingsId } = params;
  const url = new URL(request.url);

  const backendUrl = process.env.BACKEND_URL!;

  const response = await useFetch(
    `${backendUrl}/api/behandling/${behandlingsId}`,
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch behandling: ${response.status} ${response.statusText}`,
    );
  }

  const behandling: BehandlingDTO = await response.json();

  // If no aktivitet is selected and there are aktiviteter, redirect to first UNDER_BEHANDLING
  if (
    !url.pathname.includes("/aktivitet/") &&
    behandling.aktiviteter.length > 0
  ) {
    const underBehandlingAktivitet = behandling.aktiviteter.find(
      (aktivitet) => aktivitet.status === AktivitetStatus.UNDER_BEHANDLING,
    );

    if (underBehandlingAktivitet) {
      throw redirect(
        `/behandling/${behandlingsId}/aktivitet/${underBehandlingAktivitet.aktivitetId}`,
      );
    }
  }

  return {
    behandlingsId,
    behandling,
  };
}

export default function Behandling({ loaderData }: Route.ComponentProps) {
  const { behandlingsId, behandling } = loaderData;
  const params = useParams();
  const currentAktivitetId = params.aktivitetId;
  const navigate = useNavigate();

  return (
    <div>
      <Box padding="4" background="surface-subtle" borderWidth="1 0">
        <HStack gap="6" align="center">
          <div>
            <Label size="small">Type</Label>
            <BodyShort>{behandling.type}</BodyShort>
          </div>
          <div>
            <Label size="small">Status</Label>
            <Tag
              variant={
                behandling.status === BehandlingStatus.FERDIG
                  ? "success"
                  : behandling.status === BehandlingStatus.FEILET
                    ? "error"
                    : "info"
              }
              size="small"
            >
              {behandling.status}
            </Tag>
          </div>
          <div>
            <Label size="small">Prioritet</Label>
            <Tag
              variant={
                behandling.prioritet === "KRITISK"
                  ? "error"
                  : behandling.prioritet === "HOY"
                    ? "warning"
                    : "neutral"
              }
              size="small"
            >
              {behandling.prioritet}
            </Tag>
          </div>
          <div>
            <Label size="small">Opprettet</Label>
            <BodyShort size="small">
              {new Date(behandling.opprettet).toLocaleDateString()}
            </BodyShort>
          </div>
          {behandling.ansvarligTeam && (
            <div>
              <Label size="small">Ansvarlig team</Label>
              <BodyShort size="small">
                {behandling.ansvarligTeam.navn}
              </BodyShort>
            </div>
          )}
        </HStack>
      </Box>

      {behandling.aktiviteter.length > 0 && (
        <Box padding="space-12">
          <Stepper
            orientation="horizontal"
            activeStep={
              currentAktivitetId
                ? behandling.aktiviteter.findIndex(
                    (a) => a.aktivitetId?.toString() === currentAktivitetId,
                  ) + 1
                : 1
            }
          >
            {behandling.aktiviteter.map((aktivitet, index) => (
              <Stepper.Step
                key={aktivitet.uuid}
                completed={aktivitet.status === AktivitetStatus.FULLFORT}
                onClick={() => navigate(`aktivitet/${aktivitet.aktivitetId}`)}
                style={{ cursor: "pointer" }}
              >
                {aktivitet.type}
              </Stepper.Step>
            ))}
          </Stepper>
        </Box>
      )}
      <Outlet />
    </div>
  );
}
