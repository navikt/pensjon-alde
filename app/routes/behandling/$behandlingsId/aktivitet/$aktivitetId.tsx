import type { Route } from "./+types/$aktivitetId";
import type { AktivitetDTO } from "../../../../types/behandling";
import { useFetch } from "../../../../utils/use-fetch";
import { BodyShort, Detail, Alert } from "@navikt/ds-react";
import { Outlet } from "react-router";
import React, { useMemo } from "react";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Aktivitet ${params.aktivitetId}` },
    { name: "description", content: "Aktivitet detaljer" },
  ];
}

// Dynamic imports for all aktiviteter modules
const aktiviteterModules = import.meta.glob(
  "../../../../aktiviteter/*/index.tsx",
  { eager: true },
);

// Type definitions for the module structure
interface AktivitetModule {
  view: React.ComponentType<{ aktivitet?: AktivitetDTO }>;
  handles: string[];
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
  const { aktivitet } = loaderData;

  // Parse all aktivitet modules
  const aktiviteter = useMemo(() => {
    const modules: Record<string, AktivitetModule> = {};

    Object.entries(aktiviteterModules).forEach(([path, module]) => {
      const folderName = path.split("/")[5]; // Extract folder name from path
      const typedModule = module as AktivitetModule;

      if (typedModule.view && typedModule.handles) {
        modules[folderName] = typedModule;
      }
    });

    return modules;
  }, []);

  // Find matching view for aktivitet.type
  const matchingView = useMemo(() => {
    if (!aktivitet?.type) return null;

    for (const { view, handles } of Object.values(aktiviteter)) {
      if (handles.includes(aktivitet.type)) {
        return view;
      }
    }

    return null;
  }, [aktivitet?.type, aktiviteter]);

  return (
    <div
      className="aktivitet"
      style={{ marginTop: "2rem", padding: "1rem", border: "1px solid #ccc" }}
    >
      {/* Dynamic view based on aktivitet.type */}
      <div style={{ marginTop: "2rem" }}>
        {matchingView ? (
          React.createElement(matchingView, { aktivitet })
        ) : (
          <div className="aktivitet-not-supported">
            <h3>Aktivitet ikke enda støttet</h3>
            <p>Denne aktiviteten er ikke implementert enda.</p>
            <p>
              <strong>Type:</strong> {aktivitet.type}
            </p>
          </div>
        )}
      </div>

      <Outlet />
    </div>
  );
}
