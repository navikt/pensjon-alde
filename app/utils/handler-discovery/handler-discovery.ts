/**
 * Dynamic Handler Discovery System
 *
 * This system dynamically discovers and maps handler implementations based on:
 * 1. The folder structure under app/behandlinger/{behandling-folder}/{aktivitet-folder}
 * 2. Handler names from the API (behandling.handlerName + aktivitet.handlerName)
 * 3. Folder names ARE the handler names - no configuration needed
 */

import type { AktivitetDTO, BehandlingDTO } from '../../types/behandling'

/**
 * Discovered route mapping
 */
export interface RouteMapping {
  behandlingHandler: string
  aktivitetHandler: string
  routePath: string // Full path like "alderspensjon-soknad/vurdere-samboer"
}

/**
 * Cache for available handlers to avoid re-computing on every call
 */
let cachedHandlers: RouteMapping[] | null = null

/**
 * Get all available handler implementations by scanning the folder structure
 * The folder names ARE the handler names - no configuration needed
 * Results are cached after first call for performance
 */
export function getAvailableHandlers(): RouteMapping[] {
  // Return cached result if available
  if (cachedHandlers !== null) {
    return cachedHandlers
  }

  const mappings: RouteMapping[] = []

  // Use import.meta.glob to discover all aktivitet implementations
  // This pattern finds all index.tsx files in the behandlinger structure
  const modules = import.meta.glob('/app/behandlinger/*/*/index.tsx', {
    eager: true
  })

  for (const [path] of Object.entries(modules)) {
    // Extract the folder names from the path
    // Path format: /app/behandlinger/{behandling-folder}/{aktivitet-folder}/index.tsx
    const pathParts = path.split('/')
    const behandlingFolder = pathParts[3]
    const aktivitetFolder = pathParts[4]

    // The folder names ARE the handler names
    mappings.push({
      behandlingHandler: behandlingFolder,
      aktivitetHandler: aktivitetFolder,
      routePath: `${behandlingFolder}/${aktivitetFolder}`
    })
  }

  // Cache the result for future calls
  cachedHandlers = mappings
  return mappings
}

/**
 * Find the route path for a specific behandling + aktivitet handler combination
 * Returns null if no implementation exists
 */
export function findRouteForHandlers(
  behandlingHandler: string | null | undefined,
  aktivitetHandler: string | null | undefined
): string | null {
  if (!behandlingHandler || !aktivitetHandler) {
    return null
  }

  const handlers = getAvailableHandlers()
  const mapping = handlers.find(
    h =>
      h.behandlingHandler === behandlingHandler &&
      h.aktivitetHandler === aktivitetHandler
  )

  return mapping?.routePath || null
}

/**
 * Build the full redirect URL for an aktivitet
 * Uses the behandlingId and aktivitetId from params, and handler names to find the implementation
 */
export function buildAktivitetRedirectUrl(
  behandlingsId: string,
  aktivitetId: string,
  behandling: BehandlingDTO,
  aktivitet: AktivitetDTO
): string | null {
  // Check if aktivitet has a handler (some aktiviteter are backend-only)
  if (!aktivitet.handlerName || !behandling.handlerName) {
    return null
  }

  const routePath = findRouteForHandlers(
    behandling.handlerName,
    aktivitet.handlerName
  )

  if (!routePath) {
    return null
  }

  // Build the full URL with IDs and the discovered path
  return `/behandling/${behandlingsId}/aktivitet/${aktivitetId}/${routePath}`
}

/**
 * Check if an aktivitet has a UI implementation
 * Some aktiviteter are backend-only and don't have handlers
 */
export function hasUIImplementation(
  behandling: BehandlingDTO,
  aktivitet: AktivitetDTO
): boolean {
  if (!aktivitet.handlerName || !behandling.handlerName) {
    return false
  }

  const routePath = findRouteForHandlers(
    behandling.handlerName,
    aktivitet.handlerName
  )

  return routePath !== null
}

/**
 * Get all available handlers for a specific behandling
 * Useful for showing what aktiviteter are available
 */
export function getHandlersForBehandling(
  behandlingHandler: string
): RouteMapping[] {
  const allHandlers = getAvailableHandlers()
  return allHandlers.filter(h => h.behandlingHandler === behandlingHandler)
}

/**
 * Validate that a route path matches the expected handler combination
 * Useful for ensuring the URL matches the actual implementation
 */
export function validateRoutePath(
  urlPath: string,
  behandlingHandler: string,
  aktivitetHandler: string
): boolean {
  const handlers = getAvailableHandlers()
  const mapping = handlers.find(
    h =>
      h.behandlingHandler === behandlingHandler &&
      h.aktivitetHandler === aktivitetHandler
  )

  if (!mapping) {
    return false
  }

  // Check if the URL ends with the expected route path
  return urlPath.endsWith(mapping.routePath)
}

/**
 * Get handler names from a URL path
 * Extracts the behandling and aktivitet folder names which ARE the handler names
 */
export function getHandlerNamesFromPath(
  urlPath: string
): { behandlingHandler: string; aktivitetHandler: string } | null {
  // Remove query parameters if present
  const pathWithoutQuery = urlPath.split('?')[0]

  // Extract folder names from URL
  // Expected format: /behandling/{id}/aktivitet/{id}/{behandling-folder}/{aktivitet-folder}
  const pathParts = pathWithoutQuery.split('/').filter(p => p) // Remove empty strings

  if (pathParts.length < 6) {
    return null
  }

  // The last two parts are the handler names (which are the folder names)
  const behandlingHandler = pathParts[pathParts.length - 2]
  const aktivitetHandler = pathParts[pathParts.length - 1]

  // Verify this combination actually exists
  const handlers = getAvailableHandlers()
  const exists = handlers.some(
    h =>
      h.behandlingHandler === behandlingHandler &&
      h.aktivitetHandler === aktivitetHandler
  )

  if (!exists) {
    return null
  }

  return {
    behandlingHandler,
    aktivitetHandler
  }
}
