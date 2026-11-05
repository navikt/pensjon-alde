import { LANDKODER } from './landkoder'

/**
 * Slår opp landnavn for en LandKode fra pen (3-bokstavs enum-navn, f.eks. `SWE` eller `ATF_V1`).
 * Returnerer koden selv hvis den ikke finnes, og `null` hvis koden mangler.
 */
export function landnavn(landkode: string | null | undefined): string | null {
  if (!landkode) return null
  return LANDKODER[landkode] ?? landkode
}
