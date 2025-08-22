import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/behandling/:behandlingsId", "routes/behandling/$behandlingsId.tsx", [
    route(
      "aktivitet/:aktivitetId",
      "routes/behandling/$behandlingsId/aktivitet/$aktivitetId.tsx",
      [route("*", "aktiviteter/index.tsx")],
    ),
  ]),
] satisfies RouteConfig;
