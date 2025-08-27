import {
  type RouteConfig,
  index,
  route,
  type RouteConfigEntry,
} from "@react-router/dev/routes";
import { glob } from "glob";
import { join } from "path";

// Dynamically discover all behandlinger and their aktiviteter
function discoverBehandlingRoutes(): RouteConfigEntry[] {
  const behandlingerPath = join(process.cwd(), "app/behandlinger");
  const routes: RouteConfigEntry[] = [];

  // Find all behandling folders
  const behandlingFolders = glob.sync("*/", { cwd: behandlingerPath });

  for (const behandlingFolder of behandlingFolders) {
    const behandlingName = behandlingFolder.replace("/", "");
    const behandlingPath = join(behandlingerPath, behandlingName);

    // Find all aktivitet folders within this behandling
    const aktivitetFolders = glob.sync("*/", { cwd: behandlingPath });

    for (const aktivitetFolder of aktivitetFolders) {
      const aktivitetName = aktivitetFolder.replace("/", "");

      // Check if this aktivitet has an index.tsx file
      const indexPath = join(behandlingPath, aktivitetName, "index.tsx");
      const hasIndex = glob.sync(indexPath).length > 0;

      if (hasIndex) {
        // Create a dynamic route for this aktivitet
        // The URL pattern: /behandling/:behandlingsId/aktivitet/:aktivitetId/{behandlingName}/{aktivitetName}
        routes.push(
          route(
            `aktivitet/:aktivitetId/${behandlingName}/${aktivitetName}`,
            `behandlinger/${behandlingName}/${aktivitetName}/index.tsx`,
          ),
        );
      }
    }
  }

  return routes;
}

// Generate routes dynamically at build time
const dynamicAktivitetRoutes = discoverBehandlingRoutes();

export default [
  index("routes/home.tsx"),
  route("/behandling/:behandlingsId", "routes/behandling/$behandlingsId.tsx", [
    // The main aktivitet route that handles redirection to the correct implementation
    route(
      "aktivitet/:aktivitetId",
      "routes/behandling/$behandlingsId/aktivitet/$aktivitetId.tsx",
    ),
    // All dynamically discovered aktivitet implementation routes
    ...dynamicAktivitetRoutes,
  ]),
] satisfies RouteConfig;
