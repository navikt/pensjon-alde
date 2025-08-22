import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/behandling/:behandlingsId", "routes/behandling/$behandlingsId.tsx"),
] satisfies RouteConfig;
