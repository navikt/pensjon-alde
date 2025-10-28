const TRACEPARENT_RE = /^[ \t]*([0-9a-fA-F]{2})-([0-9a-fA-F]{32})-([0-9a-fA-F]{16})-([0-9a-fA-F]{2})[ \t]*$/

export type TraceparentParts = {
  version: string // "00"
  traceId: string // 32 hex (lowercase)
  spanId: string // 16 hex (lowercase)
  flags: string // 2 hex (lowercase), e.g. "01" (sampled)
}

export function parseTraceparent(header: string | null | undefined): TraceparentParts | null {
  if (!header) return null
  const m = TRACEPARENT_RE.exec(header)
  if (!m) return null

  const [, versionRaw, traceIdRaw, spanIdRaw, flagsRaw] = m
  const version = versionRaw.toLowerCase()
  const traceId = traceIdRaw.toLowerCase()
  const spanId = spanIdRaw.toLowerCase()
  const flags = flagsRaw.toLowerCase()

  // ignorerer svare som er ugyldig etter w3c spesifikasjon. Disse kan forekomme ved lokal testing når OpenTelemetry
  // ikke er satt opp
  const allZeros = (s: string) => /^0+$/.test(s)
  if (version === 'ff') return null
  if (allZeros(traceId) || allZeros(spanId)) return null

  return { version, traceId, spanId, flags }
}
