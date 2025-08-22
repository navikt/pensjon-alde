import { Outlet } from "react-router";
import type { Route } from "../+types/root";

export async function loader({ params }: Route.LoaderArgs) {
  console.log(params);
}

export default function AktivitetRouter({ loaderData }: Route.ComponentProps) {
  return <Outlet />;
}
