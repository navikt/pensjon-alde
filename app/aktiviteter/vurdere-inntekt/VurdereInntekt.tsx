import React from "react";
import { useParams, useLocation, useNavigate } from "react-router";
import type { AktivitetDTO } from "../../types/behandling";

interface VurdereInntektProps {
  aktivitet?: AktivitetDTO;
}

export const VurdereInntekt: React.FC<VurdereInntektProps> = ({
  aktivitet,
}) => {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="sub-sub-component">
      <h3>Vurdere inntekt</h3>
      <div className="content">
        {aktivitet && (
          <div className="aktivitet-info">
            <h4>Aktivitet informasjon:</h4>
            <p>
              <strong>Status:</strong> {aktivitet.status}
            </p>
            <p>
              <strong>Type:</strong> {aktivitet.type}
            </p>
            <p>
              <strong>Funksjonell ID:</strong>{" "}
              {aktivitet.funksjonellIdentifikator}
            </p>
            <p>
              <strong>Siste aktivering:</strong>{" "}
              {new Date(aktivitet.sisteAktiveringsdato).toLocaleString("no-NO")}
            </p>
          </div>
        )}
        <p>Her kan du vurdere inntekt for søkeren.</p>
        <div className="inntekt-form">
          <label>
            Månedlig inntekt:
            <input type="number" placeholder="Skriv inn beløp" />
          </label>
          <label>
            Inntektstype:
            <select>
              <option value="">Velg type</option>
              <option value="lønn">Lønn</option>
              <option value="pensjon">Pensjon</option>
              <option value="trygd">Trygd</option>
              <option value="annet">Annet</option>
            </select>
          </label>
        </div>
      </div>
      <div className="utfall">
        {aktivitet?.status === "FULLFORT" ? (
          <div className="success-message">
            ✅ Inntektsvurdering er fullført
          </div>
        ) : (
          <div className="info-message">
            📝 Inntektsvurdering pågår eller venter
          </div>
        )}
      </div>
    </div>
  );
};
