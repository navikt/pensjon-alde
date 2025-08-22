import type { Route } from "./+types/$aktivitetId";
import type { AktivitetDTO } from "../../../../types/behandling";
import { useFetch } from "../../../../utils/use-fetch";
import { BodyShort, Detail, Alert } from "@navikt/ds-react";
import { Outlet, redirect } from "react-router";
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

// Helper function to get folder name for aktivitet type
function getFolderForType(aktivitetType: string): string | null {
  const modules: Record<string, AktivitetModule> = {};

  Object.entries(aktiviteterModules).forEach(([path, module]) => {
    const folderName = path.split("/")[5]; // Extract folder name from path
    const typedModule = module as AktivitetModule;

    if (typedModule.view && typedModule.handles) {
      modules[folderName] = typedModule;
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
  const splat = (params as any)["*"];

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
  const expectedPath = getFolderForType(aktivitet.type);
  if (expectedPath && !splat) {
    // Redirect to the specific aktivitet path
    throw redirect(
      `/behandling/${behandlingsId}/aktivitet/${aktivitetId}/${expectedPath}`,
    );
  }

  // If no matching folder found and we're on a specific path, redirect back to base
  if (!expectedPath && splat) {
    throw redirect(`/behandling/${behandlingsId}/aktivitet/${aktivitetId}`);
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

  // Check if we're on a specific aktivitet path
  const currentPath =
    typeof window !== "undefined"
      ? window.location.pathname.split("/").pop()
      : null;
  const expectedPath = getFolderForType(aktivitet.type);
  const isOnSpecificPath = currentPath === expectedPath;

  return (
    <div
      className="aktivitet"
      style={{ marginTop: "2rem", padding: "1rem", border: "1px solid #ccc" }}
    >
      {/* Dynamic view based on aktivitet.type - only show if on specific path */}
      {isOnSpecificPath && (
        <div style={{ marginTop: "2rem" }}>
          {matchingView ? (
            React.createElement(matchingView, { aktivitet })
          ) : (
            <div className="aktivitet-not-supported">
              <h3>Aktivitet ikke implementert enda</h3>
              <p>Denne aktiviteten er ikke implementert enda.</p>
              <p>
                <strong>Type:</strong> {aktivitet.type}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Show fallback if no folders match and we're on base path */}
      {!isOnSpecificPath && !matchingView && (
        <div style={{ marginTop: "2rem" }}>
          <div className="aktivitet-not-supported">
            <h3>Aktivitet ikke implementert enda</h3>
            <p>Denne aktiviteten er ikke implementert enda.</p>
            <p>
              <strong>Type:</strong> {aktivitet.type}
            </p>
          </div>
        </div>
      )}

      <Outlet />
    </div>
  );
}
