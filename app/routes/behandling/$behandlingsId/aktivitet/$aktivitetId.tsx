import type { Route } from "./+types/$aktivitetId";
import type { AktivitetDTO } from "../../../../types/behandling";
import { useFetch } from "../../../../utils/use-fetch";
import { Heading, BodyShort, Detail, Alert } from "@navikt/ds-react";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Aktivitet ${params.aktivitetId}` },
    { name: "description", content: "Aktivitet detaljer" },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const { behandlingsId, aktivitetId } = params;

  const backendUrl = process.env.BACKEND_URL!;

  // Fetch the behandling first to get aktivitet from it
  const response = await useFetch(
    `${backendUrl}/api/behandling/${behandlingsId}`,
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch behandling: ${response.status} ${response.statusText}`,
    );
  }

  const behandling: any = await response.json();
  const aktivitet = behandling.aktiviteter.find(
    (a: AktivitetDTO) => a.aktivitetId?.toString() === aktivitetId,
  );

  if (!aktivitet) {
    throw new Error(`Aktivitet ${aktivitetId} not found`);
  }

  return {
    behandlingsId,
    aktivitetId,
    aktivitet,
  };
}

export default function Aktivitet({ loaderData }: Route.ComponentProps) {
  const { aktivitetId, aktivitet } = loaderData;

  return (
    <div
      className="aktivitet"
      style={{ marginTop: "2rem", padding: "1rem", border: "1px solid #ccc" }}
    >
      <div className="data">
        <BodyShort spacing>
          <strong>Type:</strong> {aktivitet.type}
        </BodyShort>

        <BodyShort spacing>
          <strong>Status:</strong> {aktivitet.status}
        </BodyShort>

        <BodyShort spacing>
          <strong>UUID:</strong> {aktivitet.uuid}
        </BodyShort>

        <BodyShort spacing>
          <strong>Funksjonell identifikator:</strong>{" "}
          {aktivitet.funksjonellIdentifikator}
        </BodyShort>

        <BodyShort spacing>
          <strong>Antall ganger kjørt:</strong> {aktivitet.antallGangerKjort}
        </BodyShort>

        <Detail spacing>
          <strong>Opprettet:</strong>{" "}
          {new Date(aktivitet.opprettet).toLocaleString()}
        </Detail>

        <Detail spacing>
          <strong>Siste aktivering:</strong>{" "}
          {new Date(aktivitet.sisteAktiveringsdato).toLocaleString()}
        </Detail>

        {aktivitet.utsattTil && (
          <Alert variant="info" size="small">
            Aktivitet er utsatt til:{" "}
            {new Date(aktivitet.utsattTil).toLocaleString()}
          </Alert>
        )}

        {aktivitet.ventPaForegaendeAktiviteter && (
          <Alert variant="warning" size="small">
            Venter på foregående aktiviteter
          </Alert>
        )}
      </div>
      <div className="decision">Some decistion here</div>
    </div>
  );
}
