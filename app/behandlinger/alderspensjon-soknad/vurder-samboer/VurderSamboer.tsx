import { useLoaderData, Form } from "react-router";
import { Checkbox, Button, DatePicker, useDatepicker } from "@navikt/ds-react";
import { useFetch } from "~/utils/use-fetch";
import type { SamboerInformasjonHolder } from "./samboer-types";
import type { Route } from "./+types";
import type { AktivitetDTO } from "~/types/behandling";
import AktivitetVurderingLayout from "~/components/shared/AktivitetVurderingLayout";

interface VurdereSamboerProps {
  aktivitet?: AktivitetDTO;
  samboerdata?: SamboerInformasjonHolder;
}

export async function loader({ params }: Route.LoaderArgs) {
  const { behandlingsId } = params;

  const samboerResponse = await useFetch(
    `${process.env.BACKEND_URL!}/api/saksbehandling/alder/forstegangsbehandling/${behandlingsId}/sakinfo`,
  );

  let samboerdata: SamboerInformasjonHolder | null = null;
  if (samboerResponse.ok) {
    console.log(samboerResponse);
    samboerdata = await samboerResponse.json();
  }

  return {
    samboerdata,
  };
}

export async function action({
  params,
  request,
}: {
  params: { behandlingsId: string };
  request: Request;
}) {
  const { behandlingsId } = params;
  const formData = await request.formData();

  const virkFomDate = formData.get("virkFom");

  const vurdering = {
    samboerVurdering: {
      virkFom: virkFomDate ? virkFomDate.toString() : null,
      tidligereEktefeller: formData.get("tidligereEktefeller") === "on",
      harFellesBarn: formData.get("harFellesBarn") === "on",
      vurdert: formData.get("vurdert") || "VENTER",
    },
  };

  console.log("data to post", vurdering);
  // Post to the API
  const response = await useFetch(
    `${process.env.BACKEND_URL!}/api/saksbehandling/alder/forstegangsbehandling/${behandlingsId}/samboervurdering`,
    {
      method: "POST",
      body: JSON.stringify(vurdering),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to save samboer vurdering: ${response.status}`);
  }

  const vurdertValue = formData.get("vurdert");

  return {
    success: true,
    vurdert: vurdertValue,
    message:
      vurdertValue === "AVBRUTT"
        ? "Samboerforhold avvist"
        : "Samboervurdering lagret",
  };
}

export default function VurdereSamboer({ loaderData }: Route.ComponentProps) {
  const { datepickerProps, inputProps } = useDatepicker({
    defaultSelected: undefined,
  });

  const { aktivitet } = useLoaderData();

  const detailsContent = (
    <>
      <p>Her kan du vurdere samboerforhold for søkeren.</p>
      <p>Informasjon om samboer vil bli lagt til her...</p>
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
