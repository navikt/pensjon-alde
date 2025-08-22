import React from "react";
import { useParams, useLocation, useNavigate, Outlet } from "react-router";
import "./vurdere-samboer.css";

export const VurdereSamboer: React.FC = () => {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="sub-sub-component">
      <h3>Vurdere samboer</h3>
      <div className="content"></div>
      <div className="utfall"></div>
    </div>
  );
};
