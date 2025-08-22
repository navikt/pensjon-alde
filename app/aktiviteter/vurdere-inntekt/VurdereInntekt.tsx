import React, { useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router";
import { TextField, Select } from "@navikt/ds-react";
import type { AktivitetDTO } from "../../types/behandling";
import AktivitetVurderingLayout from "../../components/shared/AktivitetVurderingLayout";
import DecisionForm from "../../components/shared/DecisionForm";

interface VurdereInntektProps {
  aktivitet?: AktivitetDTO;
}

const VurdereInntekt: React.FC<VurdereInntektProps> = ({ aktivitet }) => {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [månedligInntekt, setMånedligInntekt] = useState("");
  const [inntektstype, setInntektstype] = useState("");

  const handleSubmit = () => {
    // Handle decision submission
    console.log({
      månedligInntekt,
      inntektstype,
    });
  };

  const handleContinue = () => {
    // Handle continue action
    navigate("../");
  };

  const detailsContent = (
    <>
      <p>Her kan du vurdere inntekt for søkeren.</p>
      <p>Inntektsinformasjon og dokumentasjon vil bli lagt til her...</p>
    </>
  );

  const sidebar = (
    <DecisionForm
      title="Vurdering av inntekt"
      onSubmit={handleSubmit}
      onContinue={handleContinue}
    >
      <div className="input-group">
        <TextField
          label="Månedlig inntekt (NOK)"
          type="number"
          value={månedligInntekt}
          onChange={(e) => setMånedligInntekt(e.target.value)}
          placeholder="Skriv inn beløp"
        />

        <Select
          label="Inntektstype"
          value={inntektstype}
          onChange={(e) => setInntektstype(e.target.value)}
        >
          <option value="">Velg type</option>
          <option value="lønn">Lønn</option>
          <option value="pensjon">Pensjon</option>
          <option value="trygd">Trygd</option>
          <option value="annet">Annet</option>
        </Select>
      </div>
    </DecisionForm>
  );

  return (
    <AktivitetVurderingLayout
      title="Vurdere inntekt"
      aktivitet={aktivitet}
      detailsTitle="Inntektsvurdering detaljer:"
      detailsContent={detailsContent}
      sidebar={sidebar}
    />
  );
};

export default VurdereInntekt;
