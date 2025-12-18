import { Unleash } from 'unleash-client'
import { env } from './env.server.ts'

console.log('Initializing Unleash...')

const unleash = new Unleash({
  url: `${env.unleashUrl}/api`,
  appName: 'alde',
  environment: env.unleashEnvironment || 'development',
  customHeaders: env.unleashApiToken ? { Authorization: `Bearer ${env.unleashApiToken}` } : undefined,
  refreshInterval: 15000,
})

unleash.on('error', (err: Error) => {
  console.error('Unleash error:', err)
})

unleash.on('ready', () => {
  console.log('Unleash is ready')
})

export async function startUnleash(): Promise<void> {
  await unleash.start()
}

startUnleash().catch((err: Error) => {
  console.error('Failed to start Unleash:', err)
})

export function isFeatureEnabled(flagName: string): boolean {
  try {
    return unleash.isEnabled(flagName)
  } catch (error) {
    console.error(`Error checking feature flag ${flagName}:`, error)
    return false
  }
}
