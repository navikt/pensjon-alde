import { useLoaderData, Form, redirect } from "react-router";
import { Checkbox, Button, DatePicker, useDatepicker } from "@navikt/ds-react";
import { useFetch } from "~/utils/use-fetch";
import { parse, formatISO } from "date-fns";
import type {
  SamboerInformasjonHolder,
  SamboerVurdering,
  Vurdering,
} from "./samboer-types";
import type { Route } from "./+types";
import AktivitetVurderingLayout from "~/components/shared/AktivitetVurderingLayout";
import { useOutletContext } from "react-router";
import type { AktivitetOutletContext } from "~/types/aktivitetOutletContext";
import {requireAccessToken} from "~/auth/auth.server";

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingsId, aktivitetId } = params;
  const accessToken = await requireAccessToken(request)

  const backendUrl = `${process.env.BACKEND_URL!}/api/saksbehandling/alde`;

  const grunnlag = await useFetch(
    accessToken,
    `${backendUrl}/behandling/${behandlingsId}/aktivitet/${aktivitetId}/grunnlagsdata`,
  );

  const vurdering = await useFetch(
    accessToken,
    `${backendUrl}/behandling/${behandlingsId}/aktivitet/${aktivitetId}/vurdering`,
  );
  let parsedGrunnlag;
  if (grunnlag.ok) {
    console.log(grunnlag);
    parsedGrunnlag = (await grunnlag.json()) as {
      samboerInformasjon: SamboerInformasjonHolder;
    };
  }

  let parsedVurdering = null;
  if (vurdering.ok) {
    parsedVurdering = (await vurdering.json()) as SamboerVurdering;
  } else if (vurdering.status === 404) {
    parsedVurdering = null;
  }

  console.log("response", parsedGrunnlag);

  return {
    samboerInformasjon: parsedGrunnlag?.samboerInformasjon,
    vurdering: parsedVurdering,
  };
}

export async function action({
  params,
  request,
}: {
  params: { behandlingsId: string; aktivitetId: string };
  request: Request;
}) {
  const { behandlingsId, aktivitetId } = params;
  const formData = await request.formData();
  const accessToken = await requireAccessToken(request)

  const virkFomString = formData.get("virkFom") as string;
  const virkFomDate = virkFomString
    ? parse(virkFomString, "dd.MM.yyyy", new Date())
    : new Date();

  console.log("virkFomDate", virkFomDate);

  const vurdering: SamboerVurdering = {
    virkFom: formatISO(virkFomDate, { representation: "date" }),
    tidligereEktefeller: formData.get("tidligereEktefeller") === "on",
    harFellesBarn: formData.get("harFellesBarn") === "on",
    vurdert: (formData.get("vurdert") as Vurdering) || "VURDERT",
  };

  console.log("data to post", vurdering);
  // Post to the API
  const backendUrl = `${process.env.BACKEND_URL!}/api/saksbehandling/alde`;

  const response = await useFetch(
    accessToken,
    `${backendUrl}/behandling/${behandlingsId}/aktivitet/${aktivitetId}/vurdering`,

    {
      method: "POST",
      body: JSON.stringify({ data: vurdering }),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to save samboer vurdering: ${response.status}`);
  }

  // Redirect back to the aktivitet to trigger loader revalidation
  return redirect(`/behandling/${behandlingsId}`);
}

export default function VurdereSamboer() {
  const { datepickerProps, inputProps } = useDatepicker({
    defaultSelected: undefined,
  });

  const { samboerInformasjon, vurdering } = useLoaderData<typeof loader>();
  const { aktivitet } = useOutletContext<AktivitetOutletContext>();
  const detailsContent = (
    <>
      <pre>{JSON.stringify(vurdering, null, 2)}</pre>
      <pre>{JSON.stringify(samboerInformasjon, null, 2)}</pre>
    </>
  );

  const sidebar = (
    <Form method="post" className="decision-form">
      <div className="checkbox-group">
        <DatePicker {...datepickerProps}>
          <DatePicker.Input
            {...inputProps}
            label="Virkningstidspunkt fra"
            name="virkFom"
          />
        </DatePicker>

        <Checkbox name="tidligereEktefeller">
          Tidligere ektefelle/r med søker
        </Checkbox>

        <Checkbox name="harFellesBarn">Har felles barn med søker</Checkbox>
      </div>

      <div className="button-group">
        <Button type="submit" name="vurdert" value="VURDERT" variant="primary">
          Vurder
        </Button>
        <Button type="submit" name="vurdert" value="AVBRUTT" variant="danger">
          Avvis
        </Button>
      </div>
    </Form>
  );

  return (
    <AktivitetVurderingLayout
      title="Vurdere samboer"
      aktivitet={aktivitet}
      detailsTitle="Samboerforhold detaljer:"
      detailsContent={detailsContent}
      sidebar={sidebar}
    />
  );
}
