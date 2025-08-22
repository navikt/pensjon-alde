import type { Route } from "./+types/$behandlingsId";
import type { BehandlingDTO } from "../../types/behandling";
import { useFetch } from "../../utils/use-fetch";
import { Outlet, Link, useParams, useNavigate } from "react-router";
import { Stepper } from "@navikt/ds-react";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Behandling ${params.behandlingsId}` },
    { name: "description", content: "Behandling detaljer" },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const { behandlingsId } = params;

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
      <h1>Behandling {behandlingsId}</h1>

      {behandling && behandling.aktiviteter.length > 0 && (
        <Stepper
          orientation="horizontal"
          activeStep={
            currentAktivitetId
              ? behandling.aktiviteter.findIndex(
                  (a) => a.aktivitetId?.toString() === currentAktivitetId,
                ) + 1
              : 1
          }
          style={{ marginBottom: "2rem" }}
        >
          {behandling.aktiviteter.map((aktivitet, index) => (
            <Stepper.Step
              key={aktivitet.uuid}
              onClick={() => navigate(`aktivitet/${aktivitet.aktivitetId}`)}
              style={{ cursor: "pointer" }}
            >
              {aktivitet.type}
            </Stepper.Step>
          ))}
        </Stepper>
      )}

      {behandling && (
        <div>
          <h2>Detaljer</h2>
          <p>
            <strong>Type:</strong> {behandling.type}
          </p>
          <p>
            <strong>Status:</strong> {behandling.status}
          </p>
          <p>
            <strong>Prioritet:</strong> {behandling.prioritet}
          </p>
          <p>
            <strong>UUID:</strong> {behandling.uuid}
          </p>
          <p>
            <strong>Funksjonell identifikator:</strong>{" "}
            {behandling.funksjonellIdentifikator}
          </p>
          <p>
            <strong>Opprettet:</strong>{" "}
            {new Date(behandling.opprettet).toLocaleString()}
          </p>
          <p>
            <strong>Siste kjøring:</strong>{" "}
            {new Date(behandling.sisteKjoring).toLocaleString()}
          </p>

          {behandling.ansvarligTeam && (
            <p>
              <strong>Ansvarlig team:</strong> {behandling.ansvarligTeam.navn}
            </p>
          )}

          {behandling.aktiviteter.length > 0 && (
            <div>
              <h3>Aktiviteter ({behandling.aktiviteter.length})</h3>
              <ul>
                {behandling.aktiviteter.map((aktivitet) => (
                  <li key={aktivitet.uuid}>
                    <Link to={`aktivitet/${aktivitet.aktivitetId}`}>
                      <strong>{aktivitet.type}</strong> - {aktivitet.status}
                    </Link>
                    {aktivitet.utsattTil && (
                      <span>
                        {" "}
                        (utsatt til:{" "}
                        {new Date(aktivitet.utsattTil).toLocaleString()})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <Outlet />
    </div>
  );
}
