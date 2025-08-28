import type { Route } from "./+types/$behandlingsId";
import type { BehandlingDTO } from "../../types/behandling";
import { AktivitetStatus, BehandlingStatus } from "../../types/behandling";
import { Outlet, useParams, useNavigate, redirect } from "react-router";
import { buildAktivitetRedirectUrl } from "../../utils/handler-discovery";
import {
  Stepper,
  Box,
  HStack,
  BodyShort,
  Label,
  Tag,
  VStack,
  CopyButton,
  Loader,
} from "@navikt/ds-react";
import React, { useEffect, useRef } from "react";
import { formatDateToNorwegian } from "../../utils/date";
import { useRevalidator } from "react-router";
import {useFetch} from "~/utils/use-fetch/use-fetch";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Behandling ${params.behandlingsId}` },
    { name: "description", content: "Behandling detaljer" },
  ];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingsId } = params;
  const url = new URL(request.url);

  const penUrl = `${process.env.PEN_URL!}/api/saksbehandling/alde`;

  const response = await useFetch(request, `${penUrl}/behandling/${behandlingsId}`);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch behandling: ${response.status} ${response.statusText}`,
    );
  }

  const behandling: BehandlingDTO = await response.json();

  // If no aktivitet is selected and there are aktiviteter, redirect to first UNDER_BEHANDLING
  if (
    !url.pathname.includes("/aktivitet/") &&
    behandling.aktiviteter.length > 0
  ) {
    const underBehandlingAktivitet = behandling.aktiviteter.find(
      (aktivitet) => aktivitet.status === AktivitetStatus.UNDER_BEHANDLING,
    );

    if (underBehandlingAktivitet) {
      throw redirect(
        `/behandling/${behandlingsId}/aktivitet/${underBehandlingAktivitet.aktivitetId}`,
      );
    }
  }

  return {
    behandlingsId,
    behandling,
  };
}

export default function Behandling({ loaderData }: Route.ComponentProps) {
  const { behandling } = loaderData;
  const params = useParams();
  const currentAktivitetId = params.aktivitetId;
  const navigate = useNavigate();
  const stepperContainerRef = useRef<HTMLDivElement>(null);
  const revalidator = useRevalidator();

  // Prepare the visible aktiviteter (sorted and filtered)
  const visibleAktiviteter = React.useMemo(
    () =>
      behandling.aktiviteter
        .slice()
        .sort((a, b) => a.type.localeCompare(b.type))
        .filter((aktivitet) => aktivitet.friendlyName),
    [behandling.aktiviteter],
  );

  const activeStepIndex = currentAktivitetId
    ? visibleAktiviteter.findIndex(
        (a) => a.aktivitetId?.toString() === currentAktivitetId,
      )
    : 0;

  const behandlingJobber =
    behandling.status === BehandlingStatus.UNDER_BEHANDLING &&
    !behandling.utsattTil;

  useEffect(() => {
    if (behandlingJobber) {
      let pollCount = 0;
      const intervalId = setInterval(() => {
        pollCount++;
        revalidator.revalidate();

        if (pollCount >= 10) {
          clearInterval(intervalId);
        }
      }, 1000); // Refetch every second

      return () => clearInterval(intervalId);
    }
  }, [behandlingJobber, revalidator]);

  useEffect(() => {
    if (stepperContainerRef.current && activeStepIndex >= 0) {
      const container = stepperContainerRef.current;
      const activeStep = container.querySelector(
        `[data-step-index="${activeStepIndex}"]`,
      ) as HTMLElement;

      if (activeStep) {
        const containerRect = container.getBoundingClientRect();
        const stepRect = activeStep.getBoundingClientRect();
        const scrollLeft = container.scrollLeft;

        // Calculate if step is out of view
        const stepLeft = stepRect.left - containerRect.left + scrollLeft;
        const stepRight = stepLeft + stepRect.width;
        const containerWidth = containerRect.width;

        if (stepLeft < scrollLeft) {
          // Step is to the left of visible area
          container.scrollTo({ left: stepLeft - 20, behavior: "smooth" });
        } else if (stepRight > scrollLeft + containerWidth) {
          // Step is to the right of visible area
          container.scrollTo({
            left: stepRight - containerWidth + 20,
            behavior: "smooth",
          });
        }
      }
    }
  }, [activeStepIndex, currentAktivitetId]);

  return (
    <div>
      <Box.New padding="4" background="sunken" borderWidth="1 0">
        <HStack gap="6" align="center">
          <VStack>
            <Label size="small">Behandling</Label>
            <BodyShort>{behandling.friendlyName}</BodyShort>
          </VStack>
          <VStack>
            <Label size="small">Status</Label>
            {behandlingJobber ? (
              <Loader size="small" title="Jobber" variant="interaction" />
            ) : (
              <Tag
                variant={
                  behandling.status === BehandlingStatus.FERDIG
                    ? "success"
                    : behandling.status === BehandlingStatus.FEILET
                      ? "error"
                      : "info"
                }
                size="small"
              >
                {behandling.status}
              </Tag>
            )}
          </VStack>
          <VStack>
            <Label size="small">Opprettet</Label>
            <BodyShort size="small">
              {formatDateToNorwegian(behandling.opprettet)}
            </BodyShort>
          </VStack>
          {behandling.kravId && (
            <VStack>
              <Label size="small">Krav</Label>
              <CopyButton
                text={behandling.kravId.toString()}
                copyText={behandling.kravId.toString()}
                size="small"
              />
            </VStack>
          )}
          {behandling.sakId && (
            <VStack>
              <Label size="small">Sak</Label>
              <CopyButton
                text={behandling.sakId.toString()}
                copyText={behandling.sakId.toString()}
                size="small"
              />
            </VStack>
          )}
        </HStack>
      </Box.New>

      {visibleAktiviteter.length > 0 && (
        <Box.New padding="space-12">
          <div
            ref={stepperContainerRef}
            style={{
              overflowX: "auto",
              overflowY: "hidden",
              scrollbarWidth: "thin",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <Stepper
              orientation="horizontal"
              activeStep={activeStepIndex + 1}
              style={{ minWidth: "max-content" }}
            >
              {visibleAktiviteter.map((aktivitet, index) => (
                <Stepper.Step
                  key={aktivitet.uuid}
                  completed={aktivitet.status === AktivitetStatus.FULLFORT}
                  onClick={() => {
                    const implementationUrl = buildAktivitetRedirectUrl(
                      params.behandlingsId!,
                      aktivitet.aktivitetId!.toString(),
                      loaderData.behandling,
                      aktivitet,
                    );
                    // Navigate to the implementation URL if it exists, otherwise to the base aktivitet URL
                    navigate(
                      implementationUrl || `aktivitet/${aktivitet.aktivitetId}`,
                    );
                  }}
                  style={{ cursor: "pointer" }}
                  data-step-index={index}
                >
                  {aktivitet.friendlyName!}
                </Stepper.Step>
              ))}
            </Stepper>
          </div>
        </Box.New>
      )}
      {behandlingJobber ? <Loader /> : <Outlet context={{ behandling }} />}
    </div>
  );
}
