export function loadEnv<R extends Record<string, string>, O extends Record<string, string>>(
  required: R,
  optional?: O,
): { [K in keyof R]: string } & { [K in keyof O]: string | undefined } {
  const req = Object.fromEntries(
    Object.entries(required).map(([key, envName]) => {
      const v = process.env[envName]
      if (!v) {
        console.error(`Mangler nødvendig miljøvariabel ${envName}`)
        process.exit(1)
      }
      return [key, v]
    }),
  ) as { [K in keyof R]: string }

  const opt = Object.fromEntries(
    Object.entries(optional ?? {}).map(([key, envName]) => {
      return [key, process.env[envName]]
    }),
  ) as { [K in keyof O]: string | undefined }

  return { ...req, ...opt }
}

export const env = loadEnv({
  clientId: 'AZURE_APP_CLIENT_ID',
  clientSecret: 'AZURE_APP_CLIENT_SECRET',
  issuer: 'AZURE_OPENID_CONFIG_ISSUER',
  tokenEndpoint: 'AZURE_OPENID_CONFIG_TOKEN_ENDPOINT',

  penScope: 'PEN_SCOPE',
  penUrl: 'PEN_URL',

  psakSakUrlTemplate: 'PSAK_SAK_URL_TEMPLATE',
  psakOppgaveoversikt: 'PSAK_OPPGAVEOVERSIKT',

  verdandeBehandlingUrl: 'VERDANDE_BEHANDLING_URL',
  verdandeAktivitetUrl: 'VERDANDE_AKTIVITET_URL',
})

export const isLocalEnv = process.env.IS_LOCAL_ENV === 'true'
export const isVerdandeLinksEnabled = process.env.VERDANDE_LINKS_ENABLED === 'true'
