/**
 * Handler Discovery Module
 *
 * Exports utilities for discovering and mapping handler implementations
 * in the behandlinger folder structure using folder names as handler names.
 */

export type { RouteMapping } from './handler-discovery'
export {
  buildAktivitetRedirectUrl,
  findRouteForHandlers,
  getAvailableHandlers,
  getHandlerNamesFromPath,
  getHandlersForBehandling,
  hasUIImplementation,
  validateRoutePath,
} from './handler-discovery'
