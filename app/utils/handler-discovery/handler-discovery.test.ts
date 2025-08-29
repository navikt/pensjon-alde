import { describe, it, expect, vi, beforeEach } from "vitest";
import type { BehandlingDTO, AktivitetDTO } from "../../types/behandling";
import { BehandlingStatus, AktivitetStatus, AldeBehandlingStatus } from "../../types/behandling";
import {
  getAvailableHandlers,
  findRouteForHandlers,
  buildAktivitetRedirectUrl,
  hasUIImplementation,
  getHandlersForBehandling,
  validateRoutePath,
  getHandlerNamesFromPath,
} from "./handler-discovery";

// Mock import.meta.glob to simulate the file structure
vi.mock("import.meta", () => ({
  glob: vi.fn(() => ({
    "/app/behandlinger/alderspensjon-soknad/vurder-samboer/index.tsx": {},
  })),
}));

describe("handler-discovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAvailableHandlers", () => {
    it("should return available handler mappings based on folder structure", () => {
      const handlers = getAvailableHandlers();

      expect(handlers).toHaveLength(1);
      expect(handlers[0]).toEqual({
        behandlingHandler: "alderspensjon-soknad",
        aktivitetHandler: "vurder-samboer",
        routePath: "alderspensjon-soknad/vurder-samboer",
      });
    });
  });

  describe("findRouteForHandlers", () => {
    it("should find route for valid handler combination", () => {
      const route = findRouteForHandlers(
        "alderspensjon-soknad",
        "vurder-samboer",
      );
      expect(route).toBe("alderspensjon-soknad/vurder-samboer");
    });

    it("should return null for non-existent handler combination", () => {
      const route = findRouteForHandlers(
        "unknown-behandling",
        "unknown-aktivitet",
      );
      expect(route).toBeNull();
    });

    it("should return null when behandlingHandler is null", () => {
      const route = findRouteForHandlers(null, "vurder-samboer");
      expect(route).toBeNull();
    });

    it("should return null when aktivitetHandler is null", () => {
      const route = findRouteForHandlers("alderspensjon-soknad", null);
      expect(route).toBeNull();
    });

    it("should return null when both handlers are undefined", () => {
      const route = findRouteForHandlers(undefined, undefined);
      expect(route).toBeNull();
    });
  });

  describe("buildAktivitetRedirectUrl", () => {
    const mockBehandling: BehandlingDTO = {
      behandlingId: 6359437,
      type: "FleksibelApSakBehandling",
      handlerName: "alderspensjon-soknad",
      friendlyName: "Førstegangsbehandling av alderspensjonssøknad",
      sisteKjoring: "2025-08-26T16:49:34.37642",
      utsattTil: "2025-08-27T16:49:34.383125",
      opprettet: "2025-08-26T16:49:29.7398",
      stoppet: null,
      aldeBehandlingStatus: AldeBehandlingStatus.VENTER_SAKSBEHANDLER,
      aktiviteter: [],
      fnr: null,
      sakId: 23077283,
      kravId: 46365419,
    };

    const mockAktivitet: AktivitetDTO = {
      aktivitetId: 6020942,
      type: "FleksibelApSakA203VurderSamboerAktivitet",
      opprettet: "2025-08-26T16:49:34.364857",
      handlerName: "vurder-samboer",
      friendlyName: "Vurder samboer",
      antallGangerKjort: 1,
      sisteAktiveringsdato: "2025-08-26T16:49:34.380546",
      status: AktivitetStatus.UNDER_BEHANDLING,
      utsattTil: "2025-08-27T16:49:34.383125",
    };

    it("should build correct redirect URL for valid handlers", () => {
      const url = buildAktivitetRedirectUrl(
        "6359437",
        "6020942",
        mockBehandling,
        mockAktivitet,
      );

      expect(url).toBe(
        "/behandling/6359437/aktivitet/6020942/alderspensjon-soknad/vurder-samboer",
      );
    });

    it("should return null when aktivitet has no handlerName", () => {
      const aktivitetWithoutHandler = { ...mockAktivitet, handlerName: null };
      const url = buildAktivitetRedirectUrl(
        "6359437",
        "6020942",
        mockBehandling,
        aktivitetWithoutHandler,
      );

      expect(url).toBeNull();
    });

    it("should return null when behandling has no handlerName", () => {
      const behandlingWithoutHandler = { ...mockBehandling, handlerName: null };
      const url = buildAktivitetRedirectUrl(
        "6359437",
        "6020942",
        behandlingWithoutHandler,
        mockAktivitet,
      );

      expect(url).toBeNull();
    });

    it("should return null when no route mapping exists", () => {
      const unknownAktivitet = {
        ...mockAktivitet,
        handlerName: "unknown-handler",
      };
      const url = buildAktivitetRedirectUrl(
        "6359437",
        "6020942",
        mockBehandling,
        unknownAktivitet,
      );

      expect(url).toBeNull();
    });
  });

  describe("hasUIImplementation", () => {
    const mockBehandling: BehandlingDTO = {
      behandlingId: 6359437,
      type: "FleksibelApSakBehandling",
      handlerName: "alderspensjon-soknad",
      friendlyName: "Førstegangsbehandling av alderspensjonssøknad",
      sisteKjoring: "2025-08-26T16:49:34.37642",
      utsattTil: null,
      opprettet: "2025-08-26T16:49:29.7398",
      stoppet: null,
      aldeBehandlingStatus: AldeBehandlingStatus.VENTER_SAKSBEHANDLER,
      aktiviteter: [],
      fnr: null,
      sakId: 23077283,
      kravId: 46365419,
    };

    it("should return true for aktivitet with UI implementation", () => {
      const aktivitet: AktivitetDTO = {
        aktivitetId: 6020942,
        type: "FleksibelApSakA203VurderSamboerAktivitet",
        handlerName: "vurder-samboer",
        friendlyName: "Vurder samboer",
        opprettet: "2025-08-26T16:49:34.364857",
        antallGangerKjort: 1,
        sisteAktiveringsdato: "2025-08-26T16:49:34.380546",
        aldeBehandlingStatus: AldeBehandlingStatus.VENTER_SAKSBEHANDLER,
        utsattTil: null,
      };

      expect(hasUIImplementation(mockBehandling, aktivitet)).toBe(true);
    });

    it("should return false for aktivitet without handlerName", () => {
      const aktivitet: AktivitetDTO = {
        aktivitetId: 6020941,
        type: "FleksibelApSakA202FinnSamboerInformasjonAktivitet",
        handlerName: null,
        friendlyName: null,
        opprettet: "2025-08-26T16:49:34.297346",
        antallGangerKjort: 1,
        sisteAktiveringsdato: "2025-08-26T16:49:34.312694",
        aldeBehandlingStatus: AldeBehandlingStatus.VENTER_SAKSBEHANDLER,
        utsattTil: null,
      };

      expect(hasUIImplementation(mockBehandling, aktivitet)).toBe(false);
    });

    it("should return false when no route mapping exists", () => {
      const aktivitet: AktivitetDTO = {
        aktivitetId: 6020943,
        type: "UnknownAktivitet",
        handlerName: "unknown-handler",
        friendlyName: "Unknown",
        opprettet: "2025-08-26T16:49:34.297346",
        antallGangerKjort: 1,
        sisteAktiveringsdato: "2025-08-26T16:49:34.312694",
        aldeBehandlingStatus: AldeBehandlingStatus.VENTER_SAKSBEHANDLER,
        utsattTil: null,
      };

      expect(hasUIImplementation(mockBehandling, aktivitet)).toBe(false);
    });
  });

  describe("getHandlersForBehandling", () => {
    it("should return handlers for existing behandling", () => {
      const handlers = getHandlersForBehandling("alderspensjon-soknad");

      expect(handlers).toHaveLength(1);
      expect(handlers[0]).toEqual({
        behandlingHandler: "alderspensjon-soknad",
        aktivitetHandler: "vurder-samboer",
        routePath: "alderspensjon-soknad/vurder-samboer",
      });
    });

    it("should return empty array for non-existent behandling", () => {
      const handlers = getHandlersForBehandling("unknown-behandling");
      expect(handlers).toEqual([]);
    });
  });

  describe("validateRoutePath", () => {
    it("should return true for valid URL path matching handlers", () => {
      const isValid = validateRoutePath(
        "/behandling/6359437/aktivitet/6020942/alderspensjon-soknad/vurder-samboer",
        "alderspensjon-soknad",
        "vurder-samboer",
      );

      expect(isValid).toBe(true);
    });

    it("should return false for URL path not matching handlers", () => {
      const isValid = validateRoutePath(
        "/behandling/6359437/aktivitet/6020942/wrong-path/wrong-aktivitet",
        "alderspensjon-soknad",
        "vurder-samboer",
      );

      expect(isValid).toBe(false);
    });

    it("should return false for non-existent handler combination", () => {
      const isValid = validateRoutePath(
        "/behandling/123/aktivitet/456/unknown/unknown",
        "unknown-behandling",
        "unknown-aktivitet",
      );

      expect(isValid).toBe(false);
    });
  });

  describe("getHandlerNamesFromPath", () => {
    it("should extract handler names from valid URL path", () => {
      const names = getHandlerNamesFromPath(
        "/behandling/6359437/aktivitet/6020942/alderspensjon-soknad/vurder-samboer",
      );

      expect(names).toEqual({
        behandlingHandler: "alderspensjon-soknad",
        aktivitetHandler: "vurder-samboer",
      });
    });

    it("should return null for URL with too few path segments", () => {
      const names = getHandlerNamesFromPath("/behandling/123");
      expect(names).toBeNull();
    });

    it("should return null for URL with unknown handler combination", () => {
      const names = getHandlerNamesFromPath(
        "/behandling/123/aktivitet/456/unknown-behandling/unknown-aktivitet",
      );
      expect(names).toBeNull();
    });

    it("should handle URL with query parameters", () => {
      const names = getHandlerNamesFromPath(
        "/behandling/6359437/aktivitet/6020942/alderspensjon-soknad/vurder-samboer?param=value",
      );

      expect(names).toEqual({
        behandlingHandler: "alderspensjon-soknad",
        aktivitetHandler: "vurder-samboer",
      });
    });
  });
});
