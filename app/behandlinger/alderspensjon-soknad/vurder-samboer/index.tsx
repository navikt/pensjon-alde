import { Button, Checkbox, DatePicker, useDatepicker } from "@navikt/ds-react";
import { Form, redirect, useLoaderData, useOutletContext } from "react-router";
import AktivitetVurderingLayout from "~/components/shared/AktivitetVurderingLayout";
import type { AktivitetOutletContext } from "~/types/aktivitetOutletContext";
import { createAktivitetApi } from "~/utils/aktivitet-api";
import { checkbox, dateInput, parseForm } from "~/utils/parse-form";
import type { Route } from "./+types";
import type {
  SamboerInformasjonHolder,
  SamboerVurdering,
} from "./samboer-types";



export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params;

  const api = createAktivitetApi({
    request,
    behandlingId,
    aktivitetId,
  });

  const grunnlag = await api.hentGrunnlagsdata<{
    samboerInformasjon: SamboerInformasjonHolder;
  }>();

  const vurdering = await api.hentVurdering<SamboerVurdering>();

  return {
    samboerInformasjon: grunnlag?.samboerInformasjon,
    vurdering,
  };
}

export async function action({ params, request }: Route.ActionArgs) {
  const { behandlingId, aktivitetId } = params;
  const api = createAktivitetApi({
    request,
    behandlingId,
    aktivitetId,
  });
  const formData = await request.formData();

  const vurdering = parseForm<SamboerVurdering>(formData, {
    virkFom: dateInput,
    tidligereEktefeller: checkbox,
    harFellesBarn: checkbox,
  })

  try {
    await api.lagreVurdering<SamboerVurdering>(vurdering)
    return redirect(`/behandling/${behandlingId}`);
  } catch (error) {
    console.error(error);
  }
}

export default function VurdereSamboer() {
  const { datepickerProps, inputProps } = useDatepicker({
    defaultSelected: undefined,
    required: true
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
