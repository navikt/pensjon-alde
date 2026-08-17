export const env = new Proxy(
  {},
  {
    get: () => 'https://pdf-runtime.invalid',
  },
) as Record<string, string>

export const isLocalEnv = false
export const isMockEnv = true
export const isVerdandeLinksEnabled = false

export function loadEnv() {
  return env
}
