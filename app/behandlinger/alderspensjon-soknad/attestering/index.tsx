import { BodyLong } from "@navikt/ds-react";
import { DogHarnessIcon } from "@navikt/aksel-icons";

export default function Attestering() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        marginTop: "2rem",
      }}
    >
      <DogHarnessIcon
        title="Attestering fullført"
        fontSize="2rem"
        color="var(--ax-text-success)"
        aria-label="Oppgaven er til attestering"
      />
      <BodyLong>Oppgaven er til attestering</BodyLong>
    </div>
  );
}

export const loader = async () => {
  return null;
};

export const action = async () => {
  return null;
};
