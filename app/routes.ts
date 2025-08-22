import { type RouteConfig, index, route } from "@react-router/dev/routes";
import { glob } from "glob";
import { join } from "path";

// Dynamically discover aktiviteter folders and create routes
function getAktiviteterRoutes(): RouteConfig[] {
  const aktiviteterPath = join(process.cwd(), "app/aktiviteter");
  const folders = glob.sync("*/", { cwd: aktiviteterPath });

  return folders.map((folder) => {
    const folderName = folder.replace("/", "");
    return route(
      `aktivitet/:aktivitetId/${folderName}`,
      `aktiviteter/${folderName}/index.tsx`,
    );
  });
}

export default [
  index("routes/home.tsx"),
  route("/behandling/:behandlingsId", "routes/behandling/$behandlingsId.tsx", [
    route(
      "aktivitet/:aktivitetId",
      "routes/behandling/$behandlingsId/aktivitet/$aktivitetId.tsx",
    ),
    ...getAktiviteterRoutes(),
  ]),
] satisfies RouteConfig;
