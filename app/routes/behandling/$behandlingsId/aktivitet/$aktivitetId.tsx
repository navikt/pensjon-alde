import type { Route } from "./+types/$aktivitetId";
import type { AktivitetDTO } from "../../../../types/behandling";
import { useFetch } from "../../../../utils/use-fetch";
import { BodyShort, Detail, Alert } from "@navikt/ds-react";
import { Outlet, redirect } from "react-router";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Aktivitet ${params.aktivitetId}` },
    { name: "description", content: "Aktivitet detaljer" },
  ];
}

// Simple helper to find matching aktivitet folder
async function getFolderForType(aktivitetType: string): Promise<string | null> {
  const aktiviteterModules = import.meta.glob(
    "../../../../aktiviteter/*/index.tsx",
    { eager: true },
  );

  for (const [path, module] of Object.entries(aktiviteterModules)) {
    const folderName = path.split("/")[5];
    if ((module as any).handles?.includes(aktivitetType)) {
      return folderName;
    }
  }
  return null;
}

export async function loader({ params }: Route.LoaderArgs) {
  const { behandlingsId, aktivitetId } = params;

  // Fetch aktivitet data
  const response = await useFetch(
    `${process.env.BACKEND_URL!}/api/behandling/${behandlingsId}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch behandling: ${response.status}`);
  }

  const behandling = await response.json();
  const aktivitet = behandling.aktiviteter.find(
    (a: AktivitetDTO) => a.aktivitetId?.toString() === aktivitetId,
  );

  if (!aktivitet) {
    throw new Error(`Aktivitet ${aktivitetId} not found`);
  }

  // Redirect to specific aktivitet path if supported
  const folderName = await getFolderForType(aktivitet.type);
  if (folderName) {
    throw redirect(
      `/behandling/${behandlingsId}/aktivitet/${aktivitetId}/${folderName}`,
    );
  }

  return { aktivitet };
}

export default function Aktivitet({ loaderData }: Route.ComponentProps) {
  const { aktivitet } = loaderData;

  return (
    <div
      className="aktivitet"
      style={{ marginTop: "2rem", padding: "1rem", border: "1px solid #ccc" }}
    >
      {/* This route only shows when no aktivitet type matches (fallback) */}
      <div style={{ marginTop: "2rem" }}>
        <div className="aktivitet-not-supported">
          <h3>Aktivitet ikke implementert enda</h3>
          <p>Denne aktiviteten er ikke implementert enda.</p>
          <p>
            <strong>Type:</strong> {aktivitet.type}
          </p>
        </div>
      </div>

      <Outlet />
    </div>
  );
}
