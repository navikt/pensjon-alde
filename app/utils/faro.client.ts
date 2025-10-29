import { type Faro, getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk'
import { TracingInstrumentation } from '@grafana/faro-web-tracing'

export interface TelemetryConfig {
  telemetryUrl: string
  appName: string
  appVersion: string
  environment: string
}

let faro: Faro | null = null

export function getFaro(): Faro | null {
  return faro
}

export function initInstrumentation(config: TelemetryConfig): void {
  if (typeof window === 'undefined' || faro !== null) return

  if (config.environment === 'local') {
    console.log('[Telemetry] Skipping Faro initialization in local environment')
    return
  }

  try {
    faro = initializeFaro({
      url: config.telemetryUrl,
      app: {
        name: config.appName,
        version: config.appVersion,
        environment: config.environment,
      },

      instrumentations: [
        ...getWebInstrumentations({
          captureConsole: true,
        }),
        new TracingInstrumentation(),
      ],
    })
  } catch (error) {
    console.error('Failed to initialize Faro telemetry:', error)
  }
}
