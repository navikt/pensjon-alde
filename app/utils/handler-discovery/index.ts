/**
 * Handler Discovery Module
 *
 * Exports utilities for discovering and mapping handler implementations
 * in the behandlinger folder structure using folder names as handler names.
 */

export {
  getAvailableHandlers,
  findRouteForHandlers,
  buildAktivitetRedirectUrl,
  hasUIImplementation,
  getHandlersForBehandling,
  validateRoutePath,
  getHandlerNamesFromPath,
} from "./handler-discovery";

export type { RouteMapping } from "./handler-discovery";
