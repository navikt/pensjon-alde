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

// Server-side helper function to get folder name for aktivitet type
async function getFolderForType(aktivitetType: string): Promise<string | null> {
  const aktiviteterModules = import.meta.glob(
    "../../../../aktiviteter/*/index.tsx",
    { eager: true },
  );

  const modules: Record<string, { handles: string[] }> = {};

  Object.entries(aktiviteterModules).forEach(([path, module]) => {
    const folderName = path.split("/")[5]; // Extract folder name from path
    const typedModule = module as any;

    if (typedModule.handles) {
      modules[folderName] = {
        handles: typedModule.handles,
      };
    }
  });

  for (const [folderName, { handles }] of Object.entries(modules)) {
    if (handles.includes(aktivitetType)) {
      return folderName;
    }
  }

  return null;
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

  // Check if we need to redirect to specific aktivitet path
  const expectedPath = await getFolderForType(aktivitet.type);
  if (expectedPath) {
    // Redirect to the specific aktivitet path
    throw redirect(
      `/behandling/${behandlingsId}/aktivitet/${aktivitetId}/${expectedPath}`,
    );
  }

  return {
    behandlingsId,
    aktivitetId,
    aktivitet,
  };
}

export default function Aktivitet({ loaderData }: Route.ComponentProps) {
  const { aktivitet } = loaderData as { aktivitet: AktivitetDTO };

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
