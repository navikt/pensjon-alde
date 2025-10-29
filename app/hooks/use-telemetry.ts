import type { Faro } from '@grafana/faro-web-sdk'
import { getFaro } from '~/utils/faro.client'

export interface UseTelemetryReturn {
  faro: Faro | null
  logEvent: (name: string, attributes?: Record<string, string>) => void
  logError: (error: Error, context?: Record<string, string>) => void
  logMeasurement: (type: string, values: Record<string, number>) => void
}

export function useTelemetry(): UseTelemetryReturn {
  if (typeof window === 'undefined') {
    return {
      faro: null,
      logEvent: () => {},
      logError: () => {},
      logMeasurement: () => {},
    }
  }

  const faro = getFaro()

  const logEvent = (name: string, attributes?: Record<string, string>) => {
    faro?.api.pushEvent(name, attributes)
  }

  const logError = (error: Error, context?: Record<string, string>) => {
    faro?.api.pushError(error, { context })
  }

  const logMeasurement = (type: string, values: Record<string, number>) => {
    faro?.api.pushMeasurement({
      type,
      values,
    })
  }

  return {
    faro,
    logEvent,
    logError,
    logMeasurement,
  }
}
