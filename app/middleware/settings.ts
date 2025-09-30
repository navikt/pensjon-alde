import { type SettingsContext, settingsContext } from '../context/settings-context'

const COOKIE_NAME = 'alde-settings'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export async function settingsMiddleware({ request, context }: { request: Request; context: any }) {
  const cookieHeader = request.headers.get('cookie')
  let settings: SettingsContext = {
    showStepper: false,
    showMetadata: false,
  }

  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim())
    const settingsCookie = cookies.find(c => c.startsWith(`${COOKIE_NAME}=`))

    if (settingsCookie) {
      const value = settingsCookie.substring(`${COOKIE_NAME}=`.length)
      try {
        const decoded = decodeURIComponent(value)
        settings = JSON.parse(decoded)
      } catch {
        // Keep defaults if parsing fails
      }
    }
  }

  context.set(settingsContext, settings)
}

export function serializeSettings(settings: SettingsContext): string {
  const value = encodeURIComponent(JSON.stringify(settings))
  return `${COOKIE_NAME}=${value}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`
}
