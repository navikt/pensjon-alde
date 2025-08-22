import React from "react";
import { useParams, useLocation, useNavigate, Outlet } from "react-router";
import type { AktivitetDTO } from "../../types/behandling";
import "./vurdere-samboer.css";

interface VurdereSamboerProps {
  aktivitet?: AktivitetDTO;
}

const VurdereSamboer: React.FC<VurdereSamboerProps> = ({ aktivitet }) => {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="sub-sub-component">
      <h3>Vurdere samboer</h3>
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
        <p>Her kan du vurdere samboerforhold for søkeren.</p>
      </div>
      <div className="utfall">
        {aktivitet?.status === "FULLFORT" ? (
          <div className="success-message">✅ Samboervurdering er fullført</div>
        ) : (
          <div className="info-message">📝 Vurdering pågår eller venter</div>
        )}
      </div>
    </div>
  );
};

export default VurdereSamboer;
