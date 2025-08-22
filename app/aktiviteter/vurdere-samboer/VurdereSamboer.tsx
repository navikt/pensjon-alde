import React, { useState } from "react";
import { useParams, useLocation, useNavigate, Outlet } from "react-router";
import { Checkbox } from "@navikt/ds-react";
import type { AktivitetDTO } from "../../types/behandling";
import AktivitetVurderingLayout from "../../components/shared/AktivitetVurderingLayout";
import DecisionForm from "../../components/shared/DecisionForm";

interface VurdereSamboerProps {
  aktivitet?: AktivitetDTO;
}

const VurdereSamboer: React.FC<VurdereSamboerProps> = ({ aktivitet }) => {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [harSamboer, setHarSamboer] = useState(false);
  const [samboerForholdGodkjent, setSamboerForholdGodkjent] = useState(false);
  const [dokumentasjonMottatt, setDokumentasjonMottatt] = useState(false);

  const handleSubmit = () => {
    // Handle decision submission
    console.log({
      harSamboer,
      samboerForholdGodkjent,
      dokumentasjonMottatt,
    });
  };

  const handleContinue = () => {
    // Handle continue action
    navigate("../");
  };

  const detailsContent = (
    <>
      <p>Her kan du vurdere samboerforhold for søkeren.</p>
      <p>Informasjon om samboer vil bli lagt til her...</p>
    </>
  );

  const sidebar = (
    <DecisionForm
      title="Vurdering av samboer"
      onSubmit={handleSubmit}
      onContinue={handleContinue}
    >
      <div className="checkbox-group">
        <Checkbox
          checked={harSamboer}
          onChange={(e) => setHarSamboer(e.target.checked)}
        >
          Har samboer
        </Checkbox>

        <Checkbox
          checked={samboerForholdGodkjent}
          onChange={(e) => setSamboerForholdGodkjent(e.target.checked)}
        >
          Samboerforhold godkjent
        </Checkbox>

        <Checkbox
          checked={dokumentasjonMottatt}
          onChange={(e) => setDokumentasjonMottatt(e.target.checked)}
        >
          Dokumentasjon mottatt
        </Checkbox>
      </div>
    </DecisionForm>
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
};

export default VurdereSamboer;
