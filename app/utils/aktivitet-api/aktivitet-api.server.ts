import { env } from "~/utils/env.server";
import { serverFetch } from "~/utils/use-fetch/use-fetch";

export interface AktivitetApiParams {
  request: Request;
  behandlingId: string;
  aktivitetId: string;
}

function buildUrl(behandlingsId: string, aktivitetId: string, endpoint: string): string {
  return `${env.penUrl}/api/saksbehandling/alde/behandling/${behandlingsId}/aktivitet/${aktivitetId}/${endpoint}`;
}



export function createAktivitetApi({ request, behandlingId, aktivitetId }: AktivitetApiParams) {
  const url = (endpoint: string) => buildUrl(behandlingId, aktivitetId, endpoint);

  return {
    hentAttestering: <T>() =>
      serverFetch<T>(request, url("attestering")),

    lagreAttestering: <T>(attestering: T) =>
      serverFetch<void>(request, url("attestering"), {
        method: "POST",
        body: JSON.stringify({ data: attestering }),
      }),

    hentGrunnlagsdata: <T>() =>
      serverFetch<T>(request, url("grunnlagsdata")),

    hentInput: <T>() =>
      serverFetch<T>(request, url("input")),

    hentVurdering: async <T>() => {
      try {
        return await serverFetch<T>(request, url("vurdering"));
      } catch (error: any) {
        console.log(error)
        if (error.data.status === 404) {
          return null;
        }
        throw error;
      }
    },

    lagreVurdering: <T>(vurdering: T) =>
      serverFetch<void>(request, url("vurdering"), {
        method: "POST",
        body: JSON.stringify({ data: vurdering }),
      }),

    innhentGrunnlagsdataPåNytt: () =>
      serverFetch<void>(request, url("innhent-grunnlagsdata"), {
        method: "POST",
      }),
  };
}
